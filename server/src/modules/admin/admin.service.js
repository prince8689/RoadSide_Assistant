// ============================================
// ADMIN MODULE — SERVICE (BUSINESS LOGIC)
// ============================================
// Complete admin panel business logic:
//   - User management (list, details, activate/deactivate)
//   - Mechanic verification (approve/reject)
//   - Service categories CRUD
//   - Dashboard statistics
//   - Reports (requests, mechanic performance)

const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');
const { getPagination, formatPaginatedResponse } = require('../../utils/pagination');
const { createNotification } = require('../notifications/notification.service');
const NotificationMessages = require('../../utils/notificationHelper');
const { emitDashboardUpdate } = require('../../utils/adminDashboardEmitter');

// ============================================
// ─── USER MANAGEMENT ────────────────────────
// ============================================

/**
 * Get all users with filters and pagination.
 *
 * Filters: role, is_active, search (name or email)
 * Pagination: page, limit
 * If role=mechanic, joins with mechanic_profiles.
 *
 * @param {Object} filters - { role?, is_active?, search?, page?, limit? }
 * @returns {Object} Paginated users list
 */
const getAllUsers = async (filters) => {
  const { page, limit, offset } = getPagination(filters);
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  // Filter by role
  if (filters.role) {
    conditions.push(`u.role = $${paramIndex++}`);
    values.push(filters.role);
  }

  // Filter by active status
  if (filters.is_active !== undefined) {
    const isActive = filters.is_active === 'true' || filters.is_active === true;
    conditions.push(`u.is_active = $${paramIndex++}`);
    values.push(isActive);
  }

  // Search by name or email
  if (filters.search) {
    conditions.push(`(u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
    values.push(`%${filters.search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*)::integer AS total FROM users u ${whereClause}`,
    values
  );
  const total = countResult.rows[0].total;

  // Get paginated users with optional mechanic profile join
  const usersResult = await query(
    `SELECT
      u.id, u.full_name, u.email, u.phone, u.role,
      u.profile_picture, u.is_active, u.created_at, u.updated_at,
      mp.id AS mechanic_profile_id,
      mp.business_name,
      mp.is_verified,
      mp.is_available,
      mp.rating,
      mp.total_jobs
    FROM users u
    LEFT JOIN mechanic_profiles mp ON mp.user_id = u.id AND u.role = 'mechanic'
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, limit, offset]
  );

  return formatPaginatedResponse(usersResult.rows, total, page, limit);
};

/**
 * Get full details of a single user.
 * - If mechanic: include mechanic profile + stats
 * - If user: include vehicles + request history count
 *
 * @param {string} userId - User UUID
 * @returns {Object} Full user details
 * @throws {AppError} 404 if user not found
 */
const getUserDetails = async (userId) => {
  // Get base user info
  const userResult = await query(
    `SELECT id, full_name, email, phone, role, profile_picture, is_active, created_at, updated_at
     FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user = userResult.rows[0];

  // If mechanic — include profile + stats
  if (user.role === 'mechanic') {
    const profileResult = await query(
      `SELECT * FROM mechanic_profiles WHERE user_id = $1`,
      [userId]
    );

    const statsResult = await query(
      `SELECT
        COUNT(*)::integer AS total_jobs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::integer AS completed_jobs,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::integer AS cancelled_jobs
      FROM service_requests WHERE mechanic_id = $1`,
      [userId]
    );

    user.mechanic_profile = profileResult.rows[0] || null;
    user.stats = statsResult.rows[0];
  }

  // If user — include vehicles + request count
  if (user.role === 'user') {
    const vehiclesResult = await query(
      `SELECT id, make, model, year, license_plate, fuel_type, color
       FROM vehicles WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    const requestCountResult = await query(
      `SELECT COUNT(*)::integer AS total_requests
       FROM service_requests WHERE user_id = $1`,
      [userId]
    );

    user.vehicles = vehiclesResult.rows;
    user.total_requests = requestCountResult.rows[0].total_requests;
  }

  return user;
};

/**
 * Activate or deactivate a user account.
 * Admin cannot deactivate their own account.
 *
 * @param {string} userId - Target user UUID
 * @param {boolean} isActive - true=activate, false=deactivate
 * @param {string} adminId - Admin's own UUID (to prevent self-deactivation)
 * @returns {Object} Updated user
 * @throws {AppError} 404 if user not found
 * @throws {AppError} 400 if admin tries to deactivate themselves
 */
const updateUserStatus = async (userId, isActive, adminId) => {
  // Prevent admin from deactivating themselves
  if (userId === adminId && !isActive) {
    throw new AppError('You cannot deactivate your own admin account', 400);
  }

  const result = await query(
    `UPDATE users SET is_active = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, full_name, email, role, is_active, updated_at`,
    [isActive, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const updatedUser = result.rows[0];

  if (!isActive) {
    const msg = NotificationMessages.ACCOUNT_DEACTIVATED();
    await createNotification(userId, msg.title, msg.message, msg.type);
  }

  return updatedUser;
};

// ============================================
// ─── MECHANIC VERIFICATION ─────────────────
// ============================================

/**
 * Get all mechanics pending verification.
 * is_verified = false, joined with user details.
 *
 * @returns {Array} List of unverified mechanics with documents
 */
const getPendingMechanics = async () => {
  const result = await query(
    `SELECT
      mp.*,
      u.full_name,
      u.email,
      u.phone,
      u.profile_picture,
      u.created_at AS user_created_at
    FROM mechanic_profiles mp
    JOIN users u ON u.id = mp.user_id
    WHERE mp.is_verified = false
    ORDER BY mp.created_at ASC`,
    []
  );

  return result.rows;
};

/**
 * Verify or reject a mechanic.
 * Updates is_verified in mechanic_profiles.
 *
 * @param {string} mechanicProfileId - mechanic_profiles UUID
 * @param {boolean} isVerified - true=approve, false=reject
 * @param {string} rejectionReason - Reason for rejection (required if rejecting)
 * @returns {Object} Updated mechanic profile
 * @throws {AppError} 404 if mechanic profile not found
 */
const verifyMechanic = async (mechanicProfileId, isVerified, rejectionReason) => {
  // Check mechanic profile exists
  const checkResult = await query(
    'SELECT id, user_id FROM mechanic_profiles WHERE id = $1',
    [mechanicProfileId]
  );

  if (checkResult.rows.length === 0) {
    throw new AppError('Mechanic profile not found', 404);
  }

  const updateFields = isVerified
    ? 'is_verified = true, updated_at = NOW()'
    : `is_verified = false, updated_at = NOW()`;

  const result = await query(
    `UPDATE mechanic_profiles SET ${updateFields}
     WHERE id = $1
     RETURNING *`,
    [mechanicProfileId]
  );

  const profile = result.rows[0];

  // Get user details for response
  const userResult = await query(
    'SELECT full_name, email FROM users WHERE id = $1',
    [profile.user_id]
  );

  profile.full_name = userResult.rows[0]?.full_name;
  profile.email = userResult.rows[0]?.email;
  profile.rejection_reason = isVerified ? null : rejectionReason;

  const msg = isVerified 
    ? NotificationMessages.MECHANIC_VERIFIED()
    : NotificationMessages.MECHANIC_REJECTED(rejectionReason);
  
  await createNotification(profile.user_id, msg.title, msg.message, msg.type);

  // Update Admin Dashboard
  emitDashboardUpdate();

  return profile;
};

// ============================================
// ─── SERVICE CATEGORIES ─────────────────────
// ============================================

/**
 * Get all service categories (including inactive).
 *
 * @returns {Array} All categories
 */
const getAllCategories = async () => {
  const result = await query(
    `SELECT * FROM service_categories ORDER BY name ASC`,
    []
  );
  return result.rows;
};

/**
 * Create a new service category.
 *
 * @param {Object} data - { name, slug, icon?, base_price, description? }
 * @returns {Object} Created category
 * @throws {AppError} 409 if slug already exists
 */
const createCategory = async (data) => {
  const { name, slug, icon, base_price, description } = data;

  // Check duplicate slug
  const slugCheck = await query(
    'SELECT id FROM service_categories WHERE slug = $1',
    [slug]
  );
  if (slugCheck.rows.length > 0) {
    throw new AppError('A category with this slug already exists', 409);
  }

  const result = await query(
    `INSERT INTO service_categories (name, slug, icon, base_price, description)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, slug, icon || null, base_price, description || null]
  );

  return result.rows[0];
};

/**
 * Update a service category.
 *
 * @param {string} categoryId - Category UUID
 * @param {Object} data - Fields to update
 * @returns {Object} Updated category
 * @throws {AppError} 404 if category not found
 */
const updateCategory = async (categoryId, data) => {
  // Check category exists
  const checkResult = await query(
    'SELECT id FROM service_categories WHERE id = $1',
    [categoryId]
  );

  if (checkResult.rows.length === 0) {
    throw new AppError('Service category not found', 404);
  }

  // Build dynamic SET clause
  const updates = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = ['name', 'base_price', 'is_active', 'description', 'icon'];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${paramIndex++}`);
      values.push(data[field]);
    }
  }

  if (updates.length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  values.push(categoryId);

  const result = await query(
    `UPDATE service_categories SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  return result.rows[0];
};

// ============================================
// ─── ALL REQUESTS (ADMIN VIEW) ──────────────
// ============================================

/**
 * Get all service requests with filters and pagination.
 *
 * Filters: status, category_id, page, limit
 *
 * @param {Object} filters - Query filters
 * @returns {Object} Paginated requests
 */
const getAllRequests = async (filters) => {
  const { page, limit, offset } = getPagination(filters);
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (filters.status) {
    conditions.push(`sr.status = $${paramIndex++}`);
    values.push(filters.status);
  }

  if (filters.category_id) {
    conditions.push(`sr.category_id = $${paramIndex++}`);
    values.push(filters.category_id);
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  // Total count
  const countResult = await query(
    `SELECT COUNT(*)::integer AS total FROM service_requests sr ${whereClause}`,
    values
  );
  const total = countResult.rows[0].total;

  // Paginated results with joins
  const result = await query(
    `SELECT
      sr.*,
      u.full_name AS user_name,
      u.email AS user_email,
      u.phone AS user_phone,
      m.full_name AS mechanic_name,
      m.email AS mechanic_email,
      v.make AS vehicle_make,
      v.model AS vehicle_model,
      v.license_plate AS vehicle_license_plate,
      sc.name AS category_name,
      sc.slug AS category_slug
    FROM service_requests sr
    JOIN users u ON u.id = sr.user_id
    LEFT JOIN users m ON m.id = sr.mechanic_id
    JOIN vehicles v ON v.id = sr.vehicle_id
    JOIN service_categories sc ON sc.id = sr.category_id
    ${whereClause}
    ORDER BY sr.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, limit, offset]
  );

  return formatPaginatedResponse(result.rows, total, page, limit);
};

/**
 * Get full details of a single request (admin — no access restrictions).
 *
 * @param {string} requestId - Service request UUID
 * @returns {Object} Full request details
 * @throws {AppError} 404 if not found
 */
const getRequestDetails = async (requestId) => {
  const result = await query(
    `SELECT
      sr.*,
      u.full_name AS user_name,
      u.email AS user_email,
      u.phone AS user_phone,
      m.full_name AS mechanic_name,
      m.email AS mechanic_email,
      m.phone AS mechanic_phone,
      v.make AS vehicle_make,
      v.model AS vehicle_model,
      v.year AS vehicle_year,
      v.license_plate AS vehicle_license_plate,
      v.fuel_type AS vehicle_fuel_type,
      v.color AS vehicle_color,
      sc.name AS category_name,
      sc.slug AS category_slug,
      sc.base_price AS category_base_price,
      sc.description AS category_description
    FROM service_requests sr
    JOIN users u ON u.id = sr.user_id
    LEFT JOIN users m ON m.id = sr.mechanic_id
    JOIN vehicles v ON v.id = sr.vehicle_id
    JOIN service_categories sc ON sc.id = sr.category_id
    WHERE sr.id = $1`,
    [requestId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Service request not found', 404);
  }

  return result.rows[0];
};

// ============================================
// ─── DASHBOARD STATISTICS ───────────────────
// ============================================

/**
 * Get comprehensive dashboard statistics.
 * All counts fetched via efficient COUNT queries.
 *
 * @returns {Object} Dashboard stats
 */
const getDashboardStats = async () => {
  // User counts
  const userStats = await query(
    `SELECT
      COUNT(CASE WHEN role = 'user' THEN 1 END)::integer AS total_users,
      COUNT(CASE WHEN role = 'mechanic' THEN 1 END)::integer AS total_mechanics,
      COUNT(CASE WHEN role = 'admin' THEN 1 END)::integer AS total_admins
    FROM users`,
    []
  );

  // Mechanic verification stats
  const mechanicStats = await query(
    `SELECT
      COUNT(CASE WHEN is_verified = true THEN 1 END)::integer AS verified_mechanics,
      COUNT(CASE WHEN is_verified = false THEN 1 END)::integer AS pending_verification
    FROM mechanic_profiles`,
    []
  );

  // Request stats
  const requestStats = await query(
    `SELECT
      COUNT(*)::integer AS total_requests,
      COUNT(CASE WHEN status NOT IN ('completed', 'cancelled') THEN 1 END)::integer AS active_requests,
      COUNT(CASE WHEN status = 'completed' THEN 1 END)::integer AS completed_requests,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::integer AS cancelled_requests,
      COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END)::integer AS todays_requests
    FROM service_requests`,
    []
  );

  // Average completion time (in minutes) for completed requests
  const avgTimeResult = await query(
    `SELECT
      ROUND(
        AVG(EXTRACT(EPOCH FROM (completed_at - requested_at)) / 60)::numeric, 2
      ) AS avg_completion_time_minutes
    FROM service_requests
    WHERE status = 'completed'
      AND completed_at IS NOT NULL
      AND requested_at IS NOT NULL`,
    []
  );

  return {
    ...userStats.rows[0],
    ...mechanicStats.rows[0],
    ...requestStats.rows[0],
    avg_completion_time_minutes: parseFloat(avgTimeResult.rows[0].avg_completion_time_minutes) || 0,
  };
};

// ============================================
// ─── REPORTS ────────────────────────────────
// ============================================

/**
 * Get requests report for a date range.
 *
 * Returns:
 *   - Total requests in range
 *   - Grouped by status
 *   - Grouped by service category
 *   - Top 5 mechanics by completed jobs in range
 *
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Object} Requests report
 */
const getRequestsReport = async (startDate, endDate) => {
  const dateFilter = 'sr.created_at >= $1::date AND sr.created_at < ($2::date + INTERVAL \'1 day\')';

  // Total requests in range
  const totalResult = await query(
    `SELECT COUNT(*)::integer AS total
     FROM service_requests sr
     WHERE ${dateFilter}`,
    [startDate, endDate]
  );

  // Grouped by status
  const byStatusResult = await query(
    `SELECT
      status,
      COUNT(*)::integer AS count
    FROM service_requests sr
    WHERE ${dateFilter}
    GROUP BY status
    ORDER BY count DESC`,
    [startDate, endDate]
  );

  // Grouped by service category
  const byCategoryResult = await query(
    `SELECT
      sc.name AS category_name,
      sc.slug AS category_slug,
      COUNT(*)::integer AS count
    FROM service_requests sr
    JOIN service_categories sc ON sc.id = sr.category_id
    WHERE ${dateFilter}
    GROUP BY sc.name, sc.slug
    ORDER BY count DESC`,
    [startDate, endDate]
  );

  // Top 5 mechanics by completed jobs in range
  const topMechanicsResult = await query(
    `SELECT
      u.full_name,
      u.email,
      COUNT(*)::integer AS completed_jobs,
      ROUND(AVG(mp.rating)::numeric, 2) AS avg_rating
    FROM service_requests sr
    JOIN users u ON u.id = sr.mechanic_id
    JOIN mechanic_profiles mp ON mp.user_id = sr.mechanic_id
    WHERE ${dateFilter}
      AND sr.status = 'completed'
    GROUP BY u.full_name, u.email
    ORDER BY completed_jobs DESC
    LIMIT 5`,
    [startDate, endDate]
  );

  // Convert by_status array to object for easier frontend consumption
  const byStatus = {};
  byStatusResult.rows.forEach((row) => {
    byStatus[row.status] = row.count;
  });

  return {
    total: totalResult.rows[0].total,
    by_status: byStatus,
    by_category: byCategoryResult.rows,
    top_mechanics: topMechanicsResult.rows,
  };
};

/**
 * Get mechanic performance report.
 * All mechanics with total_jobs, avg_rating, completion_rate.
 * Sorted by total_jobs DESC.
 *
 * @returns {Array} Mechanic performance data
 */
const getMechanicPerformance = async () => {
  const result = await query(
    `SELECT
      u.id,
      u.full_name,
      u.email,
      u.phone,
      mp.business_name,
      mp.is_verified,
      mp.is_available,
      mp.rating AS avg_rating,
      mp.total_jobs,
      mp.experience_years,
      COALESCE(stats.completed_jobs, 0) AS completed_jobs,
      COALESCE(stats.cancelled_jobs, 0) AS cancelled_jobs,
      CASE
        WHEN mp.total_jobs > 0
        THEN ROUND((COALESCE(stats.completed_jobs, 0)::numeric / mp.total_jobs) * 100, 2)
        ELSE 0
      END AS completion_rate
    FROM mechanic_profiles mp
    JOIN users u ON u.id = mp.user_id
    LEFT JOIN (
      SELECT
        mechanic_id,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::integer AS completed_jobs,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::integer AS cancelled_jobs
      FROM service_requests
      GROUP BY mechanic_id
    ) stats ON stats.mechanic_id = u.id
    ORDER BY mp.total_jobs DESC`,
    []
  );

  return result.rows;
};

module.exports = {
  getAllUsers,
  getUserDetails,
  updateUserStatus,
  getPendingMechanics,
  verifyMechanic,
  getAllCategories,
  createCategory,
  updateCategory,
  getAllRequests,
  getRequestDetails,
  getDashboardStats,
  getRequestsReport,
  getMechanicPerformance,
};
