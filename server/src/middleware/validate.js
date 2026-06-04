// ============================================
// JOI VALIDATION MIDDLEWARE
// ============================================
// Generic middleware factory that validates req.body
// against any Joi schema. Returns clean error messages.
//
// Usage:
//   const { registerSchema } = require('./auth.validation');
//   router.post('/register', validate(registerSchema), controller);

/**
 * Middleware factory: Validates request body against a Joi schema.
 *
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware
 *
 * @example
 *   router.post('/register', validate(registerSchema), authController.register);
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,     // Return ALL errors, not just the first one
      stripUnknown: true,    // Remove fields not in the schema
      allowUnknown: false,   // Don't allow extra fields
    });

    if (error) {
      // Extract clean error messages from Joi details
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Replace req.body with sanitized/validated data
    req.body = value;
    next();
  };
};

module.exports = validate;
