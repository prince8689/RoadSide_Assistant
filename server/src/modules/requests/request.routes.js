// ============================================
// SERVICE REQUEST MODULE — ROUTES
// ============================================
// All service request routes.
// Base path: /api/requests
//
// Route Protection:
//   - All routes require JWT authentication
//   - POST create → user role only
//   - GET available → mechanic role only
//   - PATCH cancel → user role only
//   - PATCH accept/status/reject → mechanic role only
//   - GET my requests / active / single / timeline → user or mechanic
//
// Routes (Day 6):
//   POST   /api/requests                 — Create service request (user only)
//   GET    /api/requests                 — Get my requests (user or mechanic)
//   GET    /api/requests/active          — Get active request (user or mechanic)
//   GET    /api/requests/available       — Get pending requests (mechanic only)
//   GET    /api/requests/:id             — Get single request (user, mechanic, or admin)
//   PATCH  /api/requests/:id/cancel      — Cancel request (user only)
//
// Routes (Day 7):
//   PATCH  /api/requests/:id/accept      — Mechanic accepts request (mechanic only)
//   PATCH  /api/requests/:id/status      — Update status step-by-step (mechanic only)
//   PATCH  /api/requests/:id/reject      — Mechanic rejects request (mechanic only)
//   GET    /api/requests/:id/timeline    — Get status timeline (user or mechanic)

const express = require('express');
const router = express.Router();
const requestController = require('./request.controller');
const { authenticate, authorizeRoles } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const {
  createRequestSchema,
  cancelRequestSchema,
  updateStatusSchema,
} = require('./request.validation');

// ---- All routes require authentication ----
router.use(authenticate);

// ---- Create Service Request (user only) ----
router.post(
  '/',
  authorizeRoles('user'),
  validate(createRequestSchema),
  requestController.createRequest
);

// ---- Get My Requests (user sees own, mechanic sees assigned) ----
router.get(
  '/',
  authorizeRoles('user', 'mechanic', 'admin'),
  requestController.getMyRequests
);

// ---- Get Active Request (user or mechanic) ----
router.get(
  '/active',
  authorizeRoles('user', 'mechanic'),
  requestController.getActiveRequest
);

// ---- Get Available Requests — Pending (mechanic only) ----
router.get(
  '/available',
  authorizeRoles('mechanic'),
  requestController.getAvailableRequests
);

// ---- Accept Request (mechanic only) ----
router.patch(
  '/:id/accept',
  authorizeRoles('mechanic'),
  requestController.acceptRequest
);

// ---- Update Status (mechanic only) ----
router.patch(
  '/:id/status',
  authorizeRoles('mechanic'),
  validate(updateStatusSchema),
  requestController.updateStatus
);

// ---- Reject Request (mechanic only) ----
router.patch(
  '/:id/reject',
  authorizeRoles('mechanic'),
  requestController.rejectRequest
);

// ---- Get Request Timeline (user or mechanic) ----
router.get(
  '/:id/timeline',
  authorizeRoles('user', 'mechanic', 'admin'),
  requestController.getTimeline
);

// ---- Cancel Request (user only) ----
router.patch(
  '/:id/cancel',
  authorizeRoles('user'),
  validate(cancelRequestSchema),
  requestController.cancelRequest
);

// ---- Get Single Request (any authenticated user with access) ----
// MUST be last — /:id is a catch-all param route
router.get(
  '/:id',
  authorizeRoles('user', 'mechanic', 'admin'),
  requestController.getRequestById
);

module.exports = router;

