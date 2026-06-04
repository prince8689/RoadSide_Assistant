// ============================================
// HISTORY MODULE — ROUTES
// ============================================

const express = require('express');
const router = express.Router();
const historyController = require('./history.controller');
const { authenticate, authorizeRoles } = require('../../middleware/auth');

// ---- All routes require authentication ----
router.use(authenticate);
router.use(authorizeRoles('user', 'mechanic'));

// ---- Get Summary Stats ----
// Must be defined before '/' so it doesn't get confused if '/' had params, though it doesn't here, it's good practice.
router.get('/summary', historyController.getMySummary);

// ---- Get Service History ----
router.get('/', historyController.getMyHistory);

module.exports = router;
