// ============================================
// AUTH MODULE — SERVICE (BUSINESS LOGIC)
// ============================================
// All authentication business logic lives here.
// This layer handles:
//   - Password hashing with bcryptjs (salt 12)
//   - JWT access token generation (7d)
//   - JWT refresh token generation (30d) stored in Redis
//   - Database queries for user CRUD
//   - Duplicate email/phone checks

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/db');
const { redisClient } = require('../../config/redis');
const { AppError } = require('../../middleware/errorHandler');
const { logger } = require('../../utils/logger');
const { emitDashboardUpdate } = require('../../utils/adminDashboardEmitter');
const { sendEmail, getOtpEmailTemplate } = require('../../utils/email');

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
 * Contains: id, email, role
 * Expires in: 7 days (configurable via .env)
 *
 * @param {Object} user - User object with id, email, role
 * @returns {string} JWT access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
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
// SEND OTP FOR REGISTRATION
// ============================================

/**
 * Generate and send an OTP to the user's email for registration.
 * Checks for existing email/phone before sending.
 * 
 * @param {Object} userData - { full_name, email, phone }
 */
const sendRegistrationOtp = async (userData) => {
  const { full_name, email, phone } = userData;

  // 1. Check if email already exists
  const emailCheck = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (emailCheck.rows.length > 0) {
    throw new AppError('Email is already registered', 409);
  }

  // 2. Check if phone already exists
  const phoneCheck = await query('SELECT id FROM users WHERE phone = $1', [phone]);
  if (phoneCheck.rows.length > 0) {
    throw new AppError('Phone number is already registered', 409);
  }

  // 3. Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 4. Save to Redis (expires in 5 minutes)
  await redisClient.set(`register_otp:${email}`, otp, 'EX', 300);

  // 5. Send Email
  const htmlTemplate = getOtpEmailTemplate(otp, full_name);
  const emailSent = await sendEmail({
    email,
    subject: 'Your RoadAssist Registration OTP',
    message: `Your verification code is: ${otp}. It is valid for 5 minutes.`,
    html: htmlTemplate
  });

  if (!emailSent) {
    throw new AppError('Failed to send verification email. Please try again.', 500);
  }

  return { message: 'OTP sent successfully to ' + email };
};

// ============================================
// REGISTER USER
// ============================================

/**
 * Register a new user.
 *
 * Steps:
 * 1. Check if email already exists → 409 Conflict
 * 2. Check if phone already exists → 409 Conflict
 * 3. Hash password with bcrypt (salt 12)
 * 4. Insert user into database
 * 5. Generate access + refresh tokens
 * 6. Return user data (without password) + tokens
 *
 * @param {Object} userData - { full_name, email, phone, password, role, otp }
 * @returns {Object} { user, accessToken, refreshToken }
 */
const registerUser = async (userData) => {
  const { full_name, email, phone, password, role, otp } = userData;

  if (!otp) {
    throw new AppError('OTP is required for registration', 400);
  }

  // 1. Verify OTP
  const storedOtp = await redisClient.get(`register_otp:${email}`);
  if (!storedOtp) {
    throw new AppError('OTP expired or not requested. Please request a new OTP.', 400);
  }
  if (storedOtp !== otp) {
    throw new AppError('Invalid OTP provided', 400);
  }

  // 2. Check if email already exists (double check just in case)
  const emailCheck = await query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  if (emailCheck.rows.length > 0) {
    throw new AppError('Email is already registered', 409);
  }

  // 3. Check if phone already exists
  const phoneCheck = await query(
    'SELECT id FROM users WHERE phone = $1',
    [phone]
  );
  if (phoneCheck.rows.length > 0) {
    throw new AppError('Phone number is already registered', 409);
  }

  // 4. Hash password with bcrypt
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const password_hash = await bcrypt.hash(password, salt);

  // 5. Insert user into database
  const result = await query(
    `INSERT INTO users (full_name, email, phone, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, full_name, email, phone, role, profile_picture, is_active, created_at`,
    [full_name, email, phone, password_hash, role || 'user']
  );

  const user = result.rows[0];

  // 4b. If mechanic, create mechanic profile
  if (user.role === 'mechanic') {
    await query(
      `INSERT INTO mechanic_profiles (user_id)
       VALUES ($1)`,
      [user.id]
    );
  }

  // 5. Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  // 6. Delete OTP from Redis
  await redisClient.del(`register_otp:${email}`);

  // Update Admin Dashboard
  emitDashboardUpdate();

  // 7. Return user + tokens (password NOT included — RETURNING clause excludes it)
  return {
    user,
    accessToken,
    refreshToken,
  };
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
 * @returns {Object} { user, accessToken, refreshToken }
 */
const loginUser = async (email, password) => {
  // 1. Find user by email
  const result = await query(
    `SELECT id, full_name, email, phone, password_hash, role, profile_picture, is_active, created_at
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
 * @returns {Object} User data without password
 */
const getUserById = async (id) => {
  const result = await query(
    `SELECT id, full_name, email, phone, role, profile_picture, is_active, created_at, updated_at
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
 * @returns {Object} { accessToken, user }
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

module.exports = {
  sendRegistrationOtp,
  registerUser,
  loginUser,
  getUserById,
  refreshAccessToken,
  revokeRefreshToken,
};
