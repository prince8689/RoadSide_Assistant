// ============================================
// AUTH MODULE — VALIDATION SCHEMAS (Joi)
// ============================================
// Defines strict validation rules for auth endpoints.
// Each schema maps to a specific route.
//
// Password policy:
//   - Minimum 8 characters
//   - At least 1 uppercase letter
//   - At least 1 number
//   - At least 1 special character

const Joi = require('joi');

// ---- Custom password pattern ----
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const passwordMessage =
  'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character (@$!%*?&)';

// ---- Custom phone pattern (10 digits) ----
const phonePattern = /^[6-9]\d{9}$/;
const phoneMessage = 'Phone must be a valid 10-digit Indian mobile number starting with 6-9';

// ============================================
// REGISTER SCHEMA
// POST /api/auth/register
// ============================================
const registerSchema = Joi.object({
  full_name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Full name is required',
      'string.min': 'Full name must be at least 2 characters',
      'string.max': 'Full name cannot exceed 100 characters',
      'any.required': 'Full name is required',
    }),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required',
    }),

  phone: Joi.string()
    .trim()
    .pattern(phonePattern)
    .required()
    .messages({
      'string.pattern.base': phoneMessage,
      'string.empty': 'Phone number is required',
      'any.required': 'Phone number is required',
    }),

  password: Joi.string()
    .pattern(passwordPattern)
    .required()
    .messages({
      'string.pattern.base': passwordMessage,
      'string.empty': 'Password is required',
      'any.required': 'Password is required',
    }),

  role: Joi.string()
    .valid('user', 'mechanic')
    .default('user')
    .messages({
      'any.only': 'Role must be either user or mechanic',
    }),
    
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.length': 'OTP must be exactly 6 digits',
      'string.pattern.base': 'OTP must only contain numbers',
      'string.empty': 'OTP is required',
      'any.required': 'OTP is required',
    }),
});

// ============================================
// SEND OTP SCHEMA
// POST /api/auth/send-otp
// ============================================
const sendOtpSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required',
    }),

  purpose: Joi.string()
    .valid('register', 'login')
    .default('register')
    .messages({
      'any.only': 'Purpose must be either register or login',
    }),

  // Optional fields — needed when purpose is "register"
  full_name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Full name must be at least 2 characters',
    }),

  phone: Joi.string()
    .trim()
    .pattern(phonePattern)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': phoneMessage,
    }),
});

// ============================================
// VERIFY OTP SCHEMA
// POST /api/auth/verify-otp
// ============================================
const verifyOtpSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required',
    }),

  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.length': 'OTP must be exactly 6 digits',
      'string.pattern.base': 'OTP must only contain numbers',
      'string.empty': 'OTP is required',
      'any.required': 'OTP is required',
    }),

  purpose: Joi.string()
    .valid('register', 'login')
    .default('register')
    .optional()
    .messages({
      'any.only': 'Purpose must be either register or login',
    }),
});

// ============================================
// LOGIN SCHEMA
// POST /api/auth/login
// ============================================
const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required',
    }),

  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required',
    }),
});

// ============================================
// REFRESH TOKEN SCHEMA
// POST /api/auth/refresh
// ============================================
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'string.empty': 'Refresh token is required',
      'any.required': 'Refresh token is required',
    }),
});

module.exports = {
  registerSchema,
  sendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  refreshTokenSchema,
};
