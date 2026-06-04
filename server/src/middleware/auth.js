// ============================================
// JWT AUTHENTICATION MIDDLEWARE
// ============================================
// Two middleware functions:
//   1. verifyToken  — Extracts + verifies JWT from Authorization header
//   2. authorizeRoles — Checks user role against allowed roles
//
// Usage:
//   router.get('/profile', verifyToken, controller);
//   router.get('/admin', verifyToken, authorizeRoles('admin'), controller);
//   router.get('/staff', verifyToken, authorizeRoles('admin', 'mechanic'), controller);

const jwt = require('jsonwebtoken');

/**
 * Middleware: Verify JWT access token.
 *
 * 1. Extracts Bearer token from Authorization header
 * 2. Verifies token signature and expiry with JWT_SECRET
 * 3. Attaches decoded payload { id, email, role } to req.user
 *
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
const authenticate = (req, res, next) => {
  try {
    // 1. Check Authorization header exists
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // 2. Extract token (remove "Bearer " prefix)
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // 3. Verify token with JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Attach decoded user payload to req.user
    req.user = decoded;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Authentication failed.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
    });
  }
};

/**
 * Middleware Factory: Role-based access control.
 * Must be used AFTER authenticate/verifyToken middleware.
 *
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'mechanic', 'user')
 * @returns {Function} Express middleware
 *
 * @example
 *   // Single role
 *   router.get('/admin', authenticate, authorizeRoles('admin'), controller);
 *
 *   // Multiple roles
 *   router.get('/staff', authenticate, authorizeRoles('admin', 'mechanic'), controller);
 *
 *   // All authenticated users (no role check)
 *   router.get('/profile', authenticate, controller);
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Ensure user is authenticated first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before authorization.',
      });
    }

    // Check if user's role is in the allowed list
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}.`,
      });
    }

    next();
  };
};

// Export both names for backward compatibility
module.exports = {
  authenticate,
  verifyToken: authenticate,       // Alias
  authorizeRoles,
  authorize: authorizeRoles,       // Alias (used in Day 1-2 code)
};
