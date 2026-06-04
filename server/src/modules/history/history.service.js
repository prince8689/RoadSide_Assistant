// ============================================
// HISTORY MODULE — SERVICE (BUSINESS LOGIC)
// ============================================

const { query } = require('../../config/db');
const { getPagination, formatPaginatedResponse } = require('../../utils/pagination');

/**
 * Get service history for a user (completed or cancelled requests).
 * 
 * @param {string} userId - User UUID
 * @param {Object} filters - Pagination and filtering parameters
 * @returns {Object} Paginated history
 */
const getUserServiceHistory = async (userId, filters) => {
  const { page, limit, offset } = getPagination(filters);
  const conditions = ['sr.user_id = $1', "sr.status IN ('completed', 'cancelled')"];
  const values = [userId];
  let paramIndex = 2;

  // Filter by status
  if (filters.status && ['completed', 'cancelled'].includes(filters.status)) {
    conditions.push(`sr.status = $${paramIndex++}`);
    values.push(filters.status);
  }

  // Filter by date range
  if (filters.startDate && filters.endDate) {
    conditions.push(`sr.created_at >= $${paramIndex++}::date AND sr.created_at < ($${paramIndex++}::date + INTERVAL '1 day')`);
    values.push(filters.startDate, filters.endDate);
  }

  // Filter by category
  if (filters.category) {
    conditions.push(`sc.slug = $${paramIndex++}`);
    values.push(filters.category);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*)::integer AS total 
     FROM service_requests sr
     JOIN service_categories sc ON sc.id = sr.category_id
     ${whereClause}`,
    values
  );
  const total = countResult.rows[0].total;

  // Get paginated history
  const historyResult = await query(
    `SELECT
      sr.id, sr.status, sr.breakdown_lat, sr.breakdown_lng, sr.breakdown_address,
      sr.estimated_price, sr.final_price, sr.created_at, sr.completed_at, sr.cancelled_at,
      v.make AS vehicle_make, v.model AS vehicle_model, v.license_plate AS vehicle_license_plate,
      sc.name AS category_name, sc.icon AS category_icon,
      m.id AS mechanic_id, m.full_name AS mechanic_name, m.profile_picture AS mechanic_profile_picture,
      r.id AS review_id, r.rating AS review_rating, r.comment AS review_comment
    FROM service_requests sr
    JOIN vehicles v ON v.id = sr.vehicle_id
    JOIN service_categories sc ON sc.id = sr.category_id
    LEFT JOIN users m ON m.id = sr.mechanic_id
    LEFT JOIN reviews r ON r.request_id = sr.id
    ${whereClause}
    ORDER BY sr.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, limit, offset]
  );

  return formatPaginatedResponse(historyResult.rows, total, page, limit);
};

/**
 * Get job history for a mechanic (completed or cancelled requests).
 * 
 * @param {string} mechanicId - Mechanic UUID
 * @param {Object} filters - Pagination and filtering parameters
 * @returns {Object} Paginated job history
 */
const getMechanicJobHistory = async (mechanicId, filters) => {
  const { page, limit, offset } = getPagination(filters);
  const conditions = ['sr.mechanic_id = $1', "sr.status IN ('completed', 'cancelled')"];
  const values = [mechanicId];
  let paramIndex = 2;

  // Filter by status
  if (filters.status && ['completed', 'cancelled'].includes(filters.status)) {
    conditions.push(`sr.status = $${paramIndex++}`);
    values.push(filters.status);
  }

  // Filter by date range
  if (filters.startDate && filters.endDate) {
    conditions.push(`sr.created_at >= $${paramIndex++}::date AND sr.created_at < ($${paramIndex++}::date + INTERVAL '1 day')`);
    values.push(filters.startDate, filters.endDate);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*)::integer AS total 
     FROM service_requests sr
     ${whereClause}`,
    values
  );
  const total = countResult.rows[0].total;

  // Get paginated history
  const historyResult = await query(
    `SELECT
      sr.id, sr.status, sr.breakdown_address, sr.estimated_price, sr.final_price,
      sr.created_at, sr.completed_at, sr.cancelled_at,
      u.id AS user_id, u.full_name AS user_name, u.profile_picture AS user_profile_picture,
      v.make AS vehicle_make, v.model AS vehicle_model,
      sc.name AS category_name, sc.icon AS category_icon,
      r.id AS review_id, r.rating AS review_rating, r.comment AS review_comment
    FROM service_requests sr
    JOIN users u ON u.id = sr.user_id
    JOIN vehicles v ON v.id = sr.vehicle_id
    JOIN service_categories sc ON sc.id = sr.category_id
    LEFT JOIN reviews r ON r.request_id = sr.id
    ${whereClause}
    ORDER BY sr.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, limit, offset]
  );

  return formatPaginatedResponse(historyResult.rows, total, page, limit);
};

/**
 * Get summary stats for user or mechanic history.
 * 
 * @param {string} userId - User or Mechanic UUID
 * @param {string} role - 'user' or 'mechanic'
 * @returns {Object} Summary stats object
 */
const getServiceSummary = async (userId, role) => {
  if (role === 'user') {
    const summaryResult = await query(
      `SELECT
        COUNT(*)::integer AS total_requests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::integer AS completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::integer AS cancelled,
        SUM(CASE WHEN status = 'completed' THEN final_price ELSE 0 END)::numeric AS total_amount_spent
      FROM service_requests
      WHERE user_id = $1`,
      [userId]
    );

    const mostUsedCategoryResult = await query(
      `SELECT sc.name
       FROM service_requests sr
       JOIN service_categories sc ON sc.id = sr.category_id
       WHERE sr.user_id = $1 AND sr.status = 'completed'
       GROUP BY sc.name
       ORDER BY COUNT(*) DESC
       LIMIT 1`,
      [userId]
    );

    return {
      total_requests: summaryResult.rows[0].total_requests,
      completed: summaryResult.rows[0].completed,
      cancelled: summaryResult.rows[0].cancelled,
      most_used_service: mostUsedCategoryResult.rows.length > 0 ? mostUsedCategoryResult.rows[0].name : null,
      total_amount_spent: parseFloat(summaryResult.rows[0].total_amount_spent) || 0,
    };
  } else if (role === 'mechanic') {
    const summaryResult = await query(
      `SELECT
        COUNT(*)::integer AS total_jobs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::integer AS completed_jobs,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::integer AS cancelled_jobs,
        SUM(CASE WHEN status = 'completed' THEN final_price ELSE 0 END)::numeric AS total_earnings
      FROM service_requests
      WHERE mechanic_id = $1`,
      [userId]
    );

    const ratingResult = await query(
      `SELECT ROUND(AVG(rating)::numeric, 2) AS avg_rating
       FROM reviews
       WHERE mechanic_id = $1`,
      [userId]
    );

    const bestMonthResult = await query(
      `SELECT TO_CHAR(completed_at, 'Month YYYY') AS best_month
       FROM service_requests
       WHERE mechanic_id = $1 AND status = 'completed'
       GROUP BY TO_CHAR(completed_at, 'Month YYYY')
       ORDER BY COUNT(*) DESC
       LIMIT 1`,
      [userId]
    );

    return {
      total_jobs: summaryResult.rows[0].total_jobs,
      completed_jobs: summaryResult.rows[0].completed_jobs,
      cancelled_jobs: summaryResult.rows[0].cancelled_jobs,
      avg_rating: parseFloat(ratingResult.rows[0].avg_rating) || 0,
      total_earnings: parseFloat(summaryResult.rows[0].total_earnings) || 0,
      best_month: bestMonthResult.rows.length > 0 ? bestMonthResult.rows[0].best_month.trim() : null,
    };
  }
};

module.exports = {
  getUserServiceHistory,
  getMechanicJobHistory,
  getServiceSummary,
};
