// ============================================
// NOTIFICATIONS MODULE — SERVICE (BUSINESS LOGIC)
// ============================================

const { query } = require('../../config/db');
const { getPagination, formatPaginatedResponse } = require('../../utils/pagination');
const { logger } = require('../../utils/logger');
const { sendToUser } = require('../../socket/socketManager');
const EVENTS = require('../../socket/events');

/**
 * Create a single notification for a user.
 * 
 * @param {string} userId - User UUID
 * @param {string} title - Notification title
 * @param {string} message - Notification content
 * @param {string} type - Notification type enum
 * @returns {Object} Created notification
 */
const createNotification = async (userId, title, message, type) => {
  try {
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, title, message, type]
    );

    const notification = result.rows[0];

    // Emit socket events
    sendToUser(userId, EVENTS.NEW_NOTIFICATION, notification);
    const count = await getUnreadCount(userId);
    sendToUser(userId, EVENTS.UNREAD_COUNT_UPDATE, { count });

    return notification;
  } catch (error) {
    logger.error('Failed to create notification: ' + error.message);
    // Silent fail so main API flow doesn't break
    return null;
  }
};

/**
 * Create notifications for multiple users at once (e.g., broadcasting to nearby mechanics).
 * Uses a single SQL INSERT query with multiple values.
 * 
 * @param {Array<string>} userIds - Array of User UUIDs
 * @param {string} title - Notification title
 * @param {string} message - Notification content
 * @param {string} type - Notification type enum
 * @returns {Array} Created notifications
 */
const createBulkNotifications = async (userIds, title, message, type) => {
  if (!userIds || userIds.length === 0) return [];

  try {
    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    userIds.forEach((userId) => {
      placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
      values.push(userId, title, message, type);
    });

    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ${placeholders.join(', ')}
       RETURNING *`,
      values
    );

    return result.rows;
  } catch (error) {
    logger.error('Failed to create bulk notifications: ' + error.message);
    // Silent fail
    return [];
  }
};

/**
 * Fetch all notifications for a user, paginated.
 * 
 * @param {string} userId - User UUID
 * @param {Object} filters - { page, limit }
 * @returns {Object} Paginated notifications and unread count
 */
const getUserNotifications = async (userId, filters) => {
  const { page, limit, offset } = getPagination(filters);

  // Get total count
  const countResult = await query(
    'SELECT COUNT(*)::integer AS total FROM notifications WHERE user_id = $1',
    [userId]
  );
  const total = countResult.rows[0].total;

  // Get unread count
  const unreadCountResult = await query(
    'SELECT COUNT(*)::integer AS unread_count FROM notifications WHERE user_id = $1 AND is_read = false',
    [userId]
  );
  const unreadCount = unreadCountResult.rows[0].unread_count;

  // Get paginated results
  const notificationsResult = await query(
    `SELECT * FROM notifications 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const paginatedResponse = formatPaginatedResponse(notificationsResult.rows, total, page, limit);

  return {
    ...paginatedResponse,
    unread_count: unreadCount,
  };
};

/**
 * Mark specific notifications as read for a user.
 * 
 * @param {string} userId - User UUID
 * @param {Array<string>} notificationIds - Array of notification UUIDs
 * @returns {number} Number of notifications updated
 */
const markAsRead = async (userId, notificationIds) => {
  if (!notificationIds || notificationIds.length === 0) return 0;

  // We add 'user_id = $1' to ensure users can only mark their OWN notifications
  const placeholders = notificationIds.map((_, i) => `$${i + 2}`).join(', ');
  
  const result = await query(
    `UPDATE notifications 
     SET is_read = true 
     WHERE user_id = $1 AND id IN (${placeholders}) AND is_read = false
     RETURNING id`,
    [userId, ...notificationIds]
  );

  return result.rowCount;
};

/**
 * Mark all notifications as read for a user.
 * 
 * @param {string} userId - User UUID
 * @returns {number} Number of notifications updated
 */
const markAllAsRead = async (userId) => {
  const result = await query(
    `UPDATE notifications 
     SET is_read = true 
     WHERE user_id = $1 AND is_read = false
     RETURNING id`,
    [userId]
  );

  return result.rowCount;
};

/**
 * Get count of unread notifications for a user.
 * 
 * @param {string} userId - User UUID
 * @returns {number} Unread count
 */
const getUnreadCount = async (userId) => {
  const result = await query(
    'SELECT COUNT(*)::integer AS unread_count FROM notifications WHERE user_id = $1 AND is_read = false',
    [userId]
  );
  return result.rows[0].unread_count;
};

/**
 * Get recent unread notifications for a user.
 * 
 * @param {string} userId - User UUID
 * @param {number} limit - Max number of notifications to return
 * @returns {Array} Array of notifications
 */
const getRecentUnread = async (userId, limit = 5) => {
  const result = await query(
    `SELECT * FROM notifications 
     WHERE user_id = $1 AND is_read = false 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
};

/**
 * Delete a single notification.
 * 
 * @param {string} userId - User UUID (for ownership check)
 * @param {string} notificationId - Notification UUID
 * @returns {boolean} True if deleted, false if not found
 */
const deleteNotification = async (userId, notificationId) => {
  const result = await query(
    'DELETE FROM notifications WHERE user_id = $1 AND id = $2 RETURNING id',
    [userId, notificationId]
  );
  return result.rowCount > 0;
};

/**
 * Delete all read notifications for a user.
 * 
 * @param {string} userId - User UUID
 * @returns {number} Number of notifications deleted
 */
const deleteAllRead = async (userId) => {
  const result = await query(
    'DELETE FROM notifications WHERE user_id = $1 AND is_read = true RETURNING id',
    [userId]
  );
  return result.rowCount;
};

/**
 * Get notifications since a specific time
 * 
 * @param {string} userId - User UUID
 * @param {string} since - ISO date string
 * @returns {Array} Array of notifications
 */
const getNotificationsSince = async (userId, since) => {
  const result = await query(
    `SELECT * FROM notifications 
     WHERE user_id = $1 
     AND created_at > $2 
     ORDER BY created_at ASC`,
    [userId, since]
  );
  return result.rows;
};

module.exports = {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  getRecentUnread,
  getNotificationsSince,
  deleteNotification,
  deleteAllRead,
};
