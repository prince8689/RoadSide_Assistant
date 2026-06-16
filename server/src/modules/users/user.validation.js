// ============================================
// USER MODULE — VALIDATION SCHEMAS (Joi)
// ============================================
// Defines strict validation rules for user profile
// and vehicle management endpoints.

const Joi = require('joi');

// ---- Fuel type enum (must match DB enum) ----
const FUEL_TYPES = ['petrol', 'diesel', 'electric', 'hybrid', 'cng', 'lpg'];

// ---- Custom phone pattern (10 digits, Indian mobile) ----
const phonePattern = /^[6-9]\d{9}$/;
const phoneMessage = 'Phone must be a valid 10-digit Indian mobile number starting with 6-9';

// ============================================
// UPDATE PROFILE SCHEMA
// PATCH /api/users/profile
// ============================================
const updateProfileSchema = Joi.object({
  full_name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Full name must be at least 2 characters',
      'string.max': 'Full name cannot exceed 100 characters',
    }),

  phone: Joi.string()
    .trim()
    .pattern(phonePattern)
    .messages({
      'string.pattern.base': phoneMessage,
    }),

  address: Joi.string()
    .trim()
    .max(500)
    .optional(),
}).min(1).messages({
  'object.min': 'At least one field (full_name or phone) is required to update',
});

// ============================================
// ADD VEHICLE SCHEMA
// POST /api/users/vehicles
// ============================================
const addVehicleSchema = Joi.object({
  make: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Vehicle make is required (e.g., Toyota, Honda)',
      'string.max': 'Vehicle make cannot exceed 50 characters',
      'any.required': 'Vehicle make is required',
    }),

  model: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Vehicle model is required (e.g., Corolla, Civic)',
      'string.max': 'Vehicle model cannot exceed 50 characters',
      'any.required': 'Vehicle model is required',
    }),

  year: Joi.number()
    .integer()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .required()
    .messages({
      'number.base': 'Year must be a number',
      'number.min': 'Year must be 1900 or later',
      'number.max': `Year cannot be later than ${new Date().getFullYear() + 1}`,
      'any.required': 'Vehicle year is required',
    }),

  license_plate: Joi.string()
    .trim()
    .uppercase()
    .min(4)
    .max(20)
    .required()
    .messages({
      'string.empty': 'License plate is required',
      'string.min': 'License plate must be at least 4 characters',
      'string.max': 'License plate cannot exceed 20 characters',
      'any.required': 'License plate is required',
    }),

  fuel_type: Joi.string()
    .valid(...FUEL_TYPES)
    .default('petrol')
    .messages({
      'any.only': `Fuel type must be one of: ${FUEL_TYPES.join(', ')}`,
    }),

  color: Joi.string()
    .trim()
    .max(30)
    .allow('', null)
    .messages({
      'string.max': 'Color cannot exceed 30 characters',
    }),

  vehicle_type: Joi.string()
    .trim()
    .max(50)
    .default('car')
    .optional(),

  is_default: Joi.boolean().default(false).optional(),
  
  image_url: Joi.string().trim().max(255).allow('', null).optional(),
  chassis_number: Joi.string().trim().max(100).allow('', null).optional(),
  engine_number: Joi.string().trim().max(100).allow('', null).optional(),
  insurance_expiry_date: Joi.date().allow('', null).optional(),
  nickname: Joi.string().trim().max(100).allow('', null).optional(),
});

// ============================================
// UPDATE VEHICLE SCHEMA
// PATCH /api/users/vehicles/:id
// ============================================
const updateVehicleSchema = Joi.object({
  make: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .messages({
      'string.empty': 'Vehicle make cannot be empty',
      'string.max': 'Vehicle make cannot exceed 50 characters',
    }),

  model: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .messages({
      'string.empty': 'Vehicle model cannot be empty',
      'string.max': 'Vehicle model cannot exceed 50 characters',
    }),

  year: Joi.number()
    .integer()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .messages({
      'number.base': 'Year must be a number',
      'number.min': 'Year must be 1900 or later',
      'number.max': `Year cannot be later than ${new Date().getFullYear() + 1}`,
    }),

  license_plate: Joi.string()
    .trim()
    .uppercase()
    .min(4)
    .max(20)
    .messages({
      'string.empty': 'License plate cannot be empty',
      'string.min': 'License plate must be at least 4 characters',
      'string.max': 'License plate cannot exceed 20 characters',
    }),

  fuel_type: Joi.string()
    .valid(...FUEL_TYPES)
    .messages({
      'any.only': `Fuel type must be one of: ${FUEL_TYPES.join(', ')}`,
    }),

  color: Joi.string()
    .trim()
    .max(30)
    .allow('', null)
    .messages({
      'string.max': 'Color cannot exceed 30 characters',
    }),

  vehicle_type: Joi.string()
    .trim()
    .max(50)
    .optional(),

  image_url: Joi.string().trim().max(255).allow('', null).optional(),
  chassis_number: Joi.string().trim().max(100).allow('', null).optional(),
  engine_number: Joi.string().trim().max(100).allow('', null).optional(),
  insurance_expiry_date: Joi.date().allow('', null).optional(),
  nickname: Joi.string().trim().max(100).allow('', null).optional(),
}).min(1).messages({
  'object.min': 'At least one field is required to update',
});

// ============================================
// EMERGENCY CONTACT SCHEMA
// ============================================
const emergencyContactSchema = Joi.object({
  contact_name: Joi.string().trim().max(100).required(),
  relationship: Joi.string().trim().max(50).optional(),
  phone: Joi.string().trim().pattern(phonePattern).required(),
});

// ============================================
// PREFERENCES SCHEMA
// ============================================
const preferencesSchema = Joi.object({
  request_updates: Joi.boolean().optional(),
  mechanic_alerts: Joi.boolean().optional(),
  service_completed: Joi.boolean().optional(),
  promotions: Joi.boolean().optional(),
}).min(1);

module.exports = {
  updateProfileSchema,
  addVehicleSchema,
  updateVehicleSchema,
  emergencyContactSchema,
  preferencesSchema,
};
