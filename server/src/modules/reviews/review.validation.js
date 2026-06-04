// ============================================
// REVIEWS MODULE — VALIDATION SCHEMAS (Joi)
// ============================================
// Validation schemas for review creation and update.

const Joi = require('joi');

// ---- UUID v4 pattern ----
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ============================================
// CREATE REVIEW SCHEMA
// POST /api/reviews
// ============================================
const createReviewSchema = Joi.object({
  request_id: Joi.string()
    .trim()
    .pattern(uuidPattern)
    .required()
    .messages({
      'string.empty': 'Request ID is required',
      'string.pattern.base': 'Request ID must be a valid UUID',
      'any.required': 'Request ID is required',
    }),

  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.base': 'Rating must be a number',
      'number.integer': 'Rating must be a whole number',
      'number.min': 'Rating must be between 1 and 5',
      'number.max': 'Rating must be between 1 and 5',
      'any.required': 'Rating is required',
    }),

  comment: Joi.string()
    .trim()
    .max(500)
    .allow('', null)
    .messages({
      'string.max': 'Comment cannot exceed 500 characters',
    }),
});

// ============================================
// UPDATE REVIEW SCHEMA
// PATCH /api/reviews/:id
// ============================================
const updateReviewSchema = Joi.object({
  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .messages({
      'number.base': 'Rating must be a number',
      'number.integer': 'Rating must be a whole number',
      'number.min': 'Rating must be between 1 and 5',
      'number.max': 'Rating must be between 1 and 5',
    }),

  comment: Joi.string()
    .trim()
    .max(500)
    .allow('', null)
    .messages({
      'string.max': 'Comment cannot exceed 500 characters',
    }),
}).min(1).messages({
  'object.min': 'At least one field (rating or comment) is required to update',
});

module.exports = {
  createReviewSchema,
  updateReviewSchema,
};
