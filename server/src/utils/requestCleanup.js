const { pool } = require('../config/db');
const { logger } = require('./logger');

const startRequestCleanupJob = () => {
  // Run every hour
  setInterval(async () => {
    try {
      const result = await pool.query(`
        UPDATE service_requests
        SET status = 'cancelled',
            cancelled_at = NOW(),
            cancel_reason = 'Service is cancelled for no response',
            updated_at = NOW()
        WHERE status = 'pending'
          AND created_at < NOW() - INTERVAL '1 day'
        RETURNING id;
      `);

      if (result.rowCount > 0) {
        logger.info(`Auto-cancelled ${result.rowCount} pending service requests older than 1 day.`);
      }
    } catch (error) {
      logger.error('Error running request cleanup job:', error.message);
    }
  }, 60 * 60 * 1000); // 1 hour
};

module.exports = { startRequestCleanupJob };
