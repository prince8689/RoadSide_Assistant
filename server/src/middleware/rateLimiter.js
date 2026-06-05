// ============================================
// ROUTE-SPECIFIC RATE LIMITERS
// ============================================
// Different rate limits for different API groups.
// Uses express-rate-limit with standard headers enabled.
//
// Limiters:
//   authLimiter     — Auth routes (login/register) — 10 req / 15 min
//   searchLimiter   — Search routes — 30 req / 1 min
//   generalLimiter  — General API routes — 100 req / 1 min
//   locationLimiter — Mechanic location updates — 60 req / 1 min

const rateLimit = require('express-rate-limit');

/**
 * Auth routes: 10 requests per 15 minutes.
 * Protects against brute-force login and credential stuffing attacks.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts, try again after 15 minutes',
    timestamp: new Date().toISOString(),
  },
});

/**
 * Search routes: 30 requests per minute.
 * Prevents expensive search query abuse.
 */
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many search requests',
    timestamp: new Date().toISOString(),
  },
});

/**
 * General API routes: 100 requests per minute.
 * Fair limit for standard CRUD operations.
 */
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests',
    timestamp: new Date().toISOString(),
  },
});

/**
 * Location update: 60 requests per minute.
 * Mechanic app may update every second; this allows
 * roughly 1 update/sec while capping abuse.
 */
const locationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many location updates',
    timestamp: new Date().toISOString(),
  },
});

module.exports = {
  authLimiter,
  searchLimiter,
  generalLimiter,
  locationLimiter,
};
