// ============================================
// SERVICE REQUEST MODULE — VALIDATION SCHEMAS (Joi)
// ============================================
// Defines strict validation rules for service
// request creation and cancellation endpoints.
//
// Schemas:
//   createRequestSchema  — POST /api/requests
//   cancelRequestSchema  — PATCH /api/requests/:id/cancel

const Joi = require('joi');

// ---- UUID v4 pattern ----
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ============================================
// CREATE SERVICE REQUEST SCHEMA
// POST /api/requests
// ============================================
const createRequestSchema = Joi.object({
  vehicle_id: Joi.string()
    .trim()
    .pattern(uuidPattern)
    .required()
    .messages({
      'string.empty': 'Vehicle ID is required',
      'string.pattern.base': 'Vehicle ID must be a valid UUID',
      'any.required': 'Vehicle ID is required',
    }),

  category_id: Joi.string()
    .trim()
    .pattern(uuidPattern)
    .required()
    .messages({
      'string.empty': 'Service category ID is required',
      'string.pattern.base': 'Category ID must be a valid UUID',
      'any.required': 'Service category ID is required',
    }),

  mechanic_id: Joi.string()
    .trim()
    .pattern(uuidPattern)
    .required()
    .messages({
      'string.empty': 'Mechanic ID is required',
      'string.pattern.base': 'Mechanic ID must be a valid UUID',
      'any.required': 'Mechanic ID is required',
    }),

  breakdown_lat: Joi.number()
    .min(-90)
    .max(90)
    .required()
    .messages({
      'number.base': 'Breakdown latitude must be a number',
      'number.min': 'Latitude must be between -90 and 90',
      'number.max': 'Latitude must be between -90 and 90',
      'any.required': 'Breakdown latitude is required',
    }),

  breakdown_lng: Joi.number()
    .min(-180)
    .max(180)
    .required()
    .messages({
      'number.base': 'Breakdown longitude must be a number',
      'number.min': 'Longitude must be between -180 and 180',
      'number.max': 'Longitude must be between -180 and 180',
      'any.required': 'Breakdown longitude is required',
    }),

  breakdown_address: Joi.string()
    .trim()
    .min(5)
    .max(500)
    .required()
    .messages({
      'string.empty': 'Breakdown address is required',
      'string.min': 'Breakdown address must be at least 5 characters',
      'string.max': 'Breakdown address cannot exceed 500 characters',
      'any.required': 'Breakdown address is required',
    }),

  description: Joi.string()
    .trim()
    .max(500)
    .allow('', null)
    .messages({
      'string.max': 'Description cannot exceed 500 characters',
    }),

  shareLocation: Joi.boolean().default(true),
  sharePhone: Joi.boolean().default(false),
});

// ============================================
// CANCEL REQUEST SCHEMA
// PATCH /api/requests/:id/cancel
// ============================================
const cancelRequestSchema = Joi.object({
  cancel_reason: Joi.string()
    .trim()
    .min(5)
    .max(500)
    .required()
    .messages({
      'string.empty': 'Cancel reason is required',
      'string.min': 'Cancel reason must be at least 5 characters',
      'string.max': 'Cancel reason cannot exceed 500 characters',
      'any.required': 'Cancel reason is required',
    }),
});

// ============================================
// UPDATE STATUS SCHEMA
// PATCH /api/requests/:id/status
// ============================================
const updateStatusSchema = Joi.object({
  status: Joi.string()
    .trim()
    .valid('en_route', 'arrived', 'in_progress', 'completed')
    .required()
    .messages({
      'string.empty': 'Status is required',
      'any.only': 'Status must be one of: en_route, arrived, in_progress, completed',
      'any.required': 'Status is required',
    }),
});

module.exports = {
  createRequestSchema,
  cancelRequestSchema,
  updateStatusSchema,
};
