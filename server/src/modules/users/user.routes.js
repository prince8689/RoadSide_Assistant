// ============================================
// USER MODULE — ROUTES
// ============================================
// All user profile and vehicle management routes.
// Base path: /api/users
//
// ALL routes are protected — require JWT access token.
// Vehicle routes include ownership verification in the service layer.
//
// Profile:
//   GET    /api/users/profile              — Get my profile
//   PATCH  /api/users/profile              — Update my profile
//
// Vehicles:
//   GET    /api/users/vehicles             — Get all my vehicles
//   POST   /api/users/vehicles             — Add new vehicle
//   GET    /api/users/vehicles/:id         — Get single vehicle
//   PATCH  /api/users/vehicles/:id         — Update vehicle
//   DELETE /api/users/vehicles/:id         — Delete vehicle

const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const {
  updateProfileSchema,
  addVehicleSchema,
  updateVehicleSchema,
} = require('./user.validation');

// ---- All routes require authentication ----
router.use(authenticate);

// ---- Profile Routes ----
router.get('/profile', userController.getProfile);
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile);

// ---- Vehicle Routes ----
router.get('/vehicles', userController.getMyVehicles);
router.post('/vehicles', validate(addVehicleSchema), userController.addVehicle);
router.get('/vehicles/:id', userController.getSingleVehicle);
router.patch('/vehicles/:id', validate(updateVehicleSchema), userController.updateVehicle);
router.delete('/vehicles/:id', userController.deleteVehicle);

module.exports = router;
