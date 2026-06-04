// ============================================
// NOTIFICATIONS MODULE — CONTROLLER
// ============================================

const notificationService = require('./notification.service');
const { AppError } = require('../../middleware/errorHandler');
const { success, paginated } = require('../../utils/apiResponse');

/**
 * GET /api/notifications
 * Fetch all notifications for the user with pagination and unread count.
 */
const getMyNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.getUserNotifications(req.user.id, req.query);

    return paginated(
      res,
      { notifications: result.data, unread_count: result.unread_count },
      result.pagination,
      'Notifications fetched successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/unread-count
 * Get the count of unread notifications.
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const unread_count = await notificationService.getUnreadCount(req.user.id);

    return success(res, { unread_count }, 'Unread count fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/mark-read
 * Mark specific notifications as read.
 * Body: { notification_ids: ['uuid1', 'uuid2'] }
 */
const markAsRead = async (req, res, next) => {
  try {
    const { notification_ids } = req.body;
    
    // We already validate via schema that it's a non-empty array of UUIDs
    const count = await notificationService.markAsRead(req.user.id, notification_ids);

    return success(
      res,
      { count },
      `${count} notification${count !== 1 ? 's' : ''} marked as read`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all user's notifications as read.
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const count = await notificationService.markAllAsRead(req.user.id);

    return success(res, { count }, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a single notification.
 */
const deleteNotification = async (req, res, next) => {
  try {
    const deleted = await notificationService.deleteNotification(req.user.id, req.params.id);

    if (!deleted) {
      throw new AppError('Notification not found or not authorized', 404);
    }

    return success(res, null, 'Notification deleted');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/notifications/read
 * Delete all read notifications for the user.
 */
const deleteAllRead = async (req, res, next) => {
  try {
    const count = await notificationService.deleteAllRead(req.user.id);

    return success(
      res,
      { count },
      `${count} read notification${count !== 1 ? 's' : ''} deleted`
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
};
