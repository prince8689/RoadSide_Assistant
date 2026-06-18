// ============================================
// GLOBAL ERROR HANDLING MIDDLEWARE
// ============================================
// Centralized error handling for the entire application.
// Catches both operational errors (expected) and
// programming errors (bugs), returning consistent
// JSON error responses.
//
// Response format:
// {
//   "success": false,
//   "message": "error message here",
//   "stack": "only in development mode"
// }

const { logError } = require('../utils/logger');

/**
 * 404 Not Found Handler
 * Catches all requests that don't match any route.
 * Must be placed AFTER all route definitions.
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errors: null,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Global Error Handler
 * Express identifies this as an error handler because
 * it has 4 parameters (err, req, res, next).
 * Must be the LAST middleware registered.
 */
const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Log the error to error.log file
  logError(err, req);

  // Also log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.error(`  🔴 [${statusCode}] ${message} — ${req.method} ${req.originalUrl}`);
  }

  // ---- Handle specific error types ----

  // PostgreSQL unique constraint violation (duplicate email/phone)
  if (err.code === '23505') {
    statusCode = 409;
    // Extract the field name from PostgreSQL error detail
    const detail = err.detail || '';
    if (detail.includes('email')) {
      message = 'Email is already registered';
    } else if (detail.includes('phone')) {
      message = 'Phone number is already registered';
    } else {
      message = 'A record with this value already exists';
    }
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    console.error('[DB ERROR 23503]', err.table, err.constraint, err.detail);
    statusCode = 400;
    message = 'Referenced record does not exist';
  }

  // JSON parse error (malformed request body)
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON in request body';
  }

  // JWT errors (fallback — primary handling in auth.js middleware)
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
  }

  // Joi validation error (fallback — primary handling in validate.js)
  if (err.isJoi) {
    statusCode = 400;
    message = err.details.map((d) => d.message).join(', ');
  }

  // Send consistent JSON error response
  res.status(statusCode).json({
    success: false,
    message,
    errors: null,
    timestamp: new Date().toISOString(),
    // Include stack trace ONLY in development mode
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

/**
 * Custom Application Error class.
 * Use this to throw operational errors with specific status codes.
 *
 * @example
 *   throw new AppError('User not found', 404);
 *   throw new AppError('Email already registered', 409);
 *   throw new AppError('Invalid credentials', 401);
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Distinguish from programming errors

    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  notFoundHandler,
  errorHandler,
  AppError,
};
