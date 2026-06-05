const express = require('express');
const router = express.Router();
const searchController = require('./search.controller');
const { authenticate } = require('../../middleware/auth');

// Public routes
router.get('/nearby', searchController.getNearbyMechanics);
router.get('/mechanic/:id', searchController.getMechanicById);
router.get('/services', searchController.getAvailableServices);

// Protected routes
router.post('/update-location', authenticate, searchController.updateLocation);

module.exports = router;
