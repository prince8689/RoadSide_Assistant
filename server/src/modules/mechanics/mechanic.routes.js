// ============================================
// MECHANIC MODULE — ROUTES
// ============================================
// All mechanic profile, location, availability,
// and nearby search routes.
// Base path: /api/mechanics
//
// Route Protection:
//   - All routes require JWT authentication
//   - Profile/Location/Availability/Stats → mechanic role only
//   - Nearby mechanics → user role only
//   - Public profile → any authenticated user
//
// Routes:
//   POST   /api/mechanics/profile       — Create mechanic profile (mechanic only)
//   GET    /api/mechanics/profile       — Get my profile (mechanic only)
//   PATCH  /api/mechanics/profile       — Update profile (mechanic only)
//   PATCH  /api/mechanics/location      — Update live location (mechanic only)
//   PATCH  /api/mechanics/availability  — Toggle availability (mechanic only)
//   GET    /api/mechanics/nearby        — Get nearby mechanics (user only)
//   GET    /api/mechanics/stats         — Get my stats (mechanic only)
//   GET    /api/mechanics/:id           — Public profile (any authenticated user)

const express = require('express');
const router = express.Router();
const mechanicController = require('./mechanic.controller');
const { authenticate, authorizeRoles } = require('../../middleware/auth');
const { locationLimiter } = require('../../middleware/rateLimiter');
const validate = require('../../middleware/validate');
const {
  createProfileSchema,
  updateProfileSchema,
  updateLocationSchema,
  updateAvailabilitySchema,
} = require('./mechanic.validation');

// ---- All routes require authentication ----
router.use(authenticate);

// ---- Mechanic Profile Routes (mechanic role only) ----
router.post(
  '/profile',
  authorizeRoles('mechanic'),
  validate(createProfileSchema),
  mechanicController.createProfile
);

router.get(
  '/profile',
  authorizeRoles('mechanic'),
  mechanicController.getMyProfile
);

router.patch(
  '/profile',
  authorizeRoles('mechanic'),
  validate(updateProfileSchema),
  mechanicController.updateProfile
);

// ---- Location Route (mechanic role only, rate-limited: 60 req/min) ----
router.patch(
  '/location',
  authorizeRoles('mechanic'),
  locationLimiter,
  validate(updateLocationSchema),
  mechanicController.updateLocation
);

// ---- Availability Route (mechanic role only) ----
router.patch(
  '/availability',
  authorizeRoles('mechanic'),
  validate(updateAvailabilitySchema),
  mechanicController.updateAvailability
);

// ---- Nearby Mechanics Route (user role only) ----
router.get(
  '/nearby',
  authorizeRoles('user'),
  mechanicController.getNearbyMechanics
);

// ---- Mechanic Stats Route (mechanic role only) ----
router.get(
  '/stats',
  authorizeRoles('mechanic'),
  mechanicController.getMyStats
);

// ---- Public Profile Route (any authenticated user) ----
router.get(
  '/:id',
  mechanicController.getMechanicPublicProfile
);

module.exports = router;
