// ============================================
// TRACKING MODULE — ROUTES
// ============================================

const express = require('express');
const router = express.Router();

const trackingController = require('./tracking.controller');
const { verifyToken } = require('../../middleware/auth');

// Require authentication for all tracking routes
router.use(verifyToken);

// GET /api/tracking/:mechanicId/location - Get last known location
router.get('/:mechanicId/location', trackingController.getLastLocation);

// GET /api/tracking/:mechanicId/status - Get online/offline status
router.get('/:mechanicId/status', trackingController.getMechanicStatus);

module.exports = router;
