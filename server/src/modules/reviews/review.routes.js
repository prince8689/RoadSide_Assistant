// ============================================
// REVIEWS MODULE — ROUTES
// ============================================

const express = require('express');
const router = express.Router();
const reviewController = require('./review.controller');
const { authenticate, authorizeRoles } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const {
  createReviewSchema,
  updateReviewSchema,
} = require('./review.validation');

// ---- Public Route ----
router.get('/mechanic/:mechanicId', reviewController.getMechanicReviews);

// ---- All following routes require authentication ----
router.use(authenticate);

// ---- Submit Review (user only) ----
router.post(
  '/',
  authorizeRoles('user'),
  validate(createReviewSchema),
  reviewController.createReview
);

// ---- Get My Submitted Reviews (user only) ----
router.get(
  '/my',
  authorizeRoles('user'),
  reviewController.getMyReviews
);

// ---- Check if Can Review (user only) ----
router.get(
  '/can-review/:requestId',
  authorizeRoles('user'),
  reviewController.checkCanReview
);

// ---- Update Review (user only) ----
router.patch(
  '/:id',
  authorizeRoles('user'),
  validate(updateReviewSchema),
  reviewController.updateReview
);

// ---- Delete Review (user only) ----
router.delete(
  '/:id',
  authorizeRoles('user'),
  reviewController.deleteReview
);

module.exports = router;
