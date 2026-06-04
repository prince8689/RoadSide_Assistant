const getAdminService = () => require('../modules/admin/admin.service');
const { sendToAdmin } = require('../socket/socketManager');
const EVENTS = require('../socket/events');
const { logger } = require('./logger');

/**
 * Emit live dashboard stats to all connected admins.
 * Fetches fresh stats from the DB and broadcasts them.
 */
const emitDashboardUpdate = async () => {
  try {
    const { getDashboardStats } = getAdminService();
    // Get fresh stats from DB
    const stats = await getDashboardStats();

    // Get online mechanics count from Redis
    const { redisClient } = require('../config/redis');
    const onlineUsersKeys = await redisClient.keys('user:online:*');
    let onlineMechanics = 0;
    for (const key of onlineUsersKeys) {
      const data = await redisClient.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.role === 'mechanic') {
          onlineMechanics++;
        }
      }
    }
    
    // Send to all connected admins
    sendToAdmin(EVENTS.DASHBOARD_STATS_UPDATE || 'admin:stats:update', {
      ...stats,
      onlineMechanics,
      activeRequests: stats.active_requests,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error(`Failed to emit dashboard update: ${error.message}`);
  }
};

module.exports = {
  emitDashboardUpdate
};
