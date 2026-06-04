// ============================================
// SEARCH MODULE — SERVICE (BUSINESS LOGIC)
// ============================================
// Advanced search and filter logic for:
//   - Mechanics (keyword, specialization, rating, location, availability)
//   - Service Requests (status, date range, keyword, role-based)
//   - Users (admin-only: keyword, role, active status, registration date)
//
// Uses the dynamic query builder (queryBuilder.js) for
// parameterized WHERE clauses and the Haversine formula
// for geo-distance calculations.

const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');
const { getPagination, formatPaginatedResponse } = require('../../utils/pagination');
const { buildWhereClause } = require('../../utils/queryBuilder');

// ============================================
// SEARCH MECHANICS
// ============================================

/**
 * Search and filter verified mechanics.
 *
 * Filters:
 *   keyword         — ILIKE on business_name
 *   specialization  — ANY() match in specializations TEXT[]
 *   min_rating      — rating >= value
 *   max_rating      — rating <= value
 *   is_available    — boolean filter
 *   lat, lng, radius— Haversine-based proximity (km)
 *   sort_by         — rating | distance | total_jobs (default: rating)
 *   sort_order      — ASC | DESC (default: DESC)
 *   page, limit     — pagination
 *
 * Only returns verified mechanics (is_verified = true).
 * Joins with users table for name, phone, profile_picture.
 *
 * @param {Object} filters - Query parameters from the request
 * @returns {Object} { data, pagination }
 */
const searchMechanics = async (filters) => {
  const { page, limit, offset } = getPagination(filters);

  const {
    keyword,
    specialization,
    min_rating,
    max_rating,
    is_available,
    lat,
    lng,
    radius = 10,
    sort_by = 'rating',
    sort_order = 'DESC',
  } = filters;

  // ── Base conditions (always applied) ──
  const conditions = ['mp.is_verified = true'];
  const values = [];
  let paramIndex = 1;

  // ── Keyword search on business_name ──
  if (keyword) {
    conditions.push(`mp.business_name ILIKE $${paramIndex++}`);
    values.push(`%${keyword}%`);
  }

  // ── Specialization filter (ANY match in TEXT[] array) ──
  if (specialization) {
    conditions.push(`$${paramIndex++} = ANY(mp.specializations)`);
    values.push(specialization.toLowerCase());
  }

  // ── Rating range ──
  if (min_rating) {
    const minR = parseFloat(min_rating);
    if (!isNaN(minR)) {
      conditions.push(`mp.rating >= $${paramIndex++}`);
      values.push(minR);
    }
  }

  if (max_rating) {
    const maxR = parseFloat(max_rating);
    if (!isNaN(maxR)) {
      conditions.push(`mp.rating <= $${paramIndex++}`);
      values.push(maxR);
    }
  }

  // ── Availability ──
  if (is_available !== undefined && is_available !== '') {
    const boolVal = is_available === 'true' || is_available === true;
    conditions.push(`mp.is_available = $${paramIndex++}`);
    values.push(boolVal);
  }

  // ── Location-based filter (Haversine) ──
  let distanceSelect = '';
  let distanceCondition = '';
  const hasLocation = lat && lng;

  if (hasLocation) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(radius) || 10;

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new AppError('lat and lng must be valid numbers', 400);
    }

    // Distance calculation column
    distanceSelect = `,
      ROUND(
        (6371 * acos(
          cos(radians($${paramIndex})) * cos(radians(mp.current_lat)) *
          cos(radians(mp.current_lng) - radians($${paramIndex + 1})) +
          sin(radians($${paramIndex})) * sin(radians(mp.current_lat))
        ))::numeric, 2
      ) AS distance_km`;

    // Only include mechanics with valid coordinates
    conditions.push('mp.current_lat IS NOT NULL');
    conditions.push('mp.current_lng IS NOT NULL');

    // Radius filter
    distanceCondition = `
      AND (6371 * acos(
        cos(radians($${paramIndex})) * cos(radians(mp.current_lat)) *
        cos(radians(mp.current_lng) - radians($${paramIndex + 1})) +
        sin(radians($${paramIndex})) * sin(radians(mp.current_lat))
      )) <= $${paramIndex + 2}`;

    values.push(latitude, longitude, radiusKm);
    paramIndex += 3;
  }

  // ── Build WHERE clause ──
  const whereClause = `WHERE ${conditions.join(' AND ')}${distanceCondition}`;

  // ── Sorting ──
  const allowedSorts = {
    rating: 'mp.rating',
    distance: hasLocation ? 'distance_km' : 'mp.rating',
    total_jobs: 'mp.total_jobs',
  };

  const sortColumn = allowedSorts[sort_by] || 'mp.rating';
  const order = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const orderClause = `ORDER BY ${sortColumn} ${order}`;

  // ── Count query ──
  const countSQL = `
    SELECT COUNT(*)::integer AS total
    FROM mechanic_profiles mp
    JOIN users u ON u.id = mp.user_id
    ${whereClause}`;

  const countResult = await query(countSQL, values);
  const total = countResult.rows[0].total;

  // ── Data query ──
  const dataSQL = `
    SELECT
      mp.id,
      mp.user_id,
      mp.business_name,
      mp.experience_years,
      mp.specializations,
      mp.is_verified,
      mp.is_available,
      mp.rating,
      mp.total_jobs,
      mp.current_lat,
      mp.current_lng,
      mp.created_at,
      u.full_name,
      u.phone,
      u.profile_picture
      ${distanceSelect}
    FROM mechanic_profiles mp
    JOIN users u ON u.id = mp.user_id
    ${whereClause}
    ${orderClause}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

  values.push(limit, offset);

  const dataResult = await query(dataSQL, values);

  return formatPaginatedResponse(dataResult.rows, total, page, limit);
};

// ============================================
// SEARCH SERVICE REQUESTS
// ============================================

/**
 * Search service requests with role-based access control.
 *
 * Access rules:
 *   - admin:    can search ALL requests
 *   - user:     can search ONLY own requests
 *   - mechanic: can search ONLY assigned requests
 *
 * Filters:
 *   status       — single string or comma-separated array
 *   category_id  — exact match
 *   startDate    — created_at >= value
 *   endDate      — created_at <= value
 *   keyword      — ILIKE on breakdown_address or description
 *   sort_by      — created_at | status (default: created_at)
 *   sort_order   — ASC | DESC (default: DESC)
 *   page, limit  — pagination
 *
 * Joins with vehicles, service_categories, and user/mechanic details.
 *
 * @param {Object} filters - Query parameters
 * @param {string} userId  - Authenticated user UUID
 * @param {string} role    - User role (admin | user | mechanic)
 * @returns {Object} { data, pagination }
 */
const searchServiceRequests = async (filters, userId, role) => {
  const { page, limit, offset } = getPagination(filters);

  const {
    status,
    category_id,
    startDate,
    endDate,
    keyword,
    sort_by = 'created_at',
    sort_order = 'DESC',
  } = filters;

  const conditions = [];
  const values = [];
  let paramIndex = 1;

  // ── Role-based access control ──
  if (role === 'user') {
    conditions.push(`sr.user_id = $${paramIndex++}`);
    values.push(userId);
  } else if (role === 'mechanic') {
    conditions.push(`sr.mechanic_id = $${paramIndex++}`);
    values.push(userId);
  }
  // admin — no ownership filter

  // ── Status filter (single or array) ──
  if (status) {
    const statusArr = Array.isArray(status)
      ? status
      : status.split(',').map((s) => s.trim());

    if (statusArr.length === 1) {
      conditions.push(`sr.status = $${paramIndex++}`);
      values.push(statusArr[0]);
    } else {
      const placeholders = statusArr.map(() => `$${paramIndex++}`);
      conditions.push(`sr.status IN (${placeholders.join(', ')})`);
      values.push(...statusArr);
    }
  }

  // ── Category filter ──
  if (category_id) {
    conditions.push(`sr.category_id = $${paramIndex++}`);
    values.push(category_id);
  }

  // ── Date range ──
  if (startDate) {
    conditions.push(`sr.created_at >= $${paramIndex++}`);
    values.push(startDate);
  }
  if (endDate) {
    conditions.push(`sr.created_at <= $${paramIndex++}`);
    values.push(endDate);
  }

  // ── Keyword search (address or description) ──
  if (keyword) {
    conditions.push(
      `(sr.breakdown_address ILIKE $${paramIndex} OR sr.description ILIKE $${paramIndex})`
    );
    values.push(`%${keyword}%`);
    paramIndex++;
  }

  // ── Build WHERE clause ──
  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // ── Sorting ──
  const allowedSorts = {
    created_at: 'sr.created_at',
    status: 'sr.status',
  };
  const sortColumn = allowedSorts[sort_by] || 'sr.created_at';
  const order = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const orderClause = `ORDER BY ${sortColumn} ${order}`;

  // ── Count query ──
  const countSQL = `
    SELECT COUNT(*)::integer AS total
    FROM service_requests sr
    ${whereClause}`;

  const countResult = await query(countSQL, values);
  const total = countResult.rows[0].total;

  // ── Data query ──
  const dataSQL = `
    SELECT
      sr.*,
      v.make AS vehicle_make,
      v.model AS vehicle_model,
      v.year AS vehicle_year,
      v.license_plate AS vehicle_license_plate,
      sc.name AS category_name,
      sc.slug AS category_slug,
      sc.icon AS category_icon,
      sc.base_price AS category_base_price,
      u.full_name AS user_name,
      u.phone AS user_phone,
      m.full_name AS mechanic_name,
      m.phone AS mechanic_phone
    FROM service_requests sr
    JOIN vehicles v ON v.id = sr.vehicle_id
    JOIN service_categories sc ON sc.id = sr.category_id
    JOIN users u ON u.id = sr.user_id
    LEFT JOIN users m ON m.id = sr.mechanic_id
    ${whereClause}
    ${orderClause}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

  values.push(limit, offset);

  const dataResult = await query(dataSQL, values);

  return formatPaginatedResponse(dataResult.rows, total, page, limit);
};

// ============================================
// SEARCH USERS (ADMIN ONLY)
// ============================================

/**
 * Search users — admin-only endpoint.
 *
 * Filters:
 *   keyword    — ILIKE on full_name, email, or phone
 *   role       — exact match (user | mechanic | admin)
 *   is_active  — boolean filter
 *   startDate  — created_at >= value (registration date)
 *   endDate    — created_at <= value
 *   sort_by    — created_at | full_name (default: created_at)
 *   sort_order — ASC | DESC (default: DESC)
 *   page, limit— pagination
 *
 * @param {Object} filters - Query parameters
 * @returns {Object} { data, pagination }
 */
const searchUsers = async (filters) => {
  const { page, limit, offset } = getPagination(filters);

  const {
    keyword,
    role,
    is_active,
    startDate,
    endDate,
    sort_by = 'created_at',
    sort_order = 'DESC',
  } = filters;

  const conditions = [];
  const values = [];
  let paramIndex = 1;

  // ── Keyword search (name, email, phone) ──
  if (keyword) {
    conditions.push(
      `(u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.phone ILIKE $${paramIndex})`
    );
    values.push(`%${keyword}%`);
    paramIndex++;
  }

  // ── Role filter ──
  if (role) {
    conditions.push(`u.role = $${paramIndex++}`);
    values.push(role);
  }

  // ── Active status filter ──
  if (is_active !== undefined && is_active !== '') {
    const boolVal = is_active === 'true' || is_active === true;
    conditions.push(`u.is_active = $${paramIndex++}`);
    values.push(boolVal);
  }

  // ── Registration date range ──
  if (startDate) {
    conditions.push(`u.created_at >= $${paramIndex++}`);
    values.push(startDate);
  }
  if (endDate) {
    conditions.push(`u.created_at <= $${paramIndex++}`);
    values.push(endDate);
  }

  // ── Build WHERE clause ──
  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // ── Sorting ──
  const allowedSorts = {
    created_at: 'u.created_at',
    full_name: 'u.full_name',
  };
  const sortColumn = allowedSorts[sort_by] || 'u.created_at';
  const order = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const orderClause = `ORDER BY ${sortColumn} ${order}`;

  // ── Count query ──
  const countSQL = `
    SELECT COUNT(*)::integer AS total
    FROM users u
    ${whereClause}`;

  const countResult = await query(countSQL, values);
  const total = countResult.rows[0].total;

  // ── Data query (exclude password_hash) ──
  const dataSQL = `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.phone,
      u.role,
      u.profile_picture,
      u.is_active,
      u.created_at,
      u.updated_at
    FROM users u
    ${whereClause}
    ${orderClause}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

  values.push(limit, offset);

  const dataResult = await query(dataSQL, values);

  return formatPaginatedResponse(dataResult.rows, total, page, limit);
};

module.exports = {
  searchMechanics,
  searchServiceRequests,
  searchUsers,
};
