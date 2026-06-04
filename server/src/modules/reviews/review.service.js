// ============================================
// REVIEWS MODULE — SERVICE (BUSINESS LOGIC)
// ============================================

const { query, pool } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');
const { getPagination, formatPaginatedResponse } = require('../../utils/pagination');
const { createNotification } = require('../notifications/notification.service');
const NotificationMessages = require('../../utils/notificationHelper');

/**
 * Recalculate and update the mechanic's average rating in mechanic_profiles.
 * 
 * @param {Object} client - Optional PostgreSQL client for transaction
 * @param {string} mechanicId - Mechanic's user UUID
 */
const updateMechanicRating = async (client, mechanicId) => {
  const db = client || { query };
  await db.query(
    `UPDATE mechanic_profiles
     SET rating = (
       SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
       FROM reviews
       WHERE mechanic_id = $1
     )
     WHERE user_id = $1`,
    [mechanicId]
  );
};

/**
 * Check if a user has already submitted a review for a specific request.
 * 
 * @param {string} requestId - Service request UUID
 * @param {string} userId - User UUID
 * @returns {boolean} True if review exists
 */
const checkReviewExists = async (requestId, userId) => {
  const result = await query(
    'SELECT id FROM reviews WHERE request_id = $1 AND reviewer_id = $2',
    [requestId, userId]
  );
  return result.rows.length > 0;
};

/**
 * Create a new review for a completed service request.
 * 
 * @param {string} userId - User UUID from JWT
 * @param {Object} data - { request_id, rating, comment }
 * @returns {Object} Created review
 */
const createReview = async (userId, data) => {
  const { request_id, rating, comment } = data;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check request exists and get details
    const requestCheck = await client.query(
      'SELECT id, user_id, mechanic_id, status FROM service_requests WHERE id = $1',
      [request_id]
    );

    if (requestCheck.rows.length === 0) {
      throw new AppError('Service request not found', 404);
    }

    const request = requestCheck.rows[0];

    // 2. Check if request is completed
    if (request.status !== 'completed') {
      throw new AppError('Can only review completed requests', 400);
    }

    // 3. Check if request belongs to user
    if (request.user_id !== userId) {
      throw new AppError('You can only review your own requests', 403);
    }

    // 4. Check if review already exists
    const reviewExists = await client.query(
      'SELECT id FROM reviews WHERE request_id = $1',
      [request_id]
    );

    if (reviewExists.rows.length > 0) {
      throw new AppError('Review already submitted for this request', 409);
    }

    // 5. Insert review
    const result = await client.query(
      `INSERT INTO reviews (request_id, reviewer_id, mechanic_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [request_id, userId, request.mechanic_id, rating, comment || null]
    );

    const review = result.rows[0];

    // 6. Recalculate mechanic rating
    await updateMechanicRating(client, request.mechanic_id);

    await client.query('COMMIT');
    
    // Send Notification to Mechanic
    const userQuery = await pool.query('SELECT full_name FROM users WHERE id = $1', [userId]);
    const userName = userQuery.rows[0]?.full_name || 'A user';
    const msg = NotificationMessages.REVIEW_RECEIVED(rating, userName);
    await createNotification(request.mechanic_id, msg.title, msg.message, msg.type);

    return review;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get a single review by ID.
 * 
 * @param {string} reviewId - Review UUID
 * @returns {Object} Full review details
 */
const getReviewById = async (reviewId) => {
  const result = await query(
    `SELECT
      r.*,
      u.full_name AS reviewer_name,
      m.full_name AS mechanic_name
    FROM reviews r
    JOIN users u ON u.id = r.reviewer_id
    JOIN users m ON m.id = r.mechanic_id
    WHERE r.id = $1`,
    [reviewId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Review not found', 404);
  }

  return result.rows[0];
};

/**
 * Get all reviews for a specific mechanic.
 * 
 * @param {string} mechanicId - Mechanic's user UUID
 * @param {Object} filters - Pagination parameters { page, limit }
 * @returns {Object} Reviews and summary
 */
const getMechanicReviews = async (mechanicId, filters) => {
  const { page, limit, offset } = getPagination(filters);

  // Check mechanic exists
  const mechanicCheck = await query(
    'SELECT user_id FROM mechanic_profiles WHERE user_id = $1',
    [mechanicId]
  );

  if (mechanicCheck.rows.length === 0) {
    throw new AppError('Mechanic not found', 404);
  }

  // Get total count
  const countResult = await query(
    'SELECT COUNT(*)::integer AS total FROM reviews WHERE mechanic_id = $1',
    [mechanicId]
  );
  const total = countResult.rows[0].total;

  // Get paginated reviews
  const reviewsResult = await query(
    `SELECT
      r.id, r.rating, r.comment, r.created_at,
      u.id AS reviewer_id,
      u.full_name AS reviewer_name,
      u.profile_picture AS reviewer_profile_picture
    FROM reviews r
    JOIN users u ON u.id = r.reviewer_id
    WHERE r.mechanic_id = $1
    ORDER BY r.created_at DESC
    LIMIT $2 OFFSET $3`,
    [mechanicId, limit, offset]
  );

  const paginatedResponse = formatPaginatedResponse(reviewsResult.rows, total, page, limit);

  // Get summary and breakdown
  const summaryResult = await query(
    `SELECT
      ROUND(AVG(rating)::numeric, 2) AS avg_rating,
      COUNT(*)::integer AS total_reviews,
      COUNT(CASE WHEN rating = 1 THEN 1 END)::integer AS count_1,
      COUNT(CASE WHEN rating = 2 THEN 1 END)::integer AS count_2,
      COUNT(CASE WHEN rating = 3 THEN 1 END)::integer AS count_3,
      COUNT(CASE WHEN rating = 4 THEN 1 END)::integer AS count_4,
      COUNT(CASE WHEN rating = 5 THEN 1 END)::integer AS count_5
    FROM reviews
    WHERE mechanic_id = $1`,
    [mechanicId]
  );

  const summaryData = summaryResult.rows[0];

  return {
    reviews: paginatedResponse.data,
    summary: {
      avg_rating: parseFloat(summaryData.avg_rating) || 0,
      total_reviews: summaryData.total_reviews,
      breakdown: {
        1: summaryData.count_1,
        2: summaryData.count_2,
        3: summaryData.count_3,
        4: summaryData.count_4,
        5: summaryData.count_5,
      },
    },
    pagination: paginatedResponse.pagination,
  };
};

/**
 * Get all reviews submitted by a specific user.
 * 
 * @param {string} userId - User UUID
 * @returns {Array} Array of user's reviews
 */
const getUserReviews = async (userId) => {
  const result = await query(
    `SELECT
      r.*,
      m.full_name AS mechanic_name,
      m.profile_picture AS mechanic_profile_picture,
      sc.name AS category_name
    FROM reviews r
    JOIN users m ON m.id = r.mechanic_id
    JOIN service_requests sr ON sr.id = r.request_id
    JOIN service_categories sc ON sc.id = sr.category_id
    WHERE r.reviewer_id = $1
    ORDER BY r.created_at DESC`,
    [userId]
  );

  return result.rows;
};

/**
 * Update a user's own review.
 * 
 * @param {string} reviewId - Review UUID
 * @param {string} userId - User UUID from JWT
 * @param {Object} data - { rating?, comment? }
 * @returns {Object} Updated review
 */
const updateReview = async (reviewId, userId, data) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check review exists and belongs to user
    const checkResult = await client.query(
      'SELECT id, reviewer_id, mechanic_id FROM reviews WHERE id = $1',
      [reviewId]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError('Review not found', 404);
    }

    const review = checkResult.rows[0];

    if (review.reviewer_id !== userId) {
      throw new AppError('Not authorized to update this review', 403);
    }

    // 2. Build update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (data.rating !== undefined) {
      updates.push(`rating = $${paramIndex++}`);
      values.push(data.rating);
    }

    if (data.comment !== undefined) {
      updates.push(`comment = $${paramIndex++}`);
      values.push(data.comment);
    }

    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    values.push(reviewId);

    // 3. Update review
    const updateResult = await client.query(
      `UPDATE reviews SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    // 4. Recalculate mechanic rating
    if (data.rating !== undefined) {
      await updateMechanicRating(client, review.mechanic_id);
    }

    await client.query('COMMIT');
    return updateResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Delete a user's own review.
 * 
 * @param {string} reviewId - Review UUID
 * @param {string} userId - User UUID from JWT
 */
const deleteReview = async (reviewId, userId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check review exists and belongs to user
    const checkResult = await client.query(
      'SELECT id, reviewer_id, mechanic_id FROM reviews WHERE id = $1',
      [reviewId]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError('Review not found', 404);
    }

    const review = checkResult.rows[0];

    if (review.reviewer_id !== userId) {
      throw new AppError('Not authorized to delete this review', 403);
    }

    // 2. Delete review
    await client.query(
      'DELETE FROM reviews WHERE id = $1',
      [reviewId]
    );

    // 3. Recalculate mechanic rating
    await updateMechanicRating(client, review.mechanic_id);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createReview,
  getReviewById,
  getMechanicReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  checkReviewExists,
};
