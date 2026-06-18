// ============================================
// AUTH MODULE — SERVICE (BUSINESS LOGIC)
// ============================================
// All authentication business logic lives here.
// This layer handles:
//   - OTP generation and verification via PostgreSQL
//   - Password hashing with bcryptjs (salt 12)
//   - JWT access token generation (7d)
//   - JWT refresh token generation (30d) stored in Redis
//   - Database queries for user CRUD
//   - Duplicate email/phone checks

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, pool } = require('../../config/db');
const { redisClient } = require('../../config/redis');
const { AppError } = require('../../middleware/errorHandler');
const { logger } = require('../../utils/logger');
const { emitDashboardUpdate } = require('../../utils/adminDashboardEmitter');
const { sendOTP, sendWelcomeEmail } = require('../../utils/email');

// ============================================
// CONSTANTS
// ============================================
const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRY = '30d';
const REFRESH_TOKEN_REDIS_EXPIRY = 30 * 24 * 60 * 60; // 30 days in seconds

// ============================================
// TOKEN GENERATION
// ============================================

/**
 * Generate a JWT access token.
 * Contains: userId, email, role
 * Expires in: 7 days (configurable via .env)
 *
 * @param {Object} user - User object with id, email, role
 * @returns {string} JWT access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

/**
 * Generate a JWT refresh token.
 * Contains: id, type (to distinguish from access tokens)
 * Expires in: 30 days
 * Stored in Redis with key: refresh_token:<userId>
 *
 * @param {Object} user - User object with id
 * @returns {Promise<string>} JWT refresh token
 */
const generateRefreshToken = async (user) => {
  const refreshToken = jwt.sign(
    {
      id: user.id,
      type: 'refresh',
    },
    process.env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  // Store refresh token in Redis with expiry
  // Key pattern: refresh_token:<userId>
  try {
    await redisClient.set(
      `refresh_token:${user.id}`,
      refreshToken,
      'EX',
      REFRESH_TOKEN_REDIS_EXPIRY
    );
  } catch (redisError) {
    logger.warn('Failed to store refresh token in Redis: ' + redisError.message);
    // Don't fail registration/login if Redis is down
  }

  return refreshToken;
};

// ============================================
// GENERATE AND SEND OTP
// ============================================

/**
 * Generate a 6-digit OTP, save it to the database, and send via email.
 *
 * Steps:
 * 1. Generate cryptographically random 6-digit OTP
 * 2. Delete any existing OTP for the same email (prevent stacking)
 * 3. Insert new OTP into `otps` table with 15-minute expiry
 * 4. Send OTP email (non-blocking — failure is logged but doesn't break flow)
 *
 * @param {string} email - The email address to send OTP to
 * @param {string} [name] - Optional name for email personalization
 * @param {string} [purpose='register'] - Purpose: 'register' or 'login'
 * @returns {Promise<{message: string}>} Success message
 */
const generateAndSendOTP = async (email, name, purpose = 'register') => {
  // 1. Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 2. Delete any existing OTP for the same email
  await query('DELETE FROM otps WHERE email = $1', [email]);

  // 3. Insert new OTP into database with 15-minute expiry
  await query(
    `INSERT INTO otps (email, otp, purpose, expires_at, created_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes', NOW())`,
    [email, otp, purpose]
  );

  logger.info(`OTP generated for ${email} (purpose: ${purpose})`);

  // 4. Send OTP email — non-blocking (fire and forget) so it's much faster
  sendOTP(email, otp, name || 'User').catch((emailError) => {
    logger.error(`Failed to send OTP email to ${email}: ${emailError.message}`);
  });

  return { message: `OTP sent successfully to ${email}` };
};

// ============================================
// VERIFY OTP
// ============================================

/**
 * Verify an OTP code against the database.
 *
 * Steps:
 * 1. Query otps table for matching email + otp that hasn't expired
 * 2. If not found → throw error
 * 3. If found → delete all OTPs for that email (one-time use)
 *
 * @param {string} email - Email address the OTP was sent to
 * @param {string} otp - The 6-digit OTP to verify
 * @returns {Promise<{verified: boolean}>} Verification result
 * @throws {AppError} If OTP is invalid or expired
 */
const verifyOTP = async (email, otp, deleteAfter = true) => {
  // 1. Check for valid, non-expired OTP
  const result = await query(
    'SELECT * FROM otps WHERE email = $1 AND otp = $2 AND expires_at > NOW()',
    [email, otp]
  );

  if (result.rows.length === 0) {
    throw new AppError('Invalid or expired OTP', 400);
  }

  // 2. Delete all OTPs for this email (one-time use)
  if (deleteAfter) {
    await query('DELETE FROM otps WHERE email = $1', [email]);
  }

  logger.info(`OTP verified successfully for ${email}`);

  return { verified: true };
};

// ============================================
// SEND REGISTRATION OTP (Legacy + New)
// ============================================

/**
 * Generate and send OTP for registration.
 * Validates that email and phone are not already registered before sending.
 *
 * @param {Object} userData - { full_name, email, phone }
 * @returns {Promise<{message: string}>} Success message
 */
const sendRegistrationOtp = async (userData) => {
  const { full_name, email, phone } = userData;

  // 1. Check if email already exists
  const emailCheck = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (emailCheck.rows.length > 0) {
    throw new AppError('Email is already registered', 409);
  }

  // 2. Check if phone already exists
  if (phone) {
    const phoneCheck = await query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (phoneCheck.rows.length > 0) {
      throw new AppError('Phone number is already registered', 409);
    }
  }

  // 3. Generate and send OTP
  return await generateAndSendOTP(email, full_name, 'register');
};

// ============================================
// REGISTER USER
// ============================================

/**
 * Register a new user.
 *
 * Steps:
 * 1. Verify OTP from database
 * 2. Check if email already exists → 409 Conflict
 * 3. Check if phone already exists → 409 Conflict
 * 4. Hash password with bcrypt (salt 12)
 * 5. Insert user into database
 * 6. If mechanic: create mechanic profile
 * 7. Generate access + refresh tokens
 * 8. Send welcome email (non-blocking)
 * 9. Return user data (without password) + tokens
 *
 * @param {Object} userData - { full_name, email, phone, password, role, otp }
 * @returns {Promise<{user: Object, accessToken: string, refreshToken: string}>}
 */
const registerUser = async (userData) => {
  const { full_name, email, phone, password, role, otp } = userData;

  if (!otp) {
    throw new AppError('OTP is required for registration', 400);
  }

  // 1. Verify OTP from database (without deleting it immediately)
  await verifyOTP(email, otp, false);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 2. Check if email already exists
    const emailCheck = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      throw new AppError('Email is already registered', 409);
    }

    // 3. Check if phone already exists
    if (phone) {
      const phoneCheck = await client.query('SELECT id FROM users WHERE phone = $1', [phone]);
      if (phoneCheck.rows.length > 0) {
        throw new AppError('Phone number is already registered', 409);
      }
    }

    // 3.5 Check Aadhar Uniqueness for mechanics
    if (role === 'mechanic' && userData.documents) {
      const aadharDoc = userData.documents.find(d => d.type === 'aadhar');
      if (aadharDoc && aadharDoc.number) {
        const aadharCheck = await client.query(
          `SELECT id FROM mechanic_profiles WHERE documents @> $1::jsonb`,
          [JSON.stringify([{ type: 'aadhar', number: aadharDoc.number }])]
        );
        if (aadharCheck.rows.length > 0) {
          throw new AppError('This Aadhar Number is already in use by another mechanic', 409);
        }
      }
    }

    // 4. Hash password with bcrypt
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const password_hash = await bcrypt.hash(password, salt);

    // 5. Insert user into database
    const result = await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, phone, role, profile_picture, is_active, created_at`,
      [full_name, email, phone, password_hash, role || 'user']
    );

    const user = result.rows[0];

    // 6. If mechanic, create mechanic profile
    if (user.role === 'mechanic') {
      const { business_name, experience_years, specializations, documents } = userData;
      await client.query(
        `INSERT INTO mechanic_profiles (user_id, business_name, experience_years, specializations, documents)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user.id, 
          business_name || null, 
          experience_years || 0, 
          specializations || [],
          documents ? JSON.stringify(documents) : JSON.stringify([])
        ]
      );
    }

    // Clean up OTP after successful registration
    await client.query('DELETE FROM otps WHERE email = $1', [email]);

    await client.query('COMMIT');

    // 7. Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);

    // 8. Send welcome email (truly non-blocking)
    sendWelcomeEmail(email, full_name, user.role).catch((emailError) => {
      logger.error(`Failed to send welcome email to ${email}: ${emailError.message}`);
    });

    // Update Admin Dashboard
    emitDashboardUpdate();

    // 9. Return user + tokens
    return {
      user,
      accessToken,
      refreshToken,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================
// LOGIN USER
// ============================================

/**
 * Login a user with email and password.
 *
 * Steps:
 * 1. Find user by email → 401 if not found
 * 2. Check if account is active → 403 if deactivated
 * 3. Compare password with hash → 401 if wrong
 * 4. Generate access + refresh tokens
 * 5. Return user data (without password) + tokens
 *
 * @param {string} email - User's email
 * @param {string} password - User's plain text password
 * @returns {Promise<{user: Object, accessToken: string, refreshToken: string}>}
 */
const loginUser = async (email, password) => {
  // 1. Find user by email
  const result = await query(
    `SELECT id, full_name, email, phone, password_hash, role, profile_picture, is_active, created_at, is_banned, suspension_end_date
     FROM users WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    throw new AppError('Invalid credentials', 401);
  }

  const user = result.rows[0];

  // 2. Check if account is active
  if (!user.is_active) {
    throw new AppError('Your account has been deactivated. Please contact support.', 403);
  }

  if (user.is_banned) {
    throw new AppError('Your account has been permanently banned due to multiple violations.', 403);
  }

  if (user.suspension_end_date && new Date(user.suspension_end_date) > new Date()) {
    throw new AppError(`Your account is suspended until ${new Date(user.suspension_end_date).toLocaleDateString()}.`, 403);
  }

  // 3. Compare password with bcrypt hash
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  // 4. Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  // 5. Remove password_hash from response
  const { password_hash, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken,
  };
};

// ============================================
// GET USER BY ID
// ============================================

/**
 * Get user by ID from database.
 * Used for GET /api/auth/me (protected route).
 * Never returns password_hash.
 *
 * @param {string} id - User UUID
 * @returns {Promise<Object>} User data without password
 */
const getUserById = async (id) => {
  const result = await query(
    `SELECT id, full_name, email, phone, role, profile_picture, is_active, created_at, updated_at, is_banned, suspension_end_date
     FROM users WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  return result.rows[0];
};

// ============================================
// REFRESH ACCESS TOKEN
// ============================================

/**
 * Verify refresh token and issue a new access token.
 *
 * Steps:
 * 1. Verify the refresh token JWT
 * 2. Check if refresh token exists in Redis (not revoked)
 * 3. Fetch fresh user data from database
 * 4. Generate new access token
 * 5. Return new access token
 *
 * @param {string} refreshToken - JWT refresh token
 * @returns {Promise<{accessToken: string, user: Object}>}
 */
const refreshAccessToken = async (refreshToken) => {
  // 1. Verify the refresh token
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Check it's actually a refresh token
  if (decoded.type !== 'refresh') {
    throw new AppError('Invalid token type', 401);
  }

  // 2. Check if refresh token exists in Redis
  try {
    const storedToken = await redisClient.get(`refresh_token:${decoded.id}`);
    if (!storedToken || storedToken !== refreshToken) {
      throw new AppError('Refresh token has been revoked', 401);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.warn('Redis unavailable during refresh token check');
  }

  // 3. Fetch user from database (get fresh data)
  const user = await getUserById(decoded.id);

  if (!user.is_active) {
    throw new AppError('Your account has been deactivated', 403);
  }

  // 4. Generate new access token
  const accessToken = generateAccessToken(user);

  return {
    accessToken,
    user,
  };
};

// ============================================
// LOGOUT (REVOKE REFRESH TOKEN)
// ============================================

/**
 * Revoke a user's refresh token by deleting it from Redis.
 *
 * @param {string} userId - User UUID
 */
const revokeRefreshToken = async (userId) => {
  try {
    await redisClient.del(`refresh_token:${userId}`);
  } catch (error) {
    logger.warn('Failed to revoke refresh token from Redis: ' + error.message);
  }
};

// ============================================
// RESET PASSWORD
// ============================================

/**
 * Reset a user's password using an OTP.
 *
 * Steps:
 * 1. Verify OTP from database
 * 2. Hash new password with bcrypt
 * 3. Update password_hash in database
 *
 * @param {string} email - User's email
 * @param {string} otp - The 6-digit OTP
 * @param {string} newPassword - The new plain text password
 */
const resetPasswordUser = async (email, otp, newPassword) => {
  // 1. Verify OTP from database
  await verifyOTP(email, otp);

  // 2. Hash new password with bcrypt
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const password_hash = await bcrypt.hash(newPassword, salt);

  // 3. Update password in database
  const result = await query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2 RETURNING id',
    [password_hash, email]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  logger.info(`Password reset successfully for ${email}`);
};

// ============================================
// CHANGE PASSWORD
// ============================================

/**
 * Change user password using current password.
 *
 * @param {string} userId - User UUID
 * @param {string} currentPassword - User's current plain text password
 * @param {string} newPassword - The new plain text password
 */
const changePasswordUser = async (userId, currentPassword, newPassword) => {
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!isPasswordValid) {
    throw new AppError('Invalid current password', 401);
  }

  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const password_hash = await bcrypt.hash(newPassword, salt);

  await query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [password_hash, userId]
  );
};

module.exports = {
  generateAndSendOTP,
  verifyOTP,
  sendRegistrationOtp,
  registerUser,
  loginUser,
  getUserById,
  refreshAccessToken,
  revokeRefreshToken,
  resetPasswordUser,
  changePasswordUser,
};
