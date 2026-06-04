const { redisClient } = require('../config/redis');
const { getDashboardStats } = require('../modules/admin/admin.service');
const { logger } = require('../utils/logger');
const EVENTS = require('./events');

/**
 * Start the admin dashboard broadcast interval.
 * Polls stats every 30 seconds and broadcasts to all connected admins.
 * 
 * @param {Server} io - Socket.io server instance
 */
const startAdminDashboardBroadcast = (io) => {
  setInterval(async () => {
    try {
      // 1. Optimization: check if any admin is in the room
      const adminSockets = await io.in('admin:dashboard').fetchSockets();
      if (adminSockets.length === 0) {
        // No admins connected, skip expensive DB queries
        return;
      }

      // 2. Get fresh stats from DB
      const stats = await getDashboardStats();

      // 3. Get online mechanics count from Redis
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

      // 4. Emit to admin room
      // stats already includes active_requests
      io.to('admin:dashboard').emit(EVENTS.DASHBOARD_STATS_UPDATE, {
        ...stats,
        onlineMechanics,
        activeRequests: stats.active_requests,
        timestamp: new Date()
      });
    } catch (err) {
      logger.error(`Dashboard broadcast error: ${err.message}`);
    }
  }, 30000); // every 30 seconds
};

module.exports = { startAdminDashboardBroadcast };
