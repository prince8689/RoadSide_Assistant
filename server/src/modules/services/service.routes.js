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

// ============================================
// CREATE CUSTOM SERVICE CATEGORY
// POST /api/services
// ============================================
router.post('/', async (req, res, next) => {
  try {
    const { name, base_price, icon } = req.body;
    
    if (!name) {
      throw new AppError('Service name is required', 400);
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const defaultIcon = icon || 'MdOutlineMiscellaneousServices';
    const defaultPrice = base_price || 0;

    const result = await query(
      `INSERT INTO service_categories (name, slug, icon, base_price, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, name, slug, icon, base_price`,
      [name, slug, defaultIcon, defaultPrice]
    );

    return success(res, { category: result.rows[0] }, 'Custom service created successfully', 201);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
