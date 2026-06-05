const { query } = require('../../config/db');
const { redisClient } = require('../../config/redis');
const { logger } = require('../../utils/logger');
const { AppError } = require('../../middleware/errorHandler');

/**
 * Finds nearby mechanics using PostgreSQL Haversine function.
 * Caches results in Redis for 2 minutes to reduce DB load.
 * 
 * @param {number} userLat 
 * @param {number} userLng 
 * @param {number} radiusKm 
 * @param {Object} filters { serviceType, minRating, maxDistance }
 * @returns {Promise<Array>} Array of mechanics
 */
const findNearbyMechanics = async (userLat, userLng, radiusKm = 10, filters = {}) => {
  const { serviceType, minRating, maxDistance } = filters;
  const radius = maxDistance || radiusKm;
  
  // Cache key based on coordinates rounded to 1 decimal place (~11km grids) and filters
  const cacheKey = `nearby:${parseFloat(userLat).toFixed(1)}:${parseFloat(userLng).toFixed(1)}:${radius}:${serviceType || 'all'}:${minRating || 0}`;
  
  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  } catch (err) {
    logger.warn('Redis cache get error in findNearbyMechanics:', err.message);
  }

  // Use the PostgreSQL function we created in the migration
  const dbResult = await query(
    `SELECT * FROM find_nearby_mechanics($1, $2, $3)`,
    [userLat, userLng, radius]
  );

  let mechanics = dbResult.rows;

  // Apply memory filters if any
  if (serviceType) {
    mechanics = mechanics.filter(m => m.specializations && m.specializations.includes(serviceType));
  }
  if (minRating) {
    mechanics = mechanics.filter(m => parseFloat(m.average_rating) >= parseFloat(minRating));
  }

  // Add calculated fields
  mechanics = mechanics.map(m => {
    const distanceKm = parseFloat(m.distance_km);
    return {
      ...m,
      distanceText: `${distanceKm.toFixed(1)} km away`,
      // Assuming average city speed of 30 km/h -> 1 km = 2 mins
      estimatedArrival: `${Math.ceil((distanceKm / 30) * 60)} minutes`,
    };
  });

  try {
    // Cache for 2 minutes (120 seconds)
    await redisClient.set(cacheKey, JSON.stringify(mechanics), 'EX', 120);
  } catch (err) {
    logger.warn('Redis cache set error in findNearbyMechanics:', err.message);
  }

  return mechanics;
};

/**
 * Updates a mechanic's location in the database and records history.
 * 
 * @param {number} mechanicId 
 * @param {number} lat 
 * @param {number} lng 
 * @param {number} accuracy 
 * @returns {Promise<Object>} The updated coordinates
 */
const updateMechanicLocation = async (mechanicId, lat, lng, accuracy) => {
  // Update current location
  await query(
    `UPDATE mechanic_profiles 
     SET latitude = $1, longitude = $2, last_location_update = NOW() 
     WHERE id = $3`,
    [lat, lng, mechanicId]
  );

  // Insert into history table
  await query(
    `INSERT INTO mechanic_locations (mechanic_id, latitude, longitude, accuracy)
     VALUES ($1, $2, $3, $4)`,
    [mechanicId, lat, lng, accuracy]
  );

  // Invalidate cache for this grid area
  const cachePattern = `nearby:${parseFloat(lat).toFixed(1)}:${parseFloat(lng).toFixed(1)}:*`;
  try {
    const keys = await redisClient.keys(cachePattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (err) {
    logger.warn('Redis cache invalidation error:', err.message);
  }

  return { lat, lng, accuracy };
};

/**
 * Gets full details for a specific mechanic by ID.
 * 
 * @param {number} mechanicId 
 * @returns {Promise<Object>} Mechanic profile details
 */
const getMechanicById = async (mechanicId) => {
  const result = await query(
    `SELECT 
      m.id as mechanic_id,
      u.full_name as name,
      u.phone,
      u.profile_picture,
      m.latitude,
      m.longitude,
      m.is_available,
      m.is_verified,
      m.average_rating,
      m.total_reviews,
      m.specializations,
      m.experience_years
     FROM mechanic_profiles m
     JOIN users u ON m.user_id = u.id
     WHERE m.id = $1`,
    [mechanicId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Mechanic not found', 404);
  }

  return result.rows[0];
};

/**
 * Updates a regular user's location.
 * 
 * @param {number} userId 
 * @param {number} lat 
 * @param {number} lng 
 */
const updateUserLocation = async (userId, lat, lng) => {
  await query(
    `UPDATE users 
     SET latitude = $1, longitude = $2, last_seen = NOW() 
     WHERE id = $3`,
    [lat, lng, userId]
  );
  return { lat, lng };
};

module.exports = {
  findNearbyMechanics,
  updateMechanicLocation,
  getMechanicById,
  updateUserLocation
};
