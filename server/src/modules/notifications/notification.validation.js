// ============================================
// NOTIFICATIONS MODULE — VALIDATION SCHEMAS (Joi)
// ============================================

const Joi = require('joi');

// ---- UUID v4 pattern ----
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ============================================
// MARK AS READ SCHEMA
// PATCH /api/notifications/mark-read
// ============================================
const markReadSchema = Joi.object({
  notification_ids: Joi.array()
    .items(Joi.string().pattern(uuidPattern).required())
    .min(1)
    .required()
    .messages({
      'array.base': 'notification_ids must be an array',
      'array.min': 'At least one notification ID is required',
      'string.pattern.base': 'Each notification ID must be a valid UUID',
      'any.required': 'notification_ids array is required',
    }),
});

// ============================================
// CREATE NOTIFICATION SCHEMA (Internal Use Only)
// Not directly used in routes, but good for service validation
// ============================================
const createNotificationSchema = Joi.object({
  user_id: Joi.string()
    .pattern(uuidPattern)
    .required(),

  title: Joi.string()
    .trim()
    .max(100)
    .required(),

  message: Joi.string()
    .trim()
    .max(500)
    .required(),

  type: Joi.string()
    .valid(
      'request_update',
      'new_request',
      'verification_update',
      'review_received',
      'account_update',
      'system'
    )
    .required(),
});

module.exports = {
  markReadSchema,
  createNotificationSchema,
};
