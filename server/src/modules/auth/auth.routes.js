// ============================================
// AUTH MODULE — ROUTES
// ============================================
// All authentication and authorization routes.
// Base path: /api/auth
//
// Public routes:
//   POST /api/auth/register  — Register new user/mechanic
//   POST /api/auth/login     — Login with email + password
//   POST /api/auth/refresh   — Refresh access token
//
// Protected routes (requires Bearer token):
//   GET  /api/auth/me        — Get current user profile
//   POST /api/auth/logout    — Logout (revoke refresh token)

const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { registerSchema, loginSchema, refreshTokenSchema } = require('./auth.validation');

// ---- Public Routes (no authentication required) ----

// Register — validates body with registerSchema before hitting controller
router.post('/register', validate(registerSchema), authController.register);

// Login — validates body with loginSchema before hitting controller
router.post('/login', validate(loginSchema), authController.login);

// Refresh Token — validates body with refreshTokenSchema
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

// ---- Protected Routes (JWT required) ----

// Get current user — requires valid access token
router.get('/me', authenticate, authController.getMe);

// Logout — requires valid access token, revokes refresh token in Redis
router.post('/logout', authenticate, authController.logout);

module.exports = router;
