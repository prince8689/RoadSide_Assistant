// ============================================
// SEARCH MODULE — CONTROLLER
// ============================================
// Thin layer: handles HTTP req/res only.
// All business logic is in search.service.js.
// Uses standardized API response helpers.

const searchService = require('./search.service');
const { success, paginated } = require('../../utils/apiResponse');

// ============================================
// SEARCH MECHANICS
// ============================================

/**
 * GET /api/search/mechanics
 * Search verified mechanics with filters.
 *
 * Query params:
 *   keyword, specialization, min_rating, max_rating,
 *   is_available, lat, lng, radius,
 *   sort_by, sort_order, page, limit
 *
 * Returns: 200 + paginated mechanics list
 */
const searchMechanics = async (req, res, next) => {
  try {
    const result = await searchService.searchMechanics(req.query);

    return paginated(
      res,
      result.data,
      result.pagination,
      'Mechanics search results fetched successfully'
    );
  } catch (error) {
    next(error);
  }
};

// ============================================
// SEARCH SERVICE REQUESTS
// ============================================

/**
 * GET /api/search/requests
 * Search service requests with role-based access.
 *
 * Query params:
 *   status, category_id, startDate, endDate, keyword,
 *   sort_by, sort_order, page, limit
 *
 * Role-based:
 *   - admin:    searches all requests
 *   - user:     searches only own requests
 *   - mechanic: searches only assigned requests
 *
 * Returns: 200 + paginated requests list
 */
const searchRequests = async (req, res, next) => {
  try {
    const result = await searchService.searchServiceRequests(
      req.query,
      req.user.id,
      req.user.role
    );

    return paginated(
      res,
      result.data,
      result.pagination,
      'Requests search results fetched successfully'
    );
  } catch (error) {
    next(error);
  }
};

// ============================================
// SEARCH USERS (ADMIN ONLY)
// ============================================

/**
 * GET /api/search/users
 * Search all users — admin only.
 *
 * Query params:
 *   keyword, role, is_active, startDate, endDate,
 *   sort_by, sort_order, page, limit
 *
 * Returns: 200 + paginated users list
 */
const searchUsers = async (req, res, next) => {
  try {
    const result = await searchService.searchUsers(req.query);

    return paginated(
      res,
      result.data,
      result.pagination,
      'Users search results fetched successfully'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchMechanics,
  searchRequests,
  searchUsers,
};
