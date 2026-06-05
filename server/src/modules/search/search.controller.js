const searchService = require('./search.service');
const { success } = require('../../utils/apiResponse');
const { AppError } = require('../../middleware/errorHandler');
const { query } = require('../../config/db');

/**
 * GET /api/search/nearby
 * Find nearby mechanics based on lat, lng
 */
const getNearbyMechanics = async (req, res, next) => {
  try {
    let { lat, lng, radius, serviceType, minRating } = req.query;

    if (!lat || !lng) {
      throw new AppError('Latitude and longitude are required', 400);
    }

    lat = parseFloat(lat);
    lng = parseFloat(lng);
    radius = radius ? parseFloat(radius) : 10;

    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw new AppError('Invalid latitude. Must be between -90 and 90.', 400);
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      throw new AppError('Invalid longitude. Must be between -180 and 180.', 400);
    }

    const filters = { serviceType, minRating };
    const mechanics = await searchService.findNearbyMechanics(lat, lng, radius, filters);

    return success(res, {
      count: mechanics.length,
      mechanics,
      userLocation: { lat, lng }
    }, 'Nearby mechanics fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/search/mechanic/:id
 * Get details of a specific mechanic
 */
const getMechanicById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
      throw new AppError('Valid Mechanic ID is required', 400);
    }

    const mechanic = await searchService.getMechanicById(parseInt(id));
    return success(res, { mechanic }, 'Mechanic details fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/search/services
 * Get list of available services dynamically from DB
 */
const getAvailableServices = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT unnest(specializations) as name, COUNT(*) 
      FROM mechanic_profiles 
      WHERE is_available = true 
      GROUP BY name 
      ORDER BY count DESC
    `);

    // Map some common emojis to the services
    const iconMap = {
      'Engine Repair': '🔧',
      'Tyre Service': '🛞',
      'Battery': '🔋',
      'Electrical': '⚡',
      'AC Repair': '❄️',
      'Towing': '🚛',
      'Body Work': '🔨',
      'General Maintenance': '🔩'
    };

    const services = result.rows.map(row => ({
      name: row.name,
      count: parseInt(row.count),
      icon: iconMap[row.name] || '🛠️'
    }));

    // If none exist yet, provide defaults
    const finalServices = services.length > 0 ? services : [
      { name: 'Engine Repair', count: 0, icon: '🔧' },
      { name: 'Tyre Service', count: 0, icon: '🛞' },
      { name: 'Battery', count: 0, icon: '🔋' },
      { name: 'Towing', count: 0, icon: '🚛' }
    ];

    return success(res, { services: finalServices }, 'Available services fetched');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/search/update-location
 * Update user or mechanic location
 * Requires authentication
 */
const updateLocation = async (req, res, next) => {
  try {
    const { lat, lng, accuracy } = req.body;
    const user = req.user; // from auth middleware

    if (!lat || !lng) {
      throw new AppError('Latitude and longitude are required', 400);
    }

    if (user.role === 'mechanic') {
      // Find mechanic profile ID
      const mechRes = await query('SELECT id FROM mechanic_profiles WHERE user_id = $1', [user.id]);
      if (mechRes.rows.length === 0) throw new AppError('Mechanic profile not found', 404);
      
      const mechanicId = mechRes.rows[0].id;
      await searchService.updateMechanicLocation(mechanicId, parseFloat(lat), parseFloat(lng), accuracy || 0);
    } else {
      // Update regular user
      await searchService.updateUserLocation(user.id, parseFloat(lat), parseFloat(lng));
    }

    return success(res, null, 'Location updated');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNearbyMechanics,
  getMechanicById,
  getAvailableServices,
  updateLocation
};
