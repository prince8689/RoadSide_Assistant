// ============================================
// ROADSIDE ASSIST — EXPRESS APPLICATION ENTRY
// ============================================

require('dotenv').config();

// ---- Validate environment variables BEFORE anything else ----
const { validate: validateEnv } = require('./config/env');
validateEnv();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// Import configurations
const { connectDB, pool, runMigrations } = require('./config/db');
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
const searchRoutes = require('./modules/search/search.routes');
const userRoutes = require('./modules/users/user.routes');
const mechanicRoutes = require('./modules/mechanics/mechanic.routes');
const requestRoutes = require('./modules/requests/request.routes');
const serviceRoutes = require('./modules/services/service.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const reviewRoutes = require('./modules/reviews/review.routes');
const historyRoutes = require('./modules/history/history.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const trackingRoutes = require('./modules/tracking/tracking.routes');
const aiRoutes = require('./modules/ai/ai.routes');
const complaintRoutes = require('./modules/complaints/complaint.routes');
const billingRoutes = require('./modules/billing/billing.routes');

// Import auto cleanup job
const { startCleanupJob } = require('./utils/locationCleanup');

// ---- Initialize Express App ----
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const { initSocket } = require('./socket/socket');
initSocket(server);

const PORT = process.env.PORT || 5000;

// ============================================
// GLOBAL MIDDLEWARE STACK
// ============================================

// 1. Helmet — Sets various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// 2. CORS — Cross-Origin Resource Sharing
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.CLIENT_URL,
  process.env.CLIENT_URL_WWW,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 3. Logging — Access logs to file + dev console output
app.use(accessLogger);
if (process.env.NODE_ENV !== 'production') {
  app.use(consoleLogger);
}

// 4. Body Parsers — Parse incoming JSON and URL-encoded request bodies
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 4.5. Serve Static Files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// 5. Input Sanitization
// Removed mongoSanitize and xss-clean as they cause "Cannot set property query" in this Node/Express environment
// app.use(xss());

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

app.get('/api/health/socket', (req, res) => {
  try {
    const { getIO } = require('./socket/socket');
    const io = getIO();
    const connectedSockets = io.engine.clientsCount;
    const rooms = io.sockets.adapter.rooms.size;
    res.json({
      success: true,
      data: {
        connectedClients: connectedSockets,
        totalRooms: rooms,
        uptime: process.uptime(),
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
      }
    });
  } catch (error) {
    res.status(503).json({ success: false, message: 'Socket.io not initialized or unavailable' });
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
app.use('/api/tracking', generalLimiter, trackingRoutes);
app.use('/api/ai', generalLimiter, aiRoutes);
app.use('/api/complaints', generalLimiter, complaintRoutes);
app.use('/api/billing', generalLimiter, billingRoutes);

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

    // 1b. Run Database Migrations
    await runMigrations();

    // 2. Connect to Redis
    await connectRedis();

    // 3. Setup Error Handling for Server
    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        logger.error(`❌ CRITICAL: Port ${PORT} is already in use!`);
        logger.error(`   This means another instance of the backend is already running.`);
        logger.error(`   Please kill the duplicate process or change the PORT in .env.`);
        logger.error(`   To fix on Windows: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force`);
        process.exit(1);
      } else {
        logger.error('❌ Server startup error:', e);
        process.exit(1);
      }
    });

    // 4. Start HTTP server (which runs both Express and Socket.io)
    server.listen(PORT, '0.0.0.0', () => {
      const geminiStatus = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' 
        ? '✅ Loaded' 
        : '⚠️ Missing/Placeholder';

      logger.info('══════════════════════════════════════════');
      logger.info('🚗  ROADSIDE ASSIST API SERVER');
      logger.info('══════════════════════════════════════════');
      logger.info(`⚙️  Server Port:      ${PORT}`);
      logger.info(`🌍 Environment:      ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📦 Database Status:  ✅ Connected`);
      logger.info(`⚡ Redis Status:     ✅ Connected`);
      logger.info(`🔌 Socket Status:    ✅ Enabled & Listening`);
      logger.info(`🤖 Gemini API Key:   ${geminiStatus}`);
      logger.info('══════════════════════════════════════════');
      logger.info(`📍 API Base: http://localhost:${PORT}/api`);
      logger.info(`🩺 Health Check: http://localhost:${PORT}/api/health`);
      
      if (geminiStatus.includes('Missing')) {
          logger.warn('\n⚠️ WARNING: GEMINI_API_KEY is not set correctly in .env.');
          logger.warn('⚠️ The AI Chatbot will not be able to answer user requests.\n');
      }
    });

    // 5. Start Background Jobs
    startCleanupJob();
    const { startRequestCleanupJob } = require('./utils/requestCleanup');
    startRequestCleanupJob();
    const { getIO } = require('./socket/socket');
    const { startAdminDashboardBroadcast } = require('./socket/adminDashboard');
    startAdminDashboardBroadcast(getIO());
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;

