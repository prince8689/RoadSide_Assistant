// ============================================
// REVIEWS MODULE — CONTROLLER
// ============================================

const reviewService = require('./review.service');
const { AppError } = require('../../middleware/errorHandler');
const { query } = require('../../config/db');
const { success, paginated } = require('../../utils/apiResponse');

/**
 * POST /api/reviews
 * Submit a review after completed job.
 */
const createReview = async (req, res, next) => {
  try {
    const review = await reviewService.createReview(req.user.id, req.body);

    return success(res, { review }, 'Review submitted successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reviews/mechanic/:mechanicId
 * Get all reviews for a mechanic.
 */
const getMechanicReviews = async (req, res, next) => {
  try {
    const result = await reviewService.getMechanicReviews(req.params.mechanicId, req.query);

    return paginated(
      res,
      { reviews: result.reviews, summary: result.summary },
      result.pagination,
      'Mechanic reviews fetched successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reviews/my
 * Get all reviews submitted by logged in user.
 */
const getMyReviews = async (req, res, next) => {
  try {
    const reviews = await reviewService.getUserReviews(req.user.id);

    return success(res, {
      reviews,
      count: reviews.length,
    }, 'User reviews fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/reviews/:id
 * Update own review.
 */
const updateReview = async (req, res, next) => {
  try {
    const review = await reviewService.updateReview(req.params.id, req.user.id, req.body);

    return success(res, { review }, 'Review updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/reviews/:id
 * Delete own review.
 */
const deleteReview = async (req, res, next) => {
  try {
    await reviewService.deleteReview(req.params.id, req.user.id);

    return success(res, null, 'Review deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reviews/can-review/:requestId
 * Check if user can review a request.
 */
const checkCanReview = async (req, res, next) => {
  try {
    const requestId = req.params.requestId;
    const userId = req.user.id;

    // Check request exists and get status
    const result = await query(
      'SELECT id, status, user_id FROM service_requests WHERE id = $1',
      [requestId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Service request not found', 404);
    }

    const request = result.rows[0];

    if (request.user_id !== userId) {
      return success(res, {
        can_review: false,
        reason: 'You can only review your own requests',
      });
    }

    if (request.status !== 'completed') {
      return success(res, {
        can_review: false,
        reason: 'Request not completed',
      });
    }

    const alreadyReviewed = await reviewService.checkReviewExists(requestId, userId);

    if (alreadyReviewed) {
      return success(res, {
        can_review: false,
        reason: 'Already reviewed',
      });
    }

    return success(res, {
      can_review: true,
      reason: 'Can review',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getMechanicReviews,
  getMyReviews,
  updateReview,
  deleteReview,
  checkCanReview,
};
