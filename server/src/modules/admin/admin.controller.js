// ============================================
// ADMIN MODULE — CONTROLLER
// ============================================
// Thin layer: handles HTTP req/res only.
// All business logic is in admin.service.js.
// Every method uses async/await with try/catch,
// errors forwarded to global error handler via next().

const adminService = require('./admin.service');
const { success, error: errorResponse, paginated } = require('../../utils/apiResponse');

// ============================================
// DASHBOARD
// ============================================

/**
 * GET /api/admin/dashboard
 * Get comprehensive dashboard statistics.
 *
 * Returns: 200 + stats object
 */
const getDashboard = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();

    // Inject live stats
    const { getConnectedUsers } = require('../../socket/socketManager');
    stats.online_users = getConnectedUsers();

    const { redisClient } = require('../../config/redis');
    if (redisClient) {
      try {
        const keys = await redisClient.keys('user:online:*');
        let onlineMechanics = 0;
        for (const key of keys) {
          const data = await redisClient.get(key);
          if (data && JSON.parse(data).role === 'mechanic') onlineMechanics++;
        }
        stats.onlineMechanics = onlineMechanics;
      } catch (e) {
        // ignore redis errors silently for dashboard stats
      }
    }

    return success(res, { stats }, 'Dashboard stats fetched successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * GET /api/admin/users?role=...&is_active=...&search=...&page=...&limit=...
 * Get all users with filters and pagination.
 *
 * Returns: 200 + paginated users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const result = await adminService.getAllUsers(req.query);

    return paginated(res, result.data, result.pagination, 'Users fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/users/:id
 * Get full details of a single user.
 *
 * Returns: 200 + user with role-specific details
 */
const getUserDetails = async (req, res, next) => {
  try {
    const user = await adminService.getUserDetails(req.params.id);

    return success(res, { user }, 'User details fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/users/:id/status
 * Activate or deactivate a user account.
 *
 * Body: { is_active: boolean, reason?: string }
 * Returns: 200 + updated user
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const user = await adminService.updateUserStatus(
      req.params.id,
      req.body.is_active,
      req.user.id // admin's own ID to prevent self-deactivation
    );

    const action = user.is_active ? 'activated' : 'deactivated';

    return success(res, { user }, `User ${action} successfully`);
  } catch (error) {
    next(error);
  }
};

// ============================================
// MECHANIC VERIFICATION
// ============================================

/**
 * GET /api/admin/mechanics/pending
 * Get all mechanics pending verification.
 *
 * Returns: 200 + array of unverified mechanics
 */
const getPendingMechanics = async (req, res, next) => {
  try {
    const mechanics = await adminService.getPendingMechanics();

    return success(res, {
      mechanics,
      count: mechanics.length,
    }, 'Pending mechanics fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/mechanics/:id/verify
 * Verify or reject a mechanic.
 *
 * Body: { is_verified: boolean, rejection_reason?: string }
 * Returns: 200 + updated mechanic profile
 */
const verifyMechanic = async (req, res, next) => {
  try {
    const profile = await adminService.verifyMechanic(
      req.params.id,
      req.body.is_verified,
      req.body.rejection_reason
    );

    const action = req.body.is_verified ? 'verified' : 'rejected';

    return success(res, {
      profile,
      ...(req.body.rejection_reason && { reason: req.body.rejection_reason }),
    }, `Mechanic ${action} successfully`);
  } catch (error) {
    next(error);
  }
};

// ============================================
// SERVICE REQUESTS (ADMIN VIEW)
// ============================================

/**
 * GET /api/admin/requests?status=...&category_id=...&page=...&limit=...
 * Get all service requests with filters and pagination.
 *
 * Returns: 200 + paginated requests
 */
const getAllRequests = async (req, res, next) => {
  try {
    const result = await adminService.getAllRequests(req.query);

    return paginated(res, result.data, result.pagination, 'Requests fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/requests/:id
 * Get full details of a single request (no access restrictions for admin).
 *
 * Returns: 200 + full request details
 */
const getRequestDetails = async (req, res, next) => {
  try {
    const request = await adminService.getRequestDetails(req.params.id);

    return success(res, { request }, 'Request details fetched successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================
// SERVICE CATEGORIES
// ============================================

/**
 * GET /api/admin/categories
 * Get all categories including inactive ones.
 *
 * Returns: 200 + array of all categories
 */
const getAllCategories = async (req, res, next) => {
  try {
    const categories = await adminService.getAllCategories();

    return success(res, {
      categories,
      count: categories.length,
    }, 'Categories fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/categories
 * Create a new service category.
 *
 * Body: { name, slug, icon?, base_price, description? }
 * Returns: 201 + created category
 */
const createCategory = async (req, res, next) => {
  try {
    const category = await adminService.createCategory(req.body);

    return success(res, { category }, 'Category created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/categories/:id
 * Update a service category.
 *
 * Body: { name?, base_price?, is_active?, description?, icon? }
 * Returns: 200 + updated category
 */
const updateCategory = async (req, res, next) => {
  try {
    const category = await adminService.updateCategory(req.params.id, req.body);

    return success(res, { category }, 'Category updated successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================
// REPORTS
// ============================================

/**
 * GET /api/admin/reports/requests?startDate=...&endDate=...
 * Get requests report for a date range.
 *
 * Returns: 200 + report with status breakdown, category breakdown, top mechanics
 */
const getRequestsReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return errorResponse(
        res,
        'startDate and endDate query parameters are required (format: YYYY-MM-DD)',
        400
      );
    }

    const report = await adminService.getRequestsReport(startDate, endDate);

    return success(res, {
      report,
      period: { startDate, endDate },
    }, 'Requests report generated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/reports/mechanics
 * Get mechanic performance report.
 *
 * Returns: 200 + mechanics sorted by total_jobs with performance metrics
 */
const getMechanicPerformance = async (req, res, next) => {
  try {
    const mechanics = await adminService.getMechanicPerformance();

    return success(res, {
      mechanics,
      count: mechanics.length,
    }, 'Mechanic performance report generated successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================
// SETTINGS
// ============================================

/**
 * GET /api/admin/settings
 * Get admin settings.
 *
 * Returns: 200 + settings object
 */
const getSettings = async (req, res, next) => {
  try {
    const settings = await adminService.getSettings();
    return success(res, { settings }, 'Settings fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/settings
 * Update admin settings.
 *
 * Body: { platform_fee_value?, tax_percentage? }
 * Returns: 200 + updated settings
 */
const updateSettings = async (req, res, next) => {
  try {
    const settings = await adminService.updateSettings(req.body);
    return success(res, { settings }, 'Settings updated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getAllUsers,
  getUserDetails,
  updateUserStatus,
  getPendingMechanics,
  verifyMechanic,
  getAllRequests,
  getRequestDetails,
  getAllCategories,
  createCategory,
  updateCategory,
  getRequestsReport,
  getMechanicPerformance,
  getSettings,
  updateSettings,
};
