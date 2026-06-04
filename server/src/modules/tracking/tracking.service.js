// ============================================
// TRACKING MODULE — SERVICE
// ============================================

const { redisClient } = require('../../config/redis');
const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

/**
 * Get the last known location of a mechanic.
 * Checks Redis first for speed, falls back to PostgreSQL.
 *
 * @param {string} mechanicId - Mechanic UUID
 * @returns {Object} { lat, lng, updatedAt, source }
 * @throws {AppError} 404 if mechanic not found in DB
 */
const getLastKnownLocation = async (mechanicId) => {
  // 1. Check Redis
  const redisData = await redisClient.get(`mechanic:location:${mechanicId}`);
  if (redisData) {
    const parsed = JSON.parse(redisData);
    return {
      lat: parsed.lat,
      lng: parsed.lng,
      updatedAt: parsed.updatedAt,
      source: 'redis'
    };
  }

  // 2. Fall back to PostgreSQL
  const result = await query(
    'SELECT current_lat, current_lng, updated_at FROM mechanic_profiles WHERE user_id = $1',
    [mechanicId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Mechanic profile not found', 404);
  }

  const { current_lat, current_lng, updated_at } = result.rows[0];

  return {
    lat: current_lat,
    lng: current_lng,
    updatedAt: updated_at,
    source: 'db'
  };
};

/**
 * Check if a mechanic is currently online (has active Redis key).
 *
 * @param {string} mechanicId - Mechanic UUID
 * @returns {Object} { isOnline: boolean, lastSeen?: timestamp }
 */
const getMechanicOnlineStatus = async (mechanicId) => {
  const redisData = await redisClient.get(`mechanic:location:${mechanicId}`);
  if (redisData) {
    const parsed = JSON.parse(redisData);
    return {
      isOnline: true,
      lastSeen: parsed.updatedAt
    };
  }

  return {
    isOnline: false
  };
};

/**
 * Fetch locations for multiple mechanics at once using Redis MGET.
 *
 * @param {Array<string>} mechanicIds - Array of mechanic UUIDs
 * @returns {Array} Array of location objects
 */
const getMultipleMechanicLocations = async (mechanicIds) => {
  if (!mechanicIds || mechanicIds.length === 0) return [];

  const keys = mechanicIds.map(id => `mechanic:location:${id}`);
  
  // MGET returns array of values corresponding to keys
  const redisResults = await redisClient.mget(keys);

  return mechanicIds.map((id, index) => {
    const data = redisResults[index];
    if (data) {
      const parsed = JSON.parse(data);
      return {
        mechanicId: id,
        lat: parsed.lat,
        lng: parsed.lng,
        isOnline: true,
        updatedAt: parsed.updatedAt
      };
    } else {
      return {
        mechanicId: id,
        isOnline: false
      };
    }
  });
};

module.exports = {
  getLastKnownLocation,
  getMechanicOnlineStatus,
  getMultipleMechanicLocations
};
