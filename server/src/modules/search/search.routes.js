// ============================================
// SEARCH MODULE — ROUTES
// ============================================
// All search and filter routes.
// Base path: /api/search
//
// Route Protection:
//   - Search mechanics: any authenticated user
//   - Search requests:  user or mechanic (role-filtered in service)
//   - Search users:     admin only
//
// Routes:
//   GET /api/search/mechanics  — Search mechanics with filters
//   GET /api/search/requests   — Search requests (role-based)
//   GET /api/search/users      — Search users (admin only)

const express = require('express');
const router = express.Router();
const searchController = require('./search.controller');
const { authenticate, authorizeRoles } = require('../../middleware/auth');

// ---- All routes require authentication ----
router.use(authenticate);

// ---- Search Mechanics (any authenticated user) ----
router.get(
  '/mechanics',
  searchController.searchMechanics
);

// ---- Search Requests (user or mechanic — access filtered in service) ----
router.get(
  '/requests',
  authorizeRoles('user', 'mechanic', 'admin'),
  searchController.searchRequests
);

// ---- Search Users (admin only) ----
router.get(
  '/users',
  authorizeRoles('admin'),
  searchController.searchUsers
);

module.exports = router;
