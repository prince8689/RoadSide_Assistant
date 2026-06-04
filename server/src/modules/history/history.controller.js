// ============================================
// HISTORY MODULE — CONTROLLER
// ============================================

const historyService = require('./history.service');
const { success, paginated } = require('../../utils/apiResponse');

/**
 * GET /api/history
 * Get service history (works for both user and mechanic).
 */
const getMyHistory = async (req, res, next) => {
  try {
    let result;
    if (req.user.role === 'mechanic') {
      result = await historyService.getMechanicJobHistory(req.user.id, req.query);
    } else {
      result = await historyService.getUserServiceHistory(req.user.id, req.query);
    }

    return paginated(res, result.data, result.pagination, 'Service history fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/history/summary
 * Get summary stats (user or mechanic).
 */
const getMySummary = async (req, res, next) => {
  try {
    const stats = await historyService.getServiceSummary(req.user.id, req.user.role);

    return success(res, stats, 'Service summary fetched successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyHistory,
  getMySummary,
};
