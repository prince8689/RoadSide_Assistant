// ============================================
// SOCKET.IO SETUP & AUTHENTICATION
// ============================================

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const EVENTS = require('./events');
const { redisClient } = require('../config/redis');
const { query } = require('../config/db');
const { logger } = require('../utils/logger');
const { socketRateLimit } = require('./socketRateLimiter');

const getNotificationService = () => require('../modules/notifications/notification.service');
const getRequestService = () => require('../modules/requests/request.service');

let io;

/**
 * Initialize Socket.io on the given HTTP server.
 * Sets up CORS, authentication middleware, and connection handlers.
 *
 * @param {http.Server} server - Node.js HTTP server
 * @returns {Server} Socket.io instance
 */
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Should match Express CORS in production
      methods: ['GET', 'POST', 'PATCH', 'DELETE']
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    perMessageDeflate: {
      threshold: 1024 // compress messages > 1KB
    }
  });

  // Global socket connection error handler
  io.engine.on('connection_error', (err) => {
    logger.error(`Socket engine connection error: ${err.message}`);
  });

  // ============================================
  // JWT AUTHENTICATION MIDDLEWARE
  // ============================================
  io.use((socket, next) => {
    try {
      // Token can be sent in auth.token or headers.authorization
      const token = socket.handshake.auth?.token || 
                    (socket.handshake.headers?.authorization && socket.handshake.headers.authorization.split(' ')[1]);

      if (!token) {
        return next(new Error('No token provided'));
      }

      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Store user data in socket for later use
      socket.data.user = decoded;
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return next(new Error('Token expired'));
      }
      return next(new Error('Authentication error'));
    }
  });

  // ============================================
  // ROOM MONITORING
  // ============================================
  const monitorRooms = async () => {
    try {
      const rooms = io.sockets.adapter.rooms;
      let totalConnections = 0;
      rooms.forEach((room, key) => {
        if (key.startsWith('user:') || key.startsWith('mechanic:')) {
          totalConnections += room.size;
        }
      });
      logger.info(`📊 Socket total user/mechanic connections: ${totalConnections}`);
    } catch (e) {
      logger.error('Room monitoring error', e);
    }
  };
  setInterval(monitorRooms, 60000);

  // Store last location per mechanic for debouncing
  const lastLocationUpdate = new Map();

  // ============================================
  // CONNECTION EVENT HANDLERS
  // ============================================
  io.on(EVENTS.CONNECT, async (socket) => {
    const { id, role } = socket.data.user;

    // Per socket error handler
    socket.on('error', (err) => {
      logger.error(`Socket error for user ${id}: ${err.message || err}`);
      socket.emit('server:error', {
        message: 'Something went wrong',
        timestamp: new Date()
      });
    });

    // Safe handler wrapper to catch async errors
    const safeHandler = (handler) => async (...args) => {
      try {
        await handler(...args);
      } catch (err) {
        logger.error(`Socket handler error: ${err.message || err}`);
        socket.emit('server:error', {
          message: err.message || 'Internal error',
          timestamp: new Date()
        });
      }
    };
    
    logger.info(`Socket connected: ${socket.id} | User: ${id} | Role: ${role}`);

    // Join Role-based Rooms
    if (role === 'user') {
      socket.join(`user:${id}`);
    } else if (role === 'mechanic') {
      socket.join(`mechanic:${id}`);
    } else if (role === 'admin') {
      socket.join('admin:dashboard');
    }

    // ============================================
    // ONLINE PRESENCE
    // ============================================
    try {
      await redisClient.setex(
        `user:online:${id}`,
        3600, // 1 hour
        JSON.stringify({
          userId: id,
          role,
          connectedAt: new Date(),
          socketId: socket.id
        })
      );
    } catch (err) {
      logger.error(`Redis online presence error: ${err.message}`);
    }

    // ============================================
    // INITIAL NOTIFICATIONS PUSH
    // ============================================
    try {
      const { getUnreadCount, getRecentUnread } = getNotificationService();
      const unreadCount = await getUnreadCount(id);
      socket.emit('notification:unread_count', { count: unreadCount });

      const recentNotifications = await getRecentUnread(id, 5);
      socket.emit('notification:recent', { notifications: recentNotifications });
    } catch (err) {
      logger.error(`Initial notification push error: ${err.message}`);
    }

    // ============================================
    // NOTIFICATION EVENTS
    // ============================================
    socket.on('notification:get:unread', safeHandler(async () => {
      const { getUnreadCount } = getNotificationService();
      const count = await getUnreadCount(id);
      socket.emit('notification:unread_count', { count });
    }));

    socket.on('notification:mark:read', safeHandler(async (data) => {
      if (!socketRateLimit(id, 'notification:mark:read', 20)) {
        return socket.emit('error', { message: 'Too many requests' });
      }

      const { notificationIds } = data;
      if (notificationIds && Array.isArray(notificationIds)) {
        const { markAsRead, getUnreadCount } = getNotificationService();
        await markAsRead(id, notificationIds);
        const count = await getUnreadCount(id);
        socket.emit('notification:unread_count', { count });
      }
    }));

    // ============================================
    // MECHANIC LOCATION EVENTS
    // ============================================
    socket.on('mechanic:location-update', safeHandler(async (data) => {
      if (role !== 'mechanic') return;
      const { mechanicId, lat, lng, accuracy } = data;
      
      // Update location via service
      const searchService = require('../modules/search/search.service');
      await searchService.updateMechanicLocation(mechanicId, lat, lng, accuracy);
      
      // Emit to mechanic's own room
      io.to(`mechanic:${mechanicId}`).emit('location:updated', { lat, lng, timestamp: new Date() });
      
      // Find active job
      const activeJobRes = await query(
        'SELECT id, user_id FROM service_requests WHERE mechanic_id = $1 AND status IN ($2, $3)',
        [mechanicId, 'accepted', 'en_route']
      );
      
      if (activeJobRes.rows.length > 0) {
        const job = activeJobRes.rows[0];
        // Calculate ETA assuming 30km/h and we need user location to do this.
        // For simplicity we emit mechanic:moving and calculate ETA on client side (Google Maps Directions)
        io.to(`user:${job.user_id}`).emit('mechanic:moving', { 
          lat, lng, mechanicId, timestamp: new Date() 
        });
        io.to(`tracking:${job.id}`).emit('mechanic:moving', { 
          lat, lng, mechanicId, timestamp: new Date() 
        });
      }
    }));

    // ============================================
    // USER WATCH MECHANIC EVENTS
    // ============================================
    socket.on('user:watch-mechanic', safeHandler(async (data) => {
      const { requestId, mechanicId } = data;
      
      // User joins tracking room
      socket.join(`tracking:${requestId}`);
      
      // Send current mechanic location
      const mechRes = await query('SELECT latitude, longitude FROM mechanic_profiles WHERE id = $1', [mechanicId]);
      if (mechRes.rows.length > 0 && mechRes.rows[0].latitude) {
        socket.emit('tracking:started', { 
          lat: mechRes.rows[0].latitude, 
          lng: mechRes.rows[0].longitude 
        });
      }
    }));

    socket.on('mechanic:stop-tracking', safeHandler(async (data) => {
      socket.leave(`tracking:${data.requestId}`);
      // Notify users in room
      io.to(`tracking:${data.requestId}`).emit('tracking:ended');
    }));

    // ============================================
    // MECHANIC STATUS CHANGE
    // ============================================
    socket.on('mechanic:status-change', safeHandler(async (data) => {
      if (role !== 'mechanic') return;
      const { status } = data;
      
      // Find mechanic profile ID
      const mechRes = await query('SELECT id, latitude, longitude FROM mechanic_profiles WHERE user_id = $1', [id]);
      if (mechRes.rows.length === 0) return;
      const mechanic = mechRes.rows[0];
      
      const isAvailable = status === 'available';
      const isOnDuty = status !== 'offline';
      
      await query(
        'UPDATE mechanic_profiles SET is_available = $1, is_on_duty = $2 WHERE id = $3',
        [isAvailable, isOnDuty, mechanic.id]
      );
      
      if (isAvailable && mechanic.latitude && mechanic.longitude) {
        // Broadcast to users within 10km (optimistic broadcast)
        // A better approach would be checking users' exact location, but simplified broadcast for now:
        socket.broadcast.emit('mechanic:available', { mechanicId: mechanic.id });
      }
    }));

    // ============================================
    // DAY 16: REQUEST STATUS SUBSCRIPTION
    // ============================================
    socket.on('request:subscribe', safeHandler(async (data) => {
      if (!socketRateLimit(id, 'request:subscribe', 10)) {
        return socket.emit('error', { message: 'Too many subscribe attempts' });
      }

      const { getRequestById } = getRequestService();
      const request = await getRequestById(data.requestId, id, role);
      if (!request) {
        return socket.emit('error', { message: 'Request not found' });
      }

      const isUser = request.user_id === id;
      const isMechanic = request.mechanic_id === id;
      const isAdmin = role === 'admin';

      if (!isUser && !isMechanic && !isAdmin) {
        return socket.emit('error', { message: 'Not authorized' });
      }

      socket.join(`request:${data.requestId}`);

      socket.emit('request:current:status', {
        requestId: data.requestId,
        status: request.status,
        mechanicId: request.mechanic_id,
        timeline: {
          created_at: request.created_at,
          accepted_at: request.accepted_at,
          completed_at: request.completed_at,
          cancelled_at: request.cancelled_at
        }
      });
    }));

    socket.on('request:unsubscribe', safeHandler(async (data) => {
      socket.leave(`request:${data.requestId}`);
      socket.emit('request:unsubscribed', { requestId: data.requestId });
    }));

    // ============================================
    // DAY 16: CLIENT RECONNECTION
    // ============================================
    socket.on('client:reconnected', safeHandler(async (data) => {
      // Rooms are joined automatically on connect, but just in case
      if (role === 'user') socket.join(`user:${id}`);
      if (role === 'mechanic') socket.join(`mechanic:${id}`);
      if (role === 'admin') socket.join('admin:dashboard');

      if (data.activeRequestId) {
        const { getRequestById } = getRequestService();
        const request = await getRequestById(data.activeRequestId, id, role);
        if (request && !['completed', 'cancelled'].includes(request.status)) {
          socket.join(`request:${data.activeRequestId}`);
          socket.emit('request:current:status', {
            requestId: data.activeRequestId,
            status: request.status,
            updatedAt: request.updated_at
          });
        }
      }

      if (data.lastEventTime) {
        const { getNotificationsSince, getUnreadCount } = getNotificationService();
        const missedNotifications = await getNotificationsSince(id, data.lastEventTime);
        if (missedNotifications.length > 0) {
          socket.emit('notification:missed', {
            notifications: missedNotifications,
            count: missedNotifications.length
          });
        }
        const unreadCount = await getUnreadCount(id);
        socket.emit('notification:unread_count', { count: unreadCount });
      }
    }));

    socket.on(EVENTS.DISCONNECT, safeHandler(async (reason) => {
      logger.info(`Socket disconnected: ${socket.id} | Reason: ${reason}`);
      
      await redisClient.del(`user:online:${id}`);
      
      if (role === 'mechanic') {
        await redisClient.del(`mechanic:location:${id}`);
        
        // Update DB is_available = false after 2 min delay
        setTimeout(async () => {
          try {
            const isBackOnline = await redisClient.get(`user:online:${id}`);
            if (!isBackOnline) {
              await query('UPDATE mechanic_profiles SET is_available = false WHERE user_id = $1', [id]);
              logger.info(`Mechanic ${id} offline cleanly completed after 2 min delay.`);
            }
          } catch (innerErr) {
            logger.error(`Mechanic offline timeout error: ${innerErr.message}`);
          }
        }, 2 * 60 * 1000);
      }
    }));

    socket.on('error', (err) => {
      logger.error(`Socket error (${socket.id}): ${err.message}`);
    });
  });

  return io;
};

/**
 * Get the initialized Socket.io instance.
 * Throws error if accessed before initSocket is called.
 *
 * @returns {Server} Socket.io instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized!');
  }
  return io;
};

module.exports = {
  initSocket,
  getIO
};
