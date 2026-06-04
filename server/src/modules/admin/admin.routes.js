// ============================================
// ADMIN MODULE — ROUTES
// ============================================
// All admin panel routes. Requires admin role.
// Base path: /api/admin
//
// Every route uses:
//   authenticate (JWT verification)
//   authorizeRoles('admin') (admin-only access)
//
// Routes:
//   GET    /api/admin/dashboard                — Dashboard stats
//   GET    /api/admin/users                    — All users (paginated + filters)
//   GET    /api/admin/users/:id                — Single user details
//   PATCH  /api/admin/users/:id/status         — Activate/deactivate user
//   GET    /api/admin/mechanics/pending        — Unverified mechanics
//   PATCH  /api/admin/mechanics/:id/verify     — Verify or reject mechanic
//   GET    /api/admin/requests                 — All requests (paginated + filters)
//   GET    /api/admin/requests/:id             — Single request details
//   GET    /api/admin/categories               — All categories (including inactive)
//   POST   /api/admin/categories               — Create new category
//   PATCH  /api/admin/categories/:id           — Update category
//   GET    /api/admin/reports/requests          — Requests report (date range)
//   GET    /api/admin/reports/mechanics         — Mechanic performance report

const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authenticate, authorizeRoles } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const {
  verifyMechanicSchema,
  updateUserStatusSchema,
  createCategorySchema,
  updateCategorySchema,
} = require('./admin.validation');

// ---- All admin routes require authentication + admin role ----
router.use(authenticate);
router.use(authorizeRoles('admin'));

// ---- Dashboard ----
router.get('/dashboard', adminController.getDashboard);

// ---- User Management ----
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails);
router.patch(
  '/users/:id/status',
  validate(updateUserStatusSchema),
  adminController.updateUserStatus
);

// ---- Mechanic Verification ----
router.get('/mechanics/pending', adminController.getPendingMechanics);
router.patch(
  '/mechanics/:id/verify',
  validate(verifyMechanicSchema),
  adminController.verifyMechanic
);

// ---- Service Requests (Admin View) ----
router.get('/requests', adminController.getAllRequests);
router.get('/requests/:id', adminController.getRequestDetails);

// ---- Service Categories ----
router.get('/categories', adminController.getAllCategories);
router.post(
  '/categories',
  validate(createCategorySchema),
  adminController.createCategory
);
router.patch(
  '/categories/:id',
  validate(updateCategorySchema),
  adminController.updateCategory
);

// ---- Reports ----
router.get('/reports/requests', adminController.getRequestsReport);
router.get('/reports/mechanics', adminController.getMechanicPerformance);

module.exports = router;
