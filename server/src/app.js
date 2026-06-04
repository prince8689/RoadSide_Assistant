// ============================================
// ROADSIDE ASSIST — EXPRESS APPLICATION ENTRY
// ============================================

require('dotenv').config();

// ---- Validate environment variables BEFORE anything else ----
const { validate: validateEnv } = require('./config/env');
validateEnv();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import configurations
const { connectDB, pool } = require('./config/db');
const { connectRedis, redisClient } = require('./config/redis');

// Import logger
const { accessLogger, consoleLogger, logError, logger } = require('./utils/logger');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const {
  authLimiter,
  searchLimiter,
  generalLimiter,
} = require('./middleware/rateLimiter');

// Import route modules
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const mechanicRoutes = require('./modules/mechanics/mechanic.routes');
const requestRoutes = require('./modules/requests/request.routes');
const serviceRoutes = require('./modules/services/service.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const reviewRoutes = require('./modules/reviews/review.routes');
const historyRoutes = require('./modules/history/history.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const searchRoutes = require('./modules/search/search.routes');

// ---- Initialize Express App ----
const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// GLOBAL MIDDLEWARE STACK
// ============================================

// 1. Helmet — Sets various HTTP headers for security
//    Protects against XSS, clickjacking, MIME sniffing, etc.
app.use(helmet());

// 2. CORS — Cross-Origin Resource Sharing
//    Allows the React frontend (port 3000) to talk to this API (port 5000)
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 3. Logging — Access logs to file + dev console output
app.use(accessLogger);
if (process.env.NODE_ENV !== 'production') {
  app.use(consoleLogger);
}

// 4. Body Parsers — Parse incoming JSON and URL-encoded request bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================

app.get('/api/health', async (req, res) => {
  try {
    // Check PostgreSQL connection
    const dbResult = await pool.query('SELECT NOW()');
    const dbStatus = dbResult.rows.length > 0 ? 'connected' : 'disconnected';

    // Check Redis connection
    let redisStatus = 'disconnected';
    try {
      const redisPing = await redisClient.ping();
      redisStatus = redisPing === 'PONG' ? 'connected' : 'disconnected';
    } catch (redisErr) {
      redisStatus = 'disconnected';
    }

    res.status(200).json({
      success: true,
      message: '🚗 Roadside Assist API is running!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        server: 'running',
        database: dbStatus,
        redis: redisStatus,
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Service health check failed',
      timestamp: new Date().toISOString(),
      services: {
        server: 'running',
        database: 'disconnected',
        redis: 'unknown',
      },
    });
  }
});

// ============================================
// API ROUTES (with route-specific rate limiting)
// ============================================

// Auth routes — strict rate limit (10 req / 15 min)
app.use('/api/auth', authLimiter, authRoutes);

// Search routes — moderate rate limit (30 req / min)
app.use('/api/search', searchLimiter, searchRoutes);

// General API routes — standard rate limit (100 req / min)
app.use('/api/users', generalLimiter, userRoutes);
app.use('/api/mechanics', generalLimiter, mechanicRoutes);
app.use('/api/requests', generalLimiter, requestRoutes);
app.use('/api/services', generalLimiter, serviceRoutes);
app.use('/api/admin', generalLimiter, adminRoutes);
app.use('/api/reviews', generalLimiter, reviewRoutes);
app.use('/api/history', generalLimiter, historyRoutes);
app.use('/api/notifications', generalLimiter, notificationRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 — Catch unmatched routes
app.use(notFoundHandler);

// Global error handler — Must be last middleware
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

const startServer = async () => {
  try {
    // 1. Connect to PostgreSQL
    await connectDB();

    // 2. Connect to Redis
    await connectRedis();

    // 3. Start Express server
    app.listen(PORT, () => {
      logger.info('══════════════════════════════════════════');
      logger.info('🚗  ROADSIDE ASSIST API SERVER');
      logger.info('══════════════════════════════════════════');
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API Base: http://localhost:${PORT}/api`);
      logger.info(`Health Check: http://localhost:${PORT}/api/health`);
      logger.info('══════════════════════════════════════════');
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
