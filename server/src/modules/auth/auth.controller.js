// ============================================
// AUTH MODULE — CONTROLLER
// ============================================
// Thin layer: handles HTTP req/res only.
// All business logic is in auth.service.js.
// Every method uses async/await with try/catch,
// errors forwarded to global error handler via next().

const authService = require('./auth.service');
const { success } = require('../../utils/apiResponse');
const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

/**
 * GET /api/auth/check-email
 * Check if an email is already registered.
 *
 * Query: ?email=...
 * Returns: 200 + { success: true, data: { exists: boolean } }
 */
const checkEmail = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) {
      throw new AppError('Email is required', 400);
    }
    const result = await query('SELECT id FROM users WHERE email = $1', [email]);
    return success(res, { exists: result.rows.length > 0 }, 'Email check successful', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/send-otp
 * Send OTP for registration or login to verify email.
 *
 * Body: { email, purpose } or { full_name, email, phone } (legacy)
 * purpose: "register" | "login"
 *
 * For "register": checks email is NOT already registered
 * For "login": checks email IS already registered
 *
 * Returns: 200 + { success: true, message: "OTP sent to your email" }
 */
const sendOtp = async (req, res, next) => {
  try {
    const { email, purpose, full_name, phone } = req.body;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Please provide a valid email address', 400);
    }

    const otpPurpose = purpose || 'register';

    if (otpPurpose === 'register') {
      // For registration: check email is NOT already registered
      const emailCheck = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (emailCheck.rows.length > 0) {
        throw new AppError('Email is already registered', 409);
      }

      // Also check phone if provided
      if (phone) {
        const phoneCheck = await query('SELECT id FROM users WHERE phone = $1', [phone]);
        if (phoneCheck.rows.length > 0) {
          throw new AppError('Phone number is already registered', 409);
        }
      }
    } else if (otpPurpose === 'login' || otpPurpose === 'forgot-password') {
      // For login / forgot password: check email EXISTS in database
      const emailCheck = await query('SELECT id, full_name FROM users WHERE email = $1', [email]);
      if (emailCheck.rows.length === 0) {
        throw new AppError('No account found with this email', 404);
      }
    }

    // Generate and send OTP
    const result = await authService.generateAndSendOTP(email, full_name, otpPurpose);

    return success(res, null, result.message || 'OTP sent to your email', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-otp
 * Verify an OTP code.
 *
 * Body: { email, otp, purpose }
 * Returns: 200 + { success: true, message: "OTP verified" }
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new AppError('Email and OTP are required', 400);
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      throw new AppError('OTP must be exactly 6 digits', 400);
    }

    await authService.verifyOTP(email, otp, false);

    return success(res, null, 'OTP verified successfully', 200);
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

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

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
 * POST /api/auth/reset-password
 * Reset password using OTP
 *
 * Body: { email, otp, new_password }
 * Returns: 200 + { success: true, message: "Password reset successful" }
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, new_password } = req.body;

    if (!email || !otp || !new_password) {
      throw new AppError('Email, OTP, and new password are required', 400);
    }

    await authService.resetPasswordUser(email, otp, new_password);

    return success(res, null, 'Password reset successfully');
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

/**
 * PATCH /api/auth/change-password
 * Change current user password
 *
 * Body: { currentPassword, newPassword }
 * Returns: 200 + { success: true, message: "Password updated successfully" }
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePasswordUser(req.user.id, currentPassword, newPassword);
    return success(res, null, 'Password updated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkEmail,
  sendOtp,
  verifyOtp,
  register,
  login,
  getMe,
  logout,
  refreshToken,
  resetPassword,
  changePassword,
};
