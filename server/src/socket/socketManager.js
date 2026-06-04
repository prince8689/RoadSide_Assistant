// ============================================
// SOCKET EVENT MANAGER
// ============================================
// Helper functions to emit socket events from anywhere in the app.

const { getIO } = require('./socket');
const { logger } = require('../utils/logger');

const pendingNotifications = new Map();

/**
 * Emit event to a specific user's room.
 *
 * @param {string} userId - User UUID
 * @param {string} event - Socket event name
 * @param {any} data - Payload
 */
const sendToUser = (userId, event, data) => {
  try {
    getIO().to(`user:${userId}`).emit(event, data);
  } catch (error) {
    logger.error(`Socket Error (sendToUser): ${error.message}`);
  }
};

/**
 * Emit event to a specific mechanic's room.
 *
 * @param {string} mechanicId - Mechanic UUID
 * @param {string} event - Socket event name
 * @param {any} data - Payload
 */
const sendToMechanic = (mechanicId, event, data) => {
  try {
    getIO().to(`mechanic:${mechanicId}`).emit(event, data);
  } catch (error) {
    logger.error(`Socket Error (sendToMechanic): ${error.message}`);
  }
};

/**
 * Emit event to all clients in a specific request room.
 *
 * @param {string} requestId - Request UUID
 * @param {string} event - Socket event name
 * @param {any} data - Payload
 */
const sendToRequest = (requestId, event, data) => {
  try {
    getIO().to(`request:${requestId}`).emit(event, data);
  } catch (error) {
    logger.error(`Socket Error (sendToRequest): ${error.message}`);
  }
};

/**
 * Emit event to the admin dashboard room.
 *
 * @param {string} event - Socket event name
 * @param {any} data - Payload
 */
const sendToAdmin = (event, data) => {
  try {
    getIO().to('admin:dashboard').emit(event, data);
  } catch (error) {
    logger.error(`Socket Error (sendToAdmin): ${error.message}`);
  }
};

/**
 * Broadcast event to all connected clients.
 *
 * @param {string} event - Socket event name
 * @param {any} data - Payload
 */
const sendToAll = (event, data) => {
  try {
    getIO().emit(event, data);
  } catch (error) {
    logger.error(`Socket Error (sendToAll): ${error.message}`);
  }
};

/**
 * Get the total number of connected clients.
 *
 * @returns {number} Count of connected sockets
 */
const getConnectedUsers = () => {
  try {
    return getIO().engine.clientsCount;
  } catch (error) {
    return 0;
  }
};

/**
 * Check if a specific user (or mechanic) is currently online.
 * Checks if their designated room has any connected sockets.
 *
 * @param {string} userId - User or Mechanic UUID
 * @returns {Promise<boolean>} true if online
 */
const isUserOnline = async (userId) => {
  try {
    const io = getIO();
    // Check both user and mechanic rooms
    const userSockets = await io.in(`user:${userId}`).fetchSockets();
    const mechanicSockets = await io.in(`mechanic:${userId}`).fetchSockets();
    
    return userSockets.length > 0 || mechanicSockets.length > 0;
  } catch (error) {
    return false;
  }
};

/**
 * Batch notifications before sending to reduce socket flood
 * 
 * @param {string} userId - User UUID
 * @param {any} notification - Notification object
 */
const batchNotification = (userId, notification) => {
  if (!pendingNotifications.has(userId)) {
    pendingNotifications.set(userId, []);
    // Flush after 100ms
    setTimeout(() => {
      const notifications = pendingNotifications.get(userId);
      if (notifications && notifications.length > 0) {
        sendToUser(userId, 'notification:batch', {
          notifications,
          count: notifications.length
        });
      }
      pendingNotifications.delete(userId);
    }, 100);
  }
  pendingNotifications.get(userId).push(notification);
};

module.exports = {
  sendToUser,
  sendToMechanic,
  sendToRequest,
  sendToAdmin,
  sendToAll,
  getConnectedUsers,
  isUserOnline,
  batchNotification
};
