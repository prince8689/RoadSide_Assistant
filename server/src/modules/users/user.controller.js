// ============================================
// USER MODULE — CONTROLLER
// ============================================
// Thin layer: handles HTTP req/res only.
// All business logic is in user.service.js.
// Every method uses async/await with try/catch,
// errors forwarded to global error handler via next().

const userService = require('./user.service');
const { success } = require('../../utils/apiResponse');

// ============================================
// PROFILE ENDPOINTS
// ============================================

/**
 * GET /api/users/profile
 * Get current authenticated user's profile.
 *
 * Returns: 200 + user object (without password_hash)
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user.id);

    return success(res, { user }, 'Profile fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/profile
 * Update current user's profile (full_name, phone).
 *
 * Body: { full_name?, phone? }
 * Returns: 200 + updated user object
 */
const updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateUserProfile(req.user.id, req.body);

    return success(res, { user }, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================
// VEHICLE ENDPOINTS
// ============================================

/**
 * GET /api/users/vehicles
 * Get all vehicles of the authenticated user.
 *
 * Returns: 200 + array of vehicles
 */
const getMyVehicles = async (req, res, next) => {
  try {
    const vehicles = await userService.getUserVehicles(req.user.id);

    return success(res, {
      vehicles,
      count: vehicles.length,
    }, 'Vehicles fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/vehicles
 * Add a new vehicle for the authenticated user.
 *
 * Body: { make, model, year, license_plate, fuel_type?, color? }
 * Returns: 201 + created vehicle object
 */
const addVehicle = async (req, res, next) => {
  try {
    const vehicle = await userService.addVehicle(req.user.id, req.body);

    return success(res, { vehicle }, 'Vehicle added successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/vehicles/:id
 * Get a single vehicle by ID (with ownership check).
 *
 * Returns: 200 + vehicle object
 */
const getSingleVehicle = async (req, res, next) => {
  try {
    const vehicle = await userService.getVehicleById(req.params.id, req.user.id);

    return success(res, { vehicle }, 'Vehicle fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/vehicles/:id
 * Update a vehicle by ID (with ownership check).
 *
 * Body: { make?, model?, year?, license_plate?, fuel_type?, color? }
 * Returns: 200 + updated vehicle object
 */
const updateVehicle = async (req, res, next) => {
  try {
    const vehicle = await userService.updateVehicle(
      req.params.id,
      req.user.id,
      req.body
    );

    return success(res, { vehicle }, 'Vehicle updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/vehicles/:id
 * Delete a vehicle by ID (with ownership check).
 *
 * Returns: 200 + success message
 */
const deleteVehicle = async (req, res, next) => {
  try {
    await userService.deleteVehicle(req.params.id, req.user.id);

    return success(res, null, 'Vehicle deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getMyVehicles,
  addVehicle,
  getSingleVehicle,
  updateVehicle,
  deleteVehicle,
};
