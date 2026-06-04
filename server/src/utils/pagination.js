// ============================================
// PAGINATION HELPER UTILITY
// ============================================
// Reusable pagination logic for all list endpoints.
//
// Usage:
//   const { offset, limit, page } = getPagination(req.query);
//   const result = await query('... LIMIT $1 OFFSET $2', [limit, offset]);
//   const response = formatPaginatedResponse(result.rows, total, page, limit);

/**
 * Parse and validate pagination parameters from query string.
 *
 * @param {Object} query - Express req.query object
 * @param {number} [defaultLimit=10] - Default items per page
 * @param {number} [maxLimit=100] - Maximum items per page
 * @returns {Object} { page, limit, offset }
 *
 * @example
 *   const { page, limit, offset } = getPagination(req.query);
 *   // page=1, limit=10, offset=0 (defaults)
 *   // page=3, limit=20, offset=40
 */
const getPagination = (queryParams, defaultLimit = 10, maxLimit = 100) => {
  let page = parseInt(queryParams.page) || 1;
  let limit = parseInt(queryParams.limit) || defaultLimit;

  // Enforce boundaries
  if (page < 1) page = 1;
  if (limit < 1) limit = 1;
  if (limit > maxLimit) limit = maxLimit;

  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

/**
 * Format a paginated API response with metadata.
 *
 * @param {Array} data - Array of results
 * @param {number} total - Total count from COUNT(*) query
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {Object} Formatted response with pagination metadata
 *
 * @example
 *   formatPaginatedResponse(users, 100, 1, 10)
 *   // Returns: {
 *   //   data: [...],
 *   //   pagination: { total: 100, page: 1, limit: 10, totalPages: 10, hasNext: true, hasPrev: false }
 *   // }
 */
const formatPaginatedResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

module.exports = {
  getPagination,
  formatPaginatedResponse,
};
