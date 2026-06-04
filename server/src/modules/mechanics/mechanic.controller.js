// ============================================
// MECHANIC MODULE — CONTROLLER
// ============================================
// Thin layer: handles HTTP req/res only.
// All business logic is in mechanic.service.js.
// Every method uses async/await with try/catch,
// errors forwarded to global error handler via next().

const mechanicService = require('./mechanic.service');
const { success, error: errorResponse } = require('../../utils/apiResponse');

// ============================================
// PROFILE ENDPOINTS
// ============================================

/**
 * POST /api/mechanics/profile
 * Create a new mechanic profile (mechanic role only).
 *
 * Body: { business_name, experience_years, specializations, documents }
 * Returns: 201 + mechanic profile object
 */
const createProfile = async (req, res, next) => {
  try {
    const profile = await mechanicService.createMechanicProfile(req.user.id, req.body);

    return success(res, { profile }, 'Mechanic profile created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mechanics/profile
 * Get the authenticated mechanic's own profile.
 *
 * Returns: 200 + profile with user details (name, email, phone)
 */
const getMyProfile = async (req, res, next) => {
  try {
    const profile = await mechanicService.getMechanicProfile(req.user.id);

    return success(res, { profile }, 'Mechanic profile fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/mechanics/profile
 * Update the authenticated mechanic's profile.
 *
 * Body: { business_name?, experience_years?, specializations?, documents? }
 * Returns: 200 + updated profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const profile = await mechanicService.updateMechanicProfile(req.user.id, req.body);

    return success(res, { profile }, 'Mechanic profile updated successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================
// LOCATION ENDPOINT
// ============================================

/**
 * PATCH /api/mechanics/location
 * Update the mechanic's live location (DB + Redis cache).
 *
 * Body: { current_lat, current_lng }
 * Returns: 200 + { message, location }
 */
const updateLocation = async (req, res, next) => {
  try {
    const { current_lat, current_lng } = req.body;
    const location = await mechanicService.updateLocation(req.user.id, current_lat, current_lng);

    return success(res, { location }, 'Location updated successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================
// AVAILABILITY ENDPOINT
// ============================================

/**
 * PATCH /api/mechanics/availability
 * Toggle mechanic's availability on/off.
 *
 * Body: { is_available: boolean }
 * Returns: 200 + { message, is_available }
 */
const updateAvailability = async (req, res, next) => {
  try {
    const result = await mechanicService.updateAvailability(req.user.id, req.body.is_available);

    return success(res, { is_available: result.is_available }, 'Availability updated successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================
// NEARBY MECHANICS ENDPOINT
// ============================================

/**
 * GET /api/mechanics/nearby?lat=...&lng=...&radius=...
 * Find nearby verified & available mechanics.
 * Accessible by users only (not mechanics).
 *
 * Query params: lat (required), lng (required), radius (optional, default 10km)
 * Returns: 200 + array of nearby mechanics with distance_km
 */
const getNearbyMechanics = async (req, res, next) => {
  try {
    const { lat, lng, radius } = req.query;

    // Validate required query params
    if (!lat || !lng) {
      return errorResponse(res, 'Latitude (lat) and longitude (lng) query parameters are required', 400);
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(radius) || 10;

    // Validate numeric values
    if (isNaN(latitude) || isNaN(longitude)) {
      return errorResponse(res, 'lat and lng must be valid numbers', 400);
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return errorResponse(res, 'Invalid coordinates. lat: -90 to 90, lng: -180 to 180', 400);
    }

    const mechanics = await mechanicService.getNearbyMechanics(latitude, longitude, radiusKm);

    return success(res, {
      mechanics,
      count: mechanics.length,
      search: {
        lat: latitude,
        lng: longitude,
        radius_km: radiusKm,
      },
    }, 'Nearby mechanics fetched successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================
// PUBLIC PROFILE ENDPOINT
// ============================================

/**
 * GET /api/mechanics/:id
 * Get any mechanic's public profile.
 * Accessible by any authenticated user.
 * Does NOT expose sensitive document data.
 *
 * Returns: 200 + public profile (rating, specializations, etc.)
 */
const getMechanicPublicProfile = async (req, res, next) => {
  try {
    const profile = await mechanicService.getMechanicById(req.params.id);

    return success(res, { profile }, 'Mechanic public profile fetched successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================
// STATS ENDPOINT
// ============================================

/**
 * GET /api/mechanics/stats
 * Get the mechanic's own job statistics.
 *
 * Returns: 200 + { total_jobs, completed_jobs, cancelled_jobs, avg_rating }
 */
const getMyStats = async (req, res, next) => {
  try {
    const stats = await mechanicService.getMechanicStats(req.user.id);

    return success(res, { stats }, 'Mechanic stats fetched successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProfile,
  getMyProfile,
  updateProfile,
  updateLocation,
  updateAvailability,
  getNearbyMechanics,
  getMechanicPublicProfile,
  getMyStats,
};
