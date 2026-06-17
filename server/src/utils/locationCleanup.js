// ============================================
// AUTO LOCATION CLEANUP JOB
// ============================================

const { query } = require('../config/db');
const { logger } = require('./logger');

/**
 * Cleanup stale mechanic locations.
 * 
 * Mechanics who disconnect without emitting 'mechanic:go:offline'
 * will still have is_available = true in the database, even though
 * their Redis location key has expired.
 * 
 * This job runs every 5 minutes, finds any mechanic where
 * is_available = true AND updated_at < NOW() - 10 minutes,
 * and marks them as is_available = false.
 */
const cleanupStaleLocations = async () => {
  try {
    // User requested: Mechanics should only go offline manually.
    // Disabling aggressive 10-minute auto-offline.
    logger.info(`🧹 Auto location cleanup skipped (Manual offline enabled).`);
  } catch (error) {
    logger.error('Failed to run cleanupStaleLocations job: ' + error.message);
  }
};

let intervalId = null;

const startCleanupJob = () => {
  if (intervalId) return;
  
  // Run once immediately (optional)
  cleanupStaleLocations();

  // Run every 5 minutes (300,000 ms)
  intervalId = setInterval(cleanupStaleLocations, 5 * 60 * 1000);
  logger.info('🕒 Auto location cleanup job started (runs every 5 minutes).');
};

const stopCleanupJob = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

module.exports = {
  cleanupStaleLocations,
  startCleanupJob,
  stopCleanupJob
};
