// ============================================
// USER MODULE — SERVICE (BUSINESS LOGIC)
// ============================================
// All business logic for user profile and vehicle
// management. Handles DB queries, ownership checks,
// and duplicate detection.

const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

// ============================================
// USER PROFILE
// ============================================

/**
 * Get user by ID.
 * Returns all fields EXCEPT password_hash.
 *
 * @param {string} id - User UUID
 * @returns {Object} User data
 * @throws {AppError} 404 if user not found
 */
const getUserById = async (id) => {
  const result = await query(
    `SELECT id, full_name, email, phone, role, profile_picture, is_active, created_at, updated_at
     FROM users WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  return result.rows[0];
};

/**
 * Update user profile (full_name, phone).
 * Only updates fields that are provided.
 *
 * @param {string} id - User UUID
 * @param {Object} data - { full_name?, phone? }
 * @returns {Object} Updated user data
 * @throws {AppError} 409 if phone already taken by another user
 */
const updateUserProfile = async (id, data) => {
  const { full_name, phone } = data;

  // If phone is being updated, check for duplicates
  if (phone) {
    const phoneCheck = await query(
      'SELECT id FROM users WHERE phone = $1 AND id != $2',
      [phone, id]
    );
    if (phoneCheck.rows.length > 0) {
      throw new AppError('Phone number is already registered by another user', 409);
    }
  }

  // Build dynamic SET clause — only update provided fields
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (full_name !== undefined) {
    updates.push(`full_name = $${paramIndex++}`);
    values.push(full_name);
  }

  if (phone !== undefined) {
    updates.push(`phone = $${paramIndex++}`);
    values.push(phone);
  }

  // updated_at is handled by the trigger, but let's be explicit
  updates.push(`updated_at = NOW()`);

  // Add the user ID as the last parameter
  values.push(id);

  const result = await query(
    `UPDATE users SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, full_name, email, phone, role, profile_picture, is_active, created_at, updated_at`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  return result.rows[0];
};

/**
 * Upload/update user's profile picture URL.
 *
 * @param {string} id - User UUID
 * @param {string} imageUrl - URL to profile image
 * @returns {Object} Updated user data
 */
const uploadProfilePicture = async (id, imageUrl) => {
  const result = await query(
    `UPDATE users SET profile_picture = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, full_name, email, phone, role, profile_picture, is_active, created_at, updated_at`,
    [imageUrl, id]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  return result.rows[0];
};

// ============================================
// VEHICLES
// ============================================

/**
 * Get all vehicles owned by a user.
 *
 * @param {string} userId - User UUID
 * @returns {Array} Array of vehicle objects
 */
const getUserVehicles = async (userId) => {
  const result = await query(
    `SELECT id, user_id, make, model, year, license_plate, fuel_type, color, created_at
     FROM vehicles
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
};

/**
 * Add a new vehicle for a user.
 * Checks for duplicate license plate across ALL users.
 *
 * @param {string} userId - User UUID
 * @param {Object} data - Vehicle data
 * @returns {Object} Created vehicle
 * @throws {AppError} 409 if license plate already exists
 */
const addVehicle = async (userId, data) => {
  const { make, model, year, license_plate, fuel_type, color } = data;

  // Check duplicate license plate
  const plateCheck = await query(
    'SELECT id FROM vehicles WHERE license_plate = $1',
    [license_plate]
  );
  if (plateCheck.rows.length > 0) {
    throw new AppError('License plate already registered', 409);
  }

  const result = await query(
    `INSERT INTO vehicles (user_id, make, model, year, license_plate, fuel_type, color)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, user_id, make, model, year, license_plate, fuel_type, color, created_at`,
    [userId, make, model, year, license_plate, fuel_type || 'petrol', color || null]
  );

  return result.rows[0];
};

/**
 * Get a single vehicle by ID with ownership verification.
 *
 * @param {string} vehicleId - Vehicle UUID
 * @param {string} userId - User UUID (for ownership check)
 * @returns {Object} Vehicle data
 * @throws {AppError} 404 if vehicle not found
 * @throws {AppError} 403 if user doesn't own the vehicle
 */
const getVehicleById = async (vehicleId, userId) => {
  const result = await query(
    `SELECT id, user_id, make, model, year, license_plate, fuel_type, color, created_at
     FROM vehicles WHERE id = $1`,
    [vehicleId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Vehicle not found', 404);
  }

  const vehicle = result.rows[0];

  // Ownership check
  if (vehicle.user_id !== userId) {
    throw new AppError('Not authorized to access this vehicle', 403);
  }

  return vehicle;
};

/**
 * Update a vehicle with ownership verification.
 * Only updates fields that are provided.
 *
 * @param {string} vehicleId - Vehicle UUID
 * @param {string} userId - User UUID (for ownership check)
 * @param {Object} data - Fields to update
 * @returns {Object} Updated vehicle data
 * @throws {AppError} 403 if user doesn't own the vehicle
 * @throws {AppError} 409 if new license plate is already taken
 */
const updateVehicle = async (vehicleId, userId, data) => {
  // First verify ownership
  await getVehicleById(vehicleId, userId);

  // If license_plate is being updated, check for duplicates
  if (data.license_plate) {
    const plateCheck = await query(
      'SELECT id FROM vehicles WHERE license_plate = $1 AND id != $2',
      [data.license_plate, vehicleId]
    );
    if (plateCheck.rows.length > 0) {
      throw new AppError('License plate already registered by another vehicle', 409);
    }
  }

  // Build dynamic SET clause
  const updates = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = ['make', 'model', 'year', 'license_plate', 'fuel_type', 'color'];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramIndex++}`);
      values.push(data[field]);
    }
  }

  if (updates.length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  // Add vehicleId as the last parameter
  values.push(vehicleId);

  const result = await query(
    `UPDATE vehicles SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, user_id, make, model, year, license_plate, fuel_type, color, created_at`,
    values
  );

  return result.rows[0];
};

/**
 * Delete a vehicle with ownership verification.
 *
 * @param {string} vehicleId - Vehicle UUID
 * @param {string} userId - User UUID (for ownership check)
 * @throws {AppError} 403 if user doesn't own the vehicle
 */
const deleteVehicle = async (vehicleId, userId) => {
  // Verify ownership first
  await getVehicleById(vehicleId, userId);

  await query('DELETE FROM vehicles WHERE id = $1', [vehicleId]);
};

module.exports = {
  getUserById,
  updateUserProfile,
  uploadProfilePicture,
  getUserVehicles,
  addVehicle,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
};
