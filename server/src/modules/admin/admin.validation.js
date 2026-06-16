// ============================================
// ADMIN MODULE — VALIDATION SCHEMAS (Joi)
// ============================================
// Validation schemas for admin-only operations:
// mechanic verification, user status, category management.

const Joi = require('joi');

// ============================================
// VERIFY MECHANIC SCHEMA
// PATCH /api/admin/mechanics/:id/verify
// ============================================
const verifyMechanicSchema = Joi.object({
  is_verified: Joi.boolean()
    .required()
    .messages({
      'boolean.base': 'is_verified must be a boolean (true or false)',
      'any.required': 'is_verified field is required',
    }),

  rejection_reason: Joi.string()
    .trim()
    .min(5)
    .max(500)
    .when('is_verified', {
      is: false,
      then: Joi.required(),
      otherwise: Joi.optional().allow('', null),
    })
    .messages({
      'string.empty': 'Rejection reason is required when rejecting a mechanic',
      'string.min': 'Rejection reason must be at least 5 characters',
      'string.max': 'Rejection reason cannot exceed 500 characters',
      'any.required': 'Rejection reason is required when is_verified is false',
    }),
});

// ============================================
// UPDATE USER STATUS SCHEMA
// PATCH /api/admin/users/:id/status
// ============================================
const updateUserStatusSchema = Joi.object({
  is_active: Joi.boolean()
    .required()
    .messages({
      'boolean.base': 'is_active must be a boolean (true or false)',
      'any.required': 'is_active field is required',
    }),

  reason: Joi.string()
    .trim()
    .max(500)
    .allow('', null)
    .messages({
      'string.max': 'Reason cannot exceed 500 characters',
    }),
});

// ============================================
// CREATE CATEGORY SCHEMA
// POST /api/admin/categories
// ============================================
const createCategorySchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Category name is required',
      'string.min': 'Category name must be at least 2 characters',
      'string.max': 'Category name cannot exceed 100 characters',
      'any.required': 'Category name is required',
    }),

  slug: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .required()
    .messages({
      'string.empty': 'Slug is required',
      'string.pattern.base': 'Slug must be lowercase with hyphens only (e.g., "engine-repair")',
      'any.required': 'Slug is required',
    }),

  icon: Joi.string()
    .trim()
    .max(50)
    .allow('', null)
    .messages({
      'string.max': 'Icon name cannot exceed 50 characters',
    }),

  base_price: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Base price must be a number',
      'number.min': 'Base price cannot be negative',
      'any.required': 'Base price is required',
    }),

  description: Joi.string()
    .trim()
    .max(1000)
    .allow('', null)
    .messages({
      'string.max': 'Description cannot exceed 1000 characters',
    }),
});

// ============================================
// UPDATE CATEGORY SCHEMA
// PATCH /api/admin/categories/:id
// ============================================
const updateCategorySchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Category name must be at least 2 characters',
      'string.max': 'Category name cannot exceed 100 characters',
    }),

  base_price: Joi.number()
    .min(0)
    .messages({
      'number.base': 'Base price must be a number',
      'number.min': 'Base price cannot be negative',
    }),

  is_active: Joi.boolean()
    .messages({
      'boolean.base': 'is_active must be a boolean',
    }),

  description: Joi.string()
    .trim()
    .max(1000)
    .allow('', null)
    .messages({
      'string.max': 'Description cannot exceed 1000 characters',
    }),

  icon: Joi.string()
    .trim()
    .max(50)
    .allow('', null)
    .messages({
      'string.max': 'Icon name cannot exceed 50 characters',
    }),
}).min(1).messages({
  'object.min': 'At least one field is required to update',
});

// ============================================
// UPDATE ADMIN SETTINGS SCHEMA
// PATCH /api/admin/settings
// ============================================
const updateAdminSettingsSchema = Joi.object({
  platform_fee_value: Joi.number().min(0).messages({
    'number.base': 'Platform fee must be a number',
    'number.min': 'Platform fee cannot be negative',
  }),
  tax_percentage: Joi.number().min(0).max(100).messages({
    'number.base': 'Tax percentage must be a number',
    'number.min': 'Tax percentage cannot be negative',
    'number.max': 'Tax percentage cannot exceed 100',
  }),
}).min(1).messages({
  'object.min': 'At least one setting must be provided',
});

module.exports = {
  verifyMechanicSchema,
  updateUserStatusSchema,
  createCategorySchema,
  updateCategorySchema,
  updateAdminSettingsSchema,
};
