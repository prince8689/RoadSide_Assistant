// ============================================
// STANDARD API RESPONSE HELPERS
// ============================================
// Enforces a consistent JSON response format
// across every endpoint in the application.
//
// Response shapes:
//   Success:   { success: true,  message, data, timestamp }
//   Error:     { success: false, message, errors, timestamp }
//   Paginated: { success: true,  message, data, pagination, timestamp }

/**
 * Standard success response.
 *
 * @param {Response} res - Express response object
 * @param {*} data - Response payload (object, array, or null)
 * @param {string} [message='Success'] - Human-readable message
 * @param {number} [statusCode=200] - HTTP status code
 * @returns {Response}
 *
 * @example
 *   success(res, { user }, 'Profile fetched successfully');
 *   success(res, { vehicle }, 'Vehicle added successfully', 201);
 */
const success = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Standard error response.
 *
 * @param {Response} res - Express response object
 * @param {string} [message='Something went wrong'] - Error description
 * @param {number} [statusCode=500] - HTTP status code
 * @param {*} [errors=null] - Optional validation errors array
 * @returns {Response}
 *
 * @example
 *   error(res, 'User not found', 404);
 *   error(res, 'Validation failed', 400, validationErrors);
 */
const error = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Standard paginated response.
 *
 * @param {Response} res - Express response object
 * @param {Array} data - Paginated result rows
 * @param {Object} pagination - { total, page, limit, totalPages, hasNext, hasPrev }
 * @param {string} [message='Success'] - Human-readable message
 * @returns {Response}
 *
 * @example
 *   paginated(res, users, { total: 100, page: 1, limit: 10, ... }, 'Users fetched');
 */
const paginated = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination,
    timestamp: new Date().toISOString(),
  });
};

module.exports = { success, error, paginated };
