// ============================================
// SERVICE CATEGORIES MODULE — ROUTES
// ============================================
// Public routes for browsing available service categories.
// No authentication required — these are visible to everyone.
// Base path: /api/services
//
// Routes:
//   GET /api/services       — Get all active service categories
//   GET /api/services/:id   — Get single category by ID

const express = require('express');
const router = express.Router();
const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');
const { success } = require('../../utils/apiResponse');

// ============================================
// GET ALL ACTIVE SERVICE CATEGORIES
// GET /api/services
// ============================================
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, slug, icon, base_price, description
       FROM service_categories
       WHERE is_active = true
       ORDER BY name ASC`,
      []
    );

    return success(res, {
      categories: result.rows,
      count: result.rows.length,
    }, 'Service categories fetched successfully');
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET SINGLE SERVICE CATEGORY
// GET /api/services/:id
// ============================================
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, slug, icon, base_price, description, is_active, created_at
       FROM service_categories
       WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Service category not found', 404);
    }

    return success(res, { category: result.rows[0] }, 'Service category fetched successfully');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
