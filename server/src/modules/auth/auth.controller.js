// ============================================
// AUTH MODULE — CONTROLLER
// ============================================
// Thin layer: handles HTTP req/res only.
// All business logic is in auth.service.js.
// Every method uses async/await with try/catch,
// errors forwarded to global error handler via next().

const authService = require('./auth.service');
const { success } = require('../../utils/apiResponse');

/**
 * POST /api/auth/send-otp
 * Send OTP for registration to verify email.
 *
 * Body: { full_name, email, phone }
 * Returns: 200 + success message
 */
const sendOtp = async (req, res, next) => {
  try {
    const result = await authService.sendRegistrationOtp(req.body);
    return success(res, null, result.message, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/register
 * Register a new user or mechanic.
 * Admin accounts can only be created directly in the database.
 *
 * Body: { full_name, email, phone, password, role, otp }
 * Returns: 201 + { user, accessToken, refreshToken }
 */
const register = async (req, res, next) => {
  try {
    const result = await authService.registerUser(req.body);

    return success(res, {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }, 'Registration successful', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Login with email and password.
 *
 * Body: { email, password }
 * Returns: 200 + { user, accessToken, refreshToken }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);

    return success(res, {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Get current authenticated user's profile.
 * Requires: Bearer token in Authorization header.
 *
 * Returns: 200 + { user } (without password)
 */
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.id);

    return success(res, { user }, 'User profile fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Logout — revoke refresh token from Redis.
 * Requires: Bearer token in Authorization header.
 *
 * Returns: 200 + success message
 */
const logout = async (req, res, next) => {
  try {
    await authService.revokeRefreshToken(req.user.id);

    return success(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 * Refresh access token using a valid refresh token.
 *
 * Body: { refreshToken }
 * Returns: 200 + { accessToken, user }
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    const result = await authService.refreshAccessToken(token);

    return success(res, {
      accessToken: result.accessToken,
      user: result.user,
    }, 'Token refreshed successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendOtp,
  register,
  login,
  getMe,
  logout,
  refreshToken,
};
