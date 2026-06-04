// ============================================
// TRACKING MODULE — CONTROLLER
// ============================================

const trackingService = require('./tracking.service');

/**
 * Get mechanic's last known location.
 * @route GET /api/tracking/:mechanicId/location
 */
const getLastLocation = async (req, res, next) => {
  try {
    const { mechanicId } = req.params;
    const location = await trackingService.getLastKnownLocation(mechanicId);

    res.status(200).json({
      success: true,
      message: 'Mechanic location fetched successfully',
      data: location
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get mechanic's online/offline status.
 * @route GET /api/tracking/:mechanicId/status
 */
const getMechanicStatus = async (req, res, next) => {
  try {
    const { mechanicId } = req.params;
    const status = await trackingService.getMechanicOnlineStatus(mechanicId);

    res.status(200).json({
      success: true,
      message: 'Mechanic status fetched successfully',
      data: status
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLastLocation,
  getMechanicStatus
};
