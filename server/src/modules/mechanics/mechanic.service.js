// ============================================
// MECHANIC MODULE — SERVICE (BUSINESS LOGIC)
// ============================================
// All business logic for mechanic profile management,
// live location tracking, availability, and nearby
// mechanic search using the Haversine formula.
//
// Services:
//   createMechanicProfile  — Register as a mechanic
//   getMechanicProfile     — Get own profile (joined with users)
//   updateMechanicProfile  — Update allowed fields
//   updateLocation         — Update lat/lng in DB + Redis
//   updateAvailability     — Toggle is_available on/off
//   getNearbyMechanics     — Haversine-based proximity search
//   getMechanicById        — Public profile (no sensitive docs)
//   getMechanicStats       — Job statistics for mechanic dashboard

const { query, pool } = require('../../config/db');
const { redisClient } = require('../../config/redis');
const { AppError } = require('../../middleware/errorHandler');
const { logger } = require('../../utils/logger');

// ============================================
// CREATE MECHANIC PROFILE
// ============================================

/**
 * Create a new mechanic profile for an authenticated user.
 * Checks for existing profile to prevent duplicates.
 * is_verified defaults to false (admin must verify).
 *
 * @param {string} userId - User UUID from JWT
 * @param {Object} data - { business_name, experience_years, specializations, documents }
 * @returns {Object} Created mechanic profile
 * @throws {AppError} 409 if mechanic profile already exists for this user
 */
const createMechanicProfile = async (userId, data) => {
  const { business_name, experience_years, specializations, documents, phone, working_hours_start, working_hours_end } = data;

  if (phone !== undefined) {
    await query('UPDATE users SET phone = $1, updated_at = NOW() WHERE id = $2', [phone, userId]);
  }

  // Check if profile already exists for this user
  const existing = await query(
    'SELECT id FROM mechanic_profiles WHERE user_id = $1',
    [userId]
  );

  if (existing.rows.length > 0) {
    throw new AppError('Mechanic profile already exists for this user', 409);
  }

  // specializations is stored as TEXT[] in PostgreSQL (native array)
  // documents is stored as JSONB
  const result = await query(
    `INSERT INTO mechanic_profiles (
      user_id, business_name, experience_years, specializations, documents,
      is_verified, is_available, rating, total_jobs, working_hours_start, working_hours_end
    )
    VALUES ($1, $2, $3, $4, $5, true, false, 0, 0)
    RETURNING *`,
    [
      userId,
      business_name,
      experience_years,
      specializations,          // pg driver auto-converts JS array → TEXT[]
      JSON.stringify(documents), // JSONB requires JSON string
      working_hours_start,
      working_hours_end
    ]
  );

  return result.rows[0];
};

// ============================================
// GET MECHANIC PROFILE (OWN)
// ============================================

/**
 * Get the authenticated mechanic's own profile,
 * joined with the users table for name, email, phone.
 *
 * @param {string} userId - User UUID from JWT
 * @returns {Object} Mechanic profile with user details
 * @throws {AppError} 404 if no mechanic profile found
 */
const getMechanicProfile = async (userId) => {
  const result = await query(
    `SELECT
      mp.*,
      u.full_name,
      u.email,
      u.phone,
      u.profile_picture,
      mp.working_hours_start,
      mp.working_hours_end
    FROM mechanic_profiles mp
    JOIN users u ON u.id = mp.user_id
    WHERE mp.user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Mechanic profile not found. Please create a profile first.', 404);
  }

  return result.rows[0];
};

// ============================================
// UPDATE MECHANIC PROFILE
// ============================================

/**
 * Update allowed fields of the mechanic profile.
 * Only updates fields that are provided.
 *
 * @param {string} userId - User UUID from JWT
 * @param {Object} data - { business_name?, experience_years?, specializations?, documents? }
 * @returns {Object} Updated mechanic profile
 * @throws {AppError} 404 if mechanic profile not found
 */
const updateMechanicProfile = async (userId, data) => {
  // Verify profile exists
  const profileCheck = await query(
    'SELECT id FROM mechanic_profiles WHERE user_id = $1',
    [userId]
  );

  if (profileCheck.rows.length === 0) {
    throw new AppError('Mechanic profile not found', 404);
  }

  // Build dynamic SET clause — only update provided fields
  const updates = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = ['business_name', 'experience_years', 'working_hours_start', 'working_hours_end'];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramIndex++}`);
      values.push(data[field]);
    }
  }

  // Handle specializations (TEXT[] — PostgreSQL native array)
  if (data.specializations !== undefined) {
    updates.push(`specializations = $${paramIndex++}`);
    values.push(data.specializations); // pg driver auto-converts JS array → TEXT[]
  }

  // Handle documents (JSONB)
  if (data.documents !== undefined) {
    updates.push(`documents = $${paramIndex++}`);
    values.push(JSON.stringify(data.documents));
  }

  // Update phone in users table if provided
  if (data.phone !== undefined) {
    await query('UPDATE users SET phone = $1, updated_at = NOW() WHERE id = $2', [data.phone, userId]);
  }

  let result;
  if (updates.length > 0) {
    // Always update the timestamp
    updates.push('updated_at = NOW()');
    values.push(userId);
    result = await query(
      `UPDATE mechanic_profiles SET ${updates.join(', ')}
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      values
    );
  } else {
    result = await query('SELECT * FROM mechanic_profiles WHERE user_id = $1', [userId]);
  }

  return result.rows[0];
};

// ============================================
// UPDATE LIVE LOCATION
// ============================================

/**
 * Update mechanic's current location in PostgreSQL
 * AND cache it in Redis with a 5-minute expiry.
 *
 * Redis key format: mechanic:location:{userId}
 * Redis value: JSON { lat, lng, updatedAt }
 *
 * @param {string} userId - User UUID from JWT
 * @param {number} lat - Current latitude
 * @param {number} lng - Current longitude
 * @throws {AppError} 404 if mechanic profile not found
 */
const updateLocation = async (userId, lat, lng) => {
  // Update location in PostgreSQL
  const result = await query(
    `UPDATE mechanic_profiles
     SET latitude = $1, longitude = $2, last_location_update = NOW()
     WHERE user_id = $3
     RETURNING id, user_id, latitude, longitude`,
    [lat, lng, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Mechanic profile not found. Please create a profile first.', 404);
  }

  // Cache location in Redis with 5-minute expiry (300 seconds)
  try {
    await redisClient.setex(
      `mechanic:location:${userId}`,
      300, // 5 minutes expiry
      JSON.stringify({ lat, lng, updatedAt: new Date() })
    );
  } catch (redisError) {
    // Redis failure is non-critical — log but don't fail the request
    logger.warn('Redis location cache failed: ' + redisError.message);
  }

  return result.rows[0];
};

// ============================================
// UPDATE AVAILABILITY
// ============================================

/**
 * Toggle mechanic's availability on/off.
 *
 * @param {string} userId - User UUID from JWT
 * @param {boolean} isAvailable - true = available, false = unavailable
 * @returns {Object} { is_available }
 * @throws {AppError} 404 if mechanic profile not found
 */
const updateAvailability = async (userId, isAvailable) => {
  const result = await query(
    `UPDATE mechanic_profiles
     SET is_available = $1, updated_at = NOW()
     WHERE user_id = $2
     RETURNING id, user_id, is_available`,
    [isAvailable, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Mechanic profile not found. Please create a profile first.', 404);
  }

  return result.rows[0];
};

// ============================================
// GET NEARBY MECHANICS (Haversine Formula)
// ============================================

/**
 * Find mechanics within a given radius using the
 * Haversine formula for great-circle distance.
 *
 * Only returns mechanics who are:
 *   - is_verified = true
 *   - is_available = true
 *   - have a valid current_lat/current_lng
 *
 * Results sorted by distance (nearest first), limited to 20.
 *
 * @param {number} lat - User's latitude
 * @param {number} lng - User's longitude
 * @param {number} radiusKm - Search radius in kilometers (default: 10)
 * @returns {Array} Array of nearby mechanic objects with distance_km
 */
const getNearbyMechanics = async (lat, lng, radiusKm = 10) => {
  const result = await query(
      `SELECT 
        u.id AS user_id,
        u.full_name AS name,
        u.phone,
        u.profile_picture,
        mp.business_name,
        mp.experience_years,
        mp.working_hours_start,
        mp.working_hours_end,
        mp.specializations,
        mp.rating AS average_rating,
        mp.total_jobs,
        mp.latitude,
        mp.longitude,
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(mp.latitude)) *
            cos(radians(mp.longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(mp.latitude))
          )
        ) AS distance_km
      FROM mechanic_profiles mp
      JOIN users u ON u.id = mp.user_id
      WHERE mp.is_available = true 
        AND mp.is_verified = true
      HAVING (
        6371 * acos(
          cos(radians($1)) * cos(radians(mp.latitude)) *
          cos(radians(mp.longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(mp.latitude))
        )
      ) <= $3
      ORDER BY distance_km ASC
      LIMIT 20`,
    [lat, lng, radiusKm]
  );

    // Fetch their prices
    const mechanicIds = result.rows.map(m => m.user_id);
    let pricingMap = {};
    if (mechanicIds.length > 0) {
      const priceResult = await query(
        `SELECT ms.mechanic_id, ms.category_id, ms.min_price, ms.max_price, ms.is_enabled,
                sc.name, sc.icon, sc.slug, sc.base_price
         FROM mechanic_services ms
         JOIN service_categories sc ON ms.category_id = sc.id
         WHERE ms.mechanic_id = ANY($1) AND ms.is_enabled = true`,
        [mechanicIds]
      );
      
      priceResult.rows.forEach(p => {
        if (!pricingMap[p.mechanic_id]) pricingMap[p.mechanic_id] = {};
        pricingMap[p.mechanic_id][p.category_id] = p;
      });
    }

    return result.rows.map((row) => ({
      mechanic_id: row.user_id,
      name: row.name,
      phone: row.phone,
      profile_picture: row.profile_picture,
      business_name: row.business_name,
      experience_years: row.experience_years,
      working_hours_start: row.working_hours_start,
      working_hours_end: row.working_hours_end,
      specializations: row.specializations,
      average_rating: row.average_rating,
      total_jobs: row.total_jobs,
      distance_km: parseFloat(row.distance_km).toFixed(1),
      pricing: pricingMap[row.user_id] || {},
      coordinates: {
        lat: row.latitude,
        lng: row.longitude,
      },
    }));
};

// ============================================
// GET MECHANIC PUBLIC PROFILE
// ============================================

/**
 * Get a mechanic's public profile by mechanic_profiles.id.
 * Excludes sensitive document data.
 * Includes rating, total_jobs, specializations.
 *
 * @param {string} mechanicId - mechanic_profiles UUID
 * @returns {Object} Public mechanic profile
 * @throws {AppError} 404 if mechanic not found
 */
const getMechanicById = async (mechanicId) => {
  const result = await query(
    `SELECT
      mp.id,
      mp.user_id,
      mp.business_name,
      mp.experience_years,
      mp.specializations,
      mp.is_verified,
      mp.is_available,
      mp.rating,
      mp.total_jobs,
      mp.latitude,
      mp.longitude,
      mp.created_at,
      u.full_name,
      u.phone,
      u.profile_picture
    FROM mechanic_profiles mp
    JOIN users u ON u.id = mp.user_id
    WHERE mp.id = $1`,
    [mechanicId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Mechanic not found', 404);
  }

  return result.rows[0];
};

// ============================================
// GET MECHANIC STATS (DASHBOARD)
// ============================================

/**
 * Get job statistics for the mechanic's dashboard.
 * Queries the service_requests table for counts.
 *
 * @param {string} userId - User UUID from JWT
 * @returns {Object} { total_jobs, completed_jobs, cancelled_jobs, avg_rating }
 */
const getMechanicStats = async (userId) => {
  // First verify mechanic profile exists
  const profileCheck = await query(
    'SELECT id, rating, total_jobs FROM mechanic_profiles WHERE user_id = $1',
    [userId]
  );

  if (profileCheck.rows.length === 0) {
    throw new AppError('Mechanic profile not found', 404);
  }

  const mechanicProfile = profileCheck.rows[0];

  // Get job counts from service_requests table
  // Note: service_requests.mechanic_id references users.id (not mechanic_profiles.id)
  const statsResult = await query(
    `SELECT
      COUNT(*)::integer AS total_jobs,
      COUNT(CASE WHEN status = 'completed' THEN 1 END)::integer AS completed_jobs,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::integer AS cancelled_jobs
    FROM service_requests
    WHERE mechanic_id = $1`,
    [userId]
  );

  const stats = statsResult.rows[0] || {
    total_jobs: 0,
    completed_jobs: 0,
    cancelled_jobs: 0,
  };

  return {
    total_jobs: stats.total_jobs,
    completed_jobs: stats.completed_jobs,
    cancelled_jobs: stats.cancelled_jobs,
    avg_rating: parseFloat(mechanicProfile.rating) || 0,
  };
};

// ============================================
// GET CUSTOM SERVICES PRICING
// ============================================

/**
 * Fetch all custom service prices for a mechanic
 * Returns an array of category definitions joined with the mechanic's custom prices.
 */
const getMechanicServices = async (mechanicId) => {
  const result = await query(
    `SELECT 
      sc.id AS category_id, 
      sc.name, 
      sc.slug, 
      sc.icon,
      sc.base_price,
      COALESCE(ms.min_price, sc.base_price) AS min_price,
      COALESCE(ms.max_price, sc.base_price) AS max_price,
      COALESCE(ms.is_enabled, true) AS is_enabled
     FROM service_categories sc
     LEFT JOIN mechanic_services ms 
       ON sc.id = ms.category_id AND ms.mechanic_id = $1
     ORDER BY sc.name ASC`,
    [mechanicId]
  );
  return result.rows;
};

// ============================================
// UPDATE CUSTOM SERVICES PRICING
// ============================================

/**
 * Bulk update a mechanic's custom services
 */
const updateMechanicServices = async (mechanicId, servicesData) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // UPSERT pattern
    for (const s of servicesData) {
      await client.query(
        `INSERT INTO mechanic_services (mechanic_id, category_id, min_price, max_price, is_enabled)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (mechanic_id, category_id) 
         DO UPDATE SET 
           min_price = EXCLUDED.min_price,
           max_price = EXCLUDED.max_price,
           is_enabled = EXCLUDED.is_enabled,
           updated_at = NOW()`,
        [mechanicId, s.category_id, s.min_price, s.max_price, s.is_enabled]
      );
    }

    await client.query('COMMIT');
    return await getMechanicServices(mechanicId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createMechanicProfile,
  getMechanicProfile,
  updateMechanicProfile,
  updateLocation,
  updateAvailability,
  getNearbyMechanics,
  getMechanicById,
  getMechanicStats,
  getMechanicServices,
  updateMechanicServices,
};
