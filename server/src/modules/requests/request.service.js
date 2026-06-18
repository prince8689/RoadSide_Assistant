// ============================================
// SERVICE REQUEST MODULE — SERVICE (BUSINESS LOGIC)
// ============================================
// Core business logic for service request lifecycle:
// create, fetch, cancel, and query service requests.
//
// Key design decisions:
//   - User can only have ONE active request at a time
//   - Only pending/accepted requests can be cancelled
//   - Mechanic sees all pending requests (to accept)
//   - Vehicle ownership is verified before creating request
//   - Estimated price comes from service_categories.base_price

const { query, pool } = require('../../config/db');
const path = require('path');
const { AppError } = require('../../middleware/errorHandler');
const { createNotification, createBulkNotifications } = require('../notifications/notification.service');
const NotificationMessages = require('../../utils/notificationHelper');
const { sendRealTimeNotification } = require('../../utils/notificationHelper');
const { sendToUser, sendToMechanic, sendToRequest, sendToAdmin } = require('../../socket/socketManager');
const EVENTS = require('../../socket/events');
const { redisClient } = require('../../config/redis');
const { getNearbyMechanics } = require('../mechanics/mechanic.service');
const { emitDashboardUpdate } = require('../../utils/adminDashboardEmitter');
const { sendJobAlert, sendRequestRejectedEmail } = require('../../utils/email');
const { logger } = require('../../utils/logger');

// ---- Statuses considered "active" (not finished) ----
const ACTIVE_STATUSES = ['pending', 'accepted', 'en_route', 'arrived', 'in_progress', 'awaiting_payment', 'payment_verification'];

// ---- Statuses that allow cancellation ----
const CANCELLABLE_STATUSES = ['pending', 'accepted'];

// ============================================
// CREATE SERVICE REQUEST
// ============================================

/**
 * Create a new roadside assistance request.
 *
 * Business rules:
 *   1. User must own the vehicle
 *   2. No other active request can exist for this user
 *   3. Category must exist and be active
 *   4. Estimated price = category base_price
 *
 * @param {string} userId - User UUID from JWT
 * @param {Object} data - { vehicle_id, category_id, breakdown_lat, breakdown_lng, breakdown_address, description }
 * @returns {Object} Created request with vehicle and category details
 * @throws {AppError} 404 if vehicle/category not found
 * @throws {AppError} 403 if vehicle doesn't belong to user
 * @throws {AppError} 409 if user already has an active request
 */
const createRequest = async (userId, data) => {
  const {
    vehicle_id,
    category_id,
    breakdown_lat,
    breakdown_lng,
    breakdown_address,
    description,
    mechanic_id, // User now specifically selects a mechanic
    shareLocation = true,
    sharePhone = false
  } = data;

  // Use a transaction — multiple reads + one insert must be atomic
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verify user owns the vehicle
    const vehicleCheck = await client.query(
      'SELECT id, make, model, year, license_plate FROM vehicles WHERE id = $1',
      [vehicle_id]
    );

    if (vehicleCheck.rows.length === 0) {
      throw new AppError('Vehicle not found', 404);
    }

    if (vehicleCheck.rows[0].user_id !== undefined) {
      // Check ownership via a separate query since we didn't select user_id
    }

    const ownerCheck = await client.query(
      'SELECT id FROM vehicles WHERE id = $1 AND user_id = $2',
      [vehicle_id, userId]
    );

    if (ownerCheck.rows.length === 0) {
      throw new AppError('This vehicle does not belong to you', 403);
    }

    // 2. Check no active request exists for this user (unless it's just pending)
    const activeCheck = await client.query(
      `SELECT id, status FROM service_requests
       WHERE user_id = $1 AND status = ANY($2)`,
      [userId, ACTIVE_STATUSES]
    );

    if (activeCheck.rows.length > 0) {
      const allPending = activeCheck.rows.every(r => r.status === 'pending');
      if (!allPending) {
        throw new AppError('You already have an active service request in progress', 409);
      } else {
        // Automatically cancel the previous pending requests
        // so the user only has one active request at a time.
        await client.query(
          `UPDATE service_requests
           SET status = 'cancelled',
               cancel_reason = 'Cancelled by user to book a new mechanic',
               updated_at = NOW()
           WHERE user_id = $1 AND status = 'pending'`,
          [userId]
        );
      }
    }

    // 3. Verify service category exists and is active
    const categoryCheck = await client.query(
      'SELECT id, name, slug, icon, base_price FROM service_categories WHERE id = $1 AND is_active = true',
      [category_id]
    );

    if (categoryCheck.rows.length === 0) {
      throw new AppError('Service category not found or inactive', 404);
    }

    const category = categoryCheck.rows[0];

    // Get User Details for the Notification
    const userQuery = await client.query('SELECT full_name, phone FROM users WHERE id = $1', [userId]);
    const userDetails = userQuery.rows[0];

    // Gracefully handle if mechanic_id is actually a mechanic_profiles id
    let finalMechanicId = mechanic_id;
    if (finalMechanicId) {
      const profileCheck = await client.query('SELECT user_id FROM mechanic_profiles WHERE id = $1', [finalMechanicId]);
      if (profileCheck.rows.length > 0) {
        finalMechanicId = profileCheck.rows[0].user_id;
      }
    }

    // 4. Insert the service request
    const result = await client.query(
      `INSERT INTO service_requests (
        user_id, vehicle_id, category_id, mechanic_id,
        breakdown_lat, breakdown_lng, breakdown_address,
        description, status, final_price, share_location, share_phone
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11)
      RETURNING *`,
      [
        userId,
        vehicle_id,
        category_id,
        finalMechanicId,
        breakdown_lat,
        breakdown_lng,
        breakdown_address,
        description || null,
        category.base_price,
        shareLocation,
        sharePhone
      ]
    );
    // 5. Increment total_requests_received for the mechanic
    if (finalMechanicId) {
      await client.query(
        `UPDATE mechanic_profiles 
         SET total_requests_received = total_requests_received + 1 
         WHERE user_id = $1`,
        [finalMechanicId]
      );
    }

    await client.query('COMMIT');

    // Enrich the response with vehicle and category info
    const request = result.rows[0];
    request.vehicle = vehicleCheck.rows[0];
    request.category = category;

    // ========================================
    // NOTIFICATIONS — sent in background AFTER response
    // This ensures the user gets success confirmation FIRST,
    // and the mechanic is notified only AFTER the request is confirmed.
    // ========================================
    const notificationData = {
      requestId: request.id,
      categoryName: category.name,
      description: description || 'No description provided',
      userName: userDetails.full_name,
      userPhone: sharePhone ? userDetails.phone : null,
      shareLocation,
      sharePhone,
      breakdown_lat,
      breakdown_lng,
      breakdown_address,
      vehicle: request.vehicle,
      finalMechanicId,
      userId
    };

    // Fire notifications asynchronously — do NOT await
    setImmediate(async () => {
      try {
        // Notify user
        const msg = NotificationMessages.REQUEST_CREATED(notificationData.categoryName);
        sendRealTimeNotification(notificationData.userId, msg.title, msg.message, msg.type).catch(() => {});

        // Notify mechanic
        if (notificationData.finalMechanicId) {
          const maskedLat = parseFloat(notificationData.breakdown_lat) + (Math.random() - 0.5) * 0.02;
          const maskedLng = parseFloat(notificationData.breakdown_lng) + (Math.random() - 0.5) * 0.02;

          sendToMechanic(notificationData.finalMechanicId, EVENTS.NEW_REQUEST, {
            requestId: notificationData.requestId,
            serviceType: notificationData.categoryName,
            description: notificationData.description,
            userName: notificationData.userName,
            userPhone: notificationData.userPhone,
            shareLocation: notificationData.shareLocation,
            location: {
              lat: notificationData.shareLocation ? notificationData.breakdown_lat : maskedLat,
              lng: notificationData.shareLocation ? notificationData.breakdown_lng : maskedLng,
              address: notificationData.breakdown_address || 'Nearby Area'
            },
            vehicleDetails: {
              make: notificationData.vehicle.make,
              model: notificationData.vehicle.model,
              year: notificationData.vehicle.year
            }
          });

          // Save notification to DB for offline mechanics
          sendRealTimeNotification(
            notificationData.finalMechanicId,
            'Direct Booking Request',
            `You have a new booking request for ${notificationData.categoryName}`,
            'new_request'
          ).catch(() => {});

          // Send email notification (non-blocking)
          try {
            const mechQuery = await query('SELECT email, full_name FROM users WHERE id = $1', [notificationData.finalMechanicId]);
            if (mechQuery.rows.length > 0) {
              const mech = mechQuery.rows[0];
              sendJobAlert(mech.email, mech.full_name, {
                serviceType: notificationData.categoryName,
                locationArea: notificationData.breakdown_address,
                distance: 'Nearby',
                description: notificationData.description,
                vehicleInfo: `${notificationData.vehicle.make} ${notificationData.vehicle.model}`,
                userName: notificationData.userName,
                userPhone: notificationData.userPhone
              }).catch(() => {});
            }
          } catch (emailErr) {
            logger.error('Failed to send job alert email: ' + emailErr.message);
          }
        }

        // Emit socket event to admin
        sendToAdmin(EVENTS.NEW_REQUEST_ADMIN, {
          requestId: notificationData.requestId,
          serviceType: notificationData.categoryName,
          location: notificationData.breakdown_address
        });

        // Update Admin Dashboard
        emitDashboardUpdate();

        // Cache active request in Redis
        redisClient.setex(
          `request:active:${notificationData.userId}`,
          3600,
          JSON.stringify({
            requestId: notificationData.requestId,
            status: 'pending',
            categoryName: notificationData.categoryName,
            location: { lat: notificationData.breakdown_lat, lng: notificationData.breakdown_lng, address: notificationData.breakdown_address }
          })
        ).catch(() => {});

      } catch (notifError) {
        logger.error('Background notification error: ' + notifError.message);
      }
    });

    return request;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================
// GET USER'S REQUESTS
// ============================================

/**
 * Fetch all service requests for the logged-in user.
 * Joins with vehicles, service_categories, and mechanic user details.
 * Sorted by created_at DESC (newest first).
 *
 * @param {string} userId - User UUID from JWT
 * @returns {Array} Array of request objects with joined details
 */
const getUserRequests = async (userId) => {
  const result = await query(
    `SELECT
      sr.*,
      v.make AS vehicle_make,
      v.model AS vehicle_model,
      v.year AS vehicle_year,
      v.license_plate AS vehicle_license_plate,
      sc.name AS category_name,
      sc.slug AS category_slug,
      sc.icon AS category_icon,
      sc.base_price AS category_base_price,
      m.full_name AS mechanic_name,
      m.phone AS mechanic_phone,
      inv.total_amount AS invoice_amount,
      inv.status AS invoice_status
    FROM service_requests sr
    JOIN vehicles v ON v.id = sr.vehicle_id
    JOIN service_categories sc ON sc.id = sr.category_id
    LEFT JOIN users m ON m.id = sr.mechanic_id
    LEFT JOIN invoices inv ON inv.request_id = sr.id
    WHERE sr.user_id = $1
    ORDER BY sr.created_at DESC`,
    [userId]
  );

  return result.rows;
};

// ============================================
// GET SINGLE REQUEST BY ID
// ============================================

/**
 * Fetch a single service request with full details.
 * Access control based on role:
 *   - user: must be the request creator
 *   - mechanic: must be the assigned mechanic
 *   - admin: no restrictions
 *
 * @param {string} requestId - Service request UUID
 * @param {string} userId - User UUID from JWT
 * @param {string} role - User's role from JWT
 * @returns {Object} Full request details
 * @throws {AppError} 404 if request not found
 * @throws {AppError} 403 if user doesn't have access
 */
const getRequestById = async (requestId, userId, role) => {
  const result = await query(
    `SELECT
      sr.*,
      v.make AS vehicle_make,
      v.model AS vehicle_model,
      v.year AS vehicle_year,
      v.license_plate AS vehicle_license_plate,
      v.fuel_type AS vehicle_fuel_type,
      v.color AS vehicle_color,
      sc.name AS category_name,
      sc.slug AS category_slug,
      sc.icon AS category_icon,
      sc.base_price AS category_base_price,
      sc.description AS category_description,
      u.full_name AS user_name,
      u.phone AS user_phone,
      m.full_name AS mechanic_name,
      m.phone AS mechanic_phone,
      m.profile_picture AS mechanic_profile_picture
    FROM service_requests sr
    JOIN vehicles v ON v.id = sr.vehicle_id
    JOIN service_categories sc ON sc.id = sr.category_id
    JOIN users u ON u.id = sr.user_id
    LEFT JOIN users m ON m.id = sr.mechanic_id
    WHERE sr.id = $1`,
    [requestId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Service request not found', 404);
  }

  const request = result.rows[0];

  // Access control based on role
  if (role === 'user' && request.user_id !== userId) {
    throw new AppError('You do not have access to this request', 403);
  }

  if (role === 'mechanic' && request.mechanic_id !== userId) {
    throw new AppError('You do not have access to this request', 403);
  }

  // Admin has unrestricted access — no check needed

  return request;
};

// ============================================
// CANCEL REQUEST
// ============================================

/**
 * Cancel a service request.
 *
 * Business rules:
 *   1. Request must belong to the user
 *   2. Only pending or accepted requests can be cancelled
 *   3. Sets status to cancelled, cancelled_at to NOW(), stores cancel_reason
 *
 * @param {string} requestId - Service request UUID
 * @param {string} userId - User UUID from JWT
 * @param {string} cancelReason - Reason for cancellation
 * @returns {Object} Updated request
 * @throws {AppError} 404 if request not found
 * @throws {AppError} 403 if request doesn't belong to user
 * @throws {AppError} 400 if request cannot be cancelled in current status
 */
const cancelRequest = async (requestId, userId, cancelReason) => {
  // 1. Fetch the request
  const requestCheck = await query(
    'SELECT id, user_id, status FROM service_requests WHERE id = $1',
    [requestId]
  );

  if (requestCheck.rows.length === 0) {
    throw new AppError('Service request not found', 404);
  }

  const request = requestCheck.rows[0];

  // 2. Verify ownership
  if (request.user_id !== userId) {
    throw new AppError('You do not have access to this request', 403);
  }

  // 3. Check if request can be cancelled
  if (!CANCELLABLE_STATUSES.includes(request.status)) {
    throw new AppError(
      `Cannot cancel a request with status "${request.status}". Only pending or accepted requests can be cancelled.`,
      400
    );
  }

  // 4. Update status to cancelled
  const result = await query(
    `UPDATE service_requests
     SET status = 'cancelled',
         cancelled_at = NOW(),
         cancel_reason = $1,
         payment_status = 'cancelled',
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [cancelReason, requestId]
  );

  // Send to user
  const msgUser = NotificationMessages.REQUEST_CANCELLED(cancelReason || 'No reason provided');
  await sendRealTimeNotification(request.user_id, msgUser.title, msgUser.message, msgUser.type);

  // Send to assigned mechanic if any
  if (request.mechanic_id) {
    const msgMech = NotificationMessages.REQUEST_CANCELLED('User cancelled the request');
    await sendRealTimeNotification(request.mechanic_id, msgMech.title, msgMech.message, msgMech.type);

    sendToMechanic(request.mechanic_id, EVENTS.REQUEST_CANCELLED, {
      requestId,
      message: 'User cancelled the request',
      cancelReason
    });
  }

  // Update Admin Dashboard
  emitDashboardUpdate();

  // Delete from Redis cache
  await redisClient.del(`request:active:${request.user_id}`);

  // Emit status change to request room
  sendToRequest(requestId, 'request:status:updated', {
    requestId,
    newStatus: 'cancelled',
    updatedAt: new Date(),
    cancelReason,
    cancelledBy: 'user'
  });

  return result.rows[0];
};

// ============================================
// GET AVAILABLE REQUESTS (FOR MECHANICS)
// ============================================

/**
 * Fetch all pending requests that mechanics can accept.
 * Joins with user details, vehicle info, and category.
 * Sorted by created_at ASC (oldest first — first come, first served).
 *
 * @param {string} mechanicId - Mechanic's user UUID (unused for filtering, but available for future proximity logic)
 * @returns {Array} Array of pending requests
 */
const getAvailableRequests = async (mechanicId) => {
  const result = await query(
    `SELECT
      sr.id,
      sr.user_id,
      sr.vehicle_id,
      sr.category_id,
      sr.status,
      sr.breakdown_lat,
      sr.breakdown_lng,
      sr.breakdown_address,
      sr.description,
      sr.requested_at,
      sr.created_at,
      u.full_name AS user_name,
      u.phone AS user_phone,
      v.make AS vehicle_make,
      v.model AS vehicle_model,
      v.year AS vehicle_year,
      v.license_plate AS vehicle_license_plate,
      v.fuel_type AS vehicle_fuel_type,
      v.color AS vehicle_color,
      sc.name AS category_name,
      sc.slug AS category_slug,
      sc.icon AS category_icon,
      sc.base_price AS category_base_price
    FROM service_requests sr
    JOIN users u ON u.id = sr.user_id
    JOIN vehicles v ON v.id = sr.vehicle_id
    JOIN service_categories sc ON sc.id = sr.category_id
    WHERE sr.status = 'pending'
    ORDER BY sr.created_at ASC`,
    []
  );

  return result.rows;
};

// ============================================
// GET MECHANIC'S ASSIGNED REQUESTS
// ============================================

/**
 * Fetch all requests assigned to a specific mechanic.
 * Includes all statuses EXCEPT pending (since pending means unassigned).
 * Sorted by created_at DESC (newest first).
 *
 * @param {string} mechanicId - Mechanic's user UUID
 * @returns {Array} Array of assigned requests
 */
const getMechanicRequests = async (mechanicId) => {
  const result = await query(
    `SELECT
      sr.*,
      u.full_name AS user_name,
      CASE WHEN sr.share_phone = false THEN 'Hidden by User' ELSE u.phone END AS user_phone,
      v.make AS vehicle_make,
      v.model AS vehicle_model,
      v.year AS vehicle_year,
      v.license_plate AS vehicle_license_plate,
      sc.name AS category_name,
      sc.slug AS category_slug,
      sc.icon AS category_icon,
      sc.base_price AS category_base_price,
      CASE WHEN sr.share_location = false THEN sr.breakdown_lat + 0.01 ELSE sr.breakdown_lat END AS breakdown_lat,
      CASE WHEN sr.share_location = false THEN sr.breakdown_lng + 0.01 ELSE sr.breakdown_lng END AS breakdown_lng,
      CASE WHEN sr.share_location = false THEN 'Location Hidden - General Area' ELSE sr.breakdown_address END AS breakdown_address
    FROM service_requests sr
    JOIN users u ON u.id = sr.user_id
    JOIN vehicles v ON v.id = sr.vehicle_id
    JOIN service_categories sc ON sc.id = sr.category_id
    WHERE sr.mechanic_id = $1
      AND sr.status != 'pending'
    ORDER BY sr.created_at DESC`,
    [mechanicId]
  );

  return result.rows;
};

// ============================================
// GET ACTIVE REQUEST
// ============================================

/**
 * Find the currently active request for a user or mechanic.
 * Active = status NOT IN (completed, cancelled).
 *
 * @param {string} userId - User UUID from JWT
 * @param {string} role - 'user' or 'mechanic'
 * @returns {Object|null} Active request or null if none
 */
const getActiveRequest = async (userId, role) => {
  let whereClause;

  if (role === 'mechanic') {
    // Mechanic: find request assigned to them
    whereClause = 'sr.mechanic_id = $1';
  } else {
    // User: find their own request
    whereClause = 'sr.user_id = $1';
  }

  const result = await query(
    `SELECT
      sr.id, sr.user_id, sr.mechanic_id, sr.vehicle_id, sr.category_id, sr.status, 
      sr.description, sr.final_price, sr.requested_at, sr.accepted_at, 
      sr.en_route_at, sr.arrived_at, sr.started_at, sr.completed_at, sr.cancelled_at, 
      sr.created_at, sr.updated_at, sr.cancel_reason, sr.user_feedback, sr.share_location, 
      sr.share_phone, sr.invoice_url, sr.payment_status, sr.payment_method, sr.payment_receipt_url,
      sr.mechanic_lat, sr.mechanic_lng,
      v.make AS vehicle_make,
      v.model AS vehicle_model,
      v.year AS vehicle_year,
      v.license_plate AS vehicle_license_plate,
      sc.name AS category_name,
      sc.slug AS category_slug,
      sc.icon AS category_icon,
      sc.base_price AS category_base_price,
      u.full_name AS user_name,
      CASE WHEN ($3 = 'mechanic' AND sr.share_phone = false) THEN 'Hidden by User' ELSE u.phone END AS user_phone,
      m.full_name AS mechanic_name,
      m.phone AS mechanic_phone,
      CASE WHEN ($3 = 'mechanic' AND sr.share_location = false) THEN sr.breakdown_lat + 0.01 ELSE sr.breakdown_lat END AS breakdown_lat,
      CASE WHEN ($3 = 'mechanic' AND sr.share_location = false) THEN sr.breakdown_lng + 0.01 ELSE sr.breakdown_lng END AS breakdown_lng,
      CASE WHEN ($3 = 'mechanic' AND sr.share_location = false) THEN 'Location Hidden - General Area' ELSE sr.breakdown_address END AS breakdown_address
    FROM service_requests sr
    JOIN vehicles v ON v.id = sr.vehicle_id
    JOIN service_categories sc ON sc.id = sr.category_id
    JOIN users u ON u.id = sr.user_id
    LEFT JOIN users m ON m.id = sr.mechanic_id
    WHERE ${whereClause}
      AND sr.status = ANY($2)
    ORDER BY sr.created_at DESC`,
    [userId, ACTIVE_STATUSES, role]
  );

  return result.rows;
};

// ============================================
// STATUS TRANSITION RULES
// ============================================

/**
 * Valid status transitions map.
 * Each key is the current status, value is array of allowed next statuses.
 * This enforces strict step-by-step progression — no skipping allowed.
 */
const validTransitions = {
  accepted: ['en_route'],
  en_route: ['arrived'],
  arrived: ['in_progress'],
  in_progress: ['completed', 'awaiting_payment'],
  awaiting_payment: ['payment_verification', 'completed'], // completed for cash without verification
  payment_verification: ['completed', 'awaiting_payment']
};

/**
 * Check if a status transition is valid.
 *
 * @param {string} currentStatus - Current request status
 * @param {string} newStatus - Desired new status
 * @returns {boolean} true if transition is allowed
 */
const isValidStatusTransition = (currentStatus, newStatus) => {
  const allowed = validTransitions[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
};

// ============================================
// ACCEPT REQUEST (MECHANIC)
// ============================================

/**
 * Mechanic accepts a pending service request.
 *
 * Business rules:
 *   1. Request must exist and be in pending status
 *   2. Mechanic must be verified
 *   3. Mechanic must not have another active request
 *   4. Uses PostgreSQL transaction:
 *      - Update service_requests: set mechanic_id, status=accepted, accepted_at
 *      - Update mechanic_profiles: set is_available=false
 *
 * @param {string} requestId - Service request UUID
 * @param {string} mechanicId - Mechanic's user UUID from JWT
 * @returns {Object} Updated request with full details
 * @throws {AppError} 404 if request not found
 * @throws {AppError} 400 if request not pending, or mechanic not verified
 * @throws {AppError} 409 if mechanic already has an active request
 */
const acceptRequest = async (requestId, mechanicId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch the request and verify it's pending
    const requestCheck = await client.query(
      'SELECT id, user_id, status FROM service_requests WHERE id = $1 FOR UPDATE',
      [requestId]
    );

    if (requestCheck.rows.length === 0) {
      throw new AppError('Service request not found', 404);
    }

    const request = requestCheck.rows[0];

    if (request.status !== 'pending') {
      throw new AppError(
        `Request is already "${request.status}". Only pending requests can be accepted.`,
        400
      );
    }

    // 2. Verify mechanic is verified
    const mechanicCheck = await client.query(
      'SELECT id, is_verified, is_available, rating FROM mechanic_profiles WHERE user_id = $1',
      [mechanicId]
    );

    if (mechanicCheck.rows.length === 0) {
      throw new AppError('Mechanic profile not found. Please create a profile first.', 404);
    }

    const mechanic = mechanicCheck.rows[0];

    if (!mechanic.is_verified) {
      throw new AppError('Your profile must be verified before accepting requests', 400);
    }

    // Removed the active request conflict check to allow multiple active jobs
    // 4. Update service_requests: assign mechanic, set accepted
    const updatedRequest = await client.query(
      `UPDATE service_requests
       SET status = 'accepted', 
           mechanic_id = $1, 
           accepted_at = NOW(), 
           updated_at = NOW(),
           mechanic_lat = (SELECT current_lat FROM mechanic_profiles WHERE user_id = $1),
           mechanic_lng = (SELECT current_lng FROM mechanic_profiles WHERE user_id = $1)
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [mechanicId, requestId]
    );

    // 5. Update mechanic_profiles: set is_available = false
    await client.query(
      `UPDATE mechanic_profiles
       SET is_available = false, 
           total_requests_accepted = total_requests_accepted + 1,
           updated_at = NOW()
       WHERE user_id = $1`,
      [mechanicId]
    );

    await client.query('COMMIT');

    // Notification to User
    const mechQuery = await pool.query('SELECT full_name, phone FROM users WHERE id = $1', [mechanicId]);
    const mechanicInfo = mechQuery.rows[0] || {};
    const mechanicName = mechanicInfo.full_name || 'A mechanic';
    const msg = NotificationMessages.REQUEST_ACCEPTED(mechanicName);
    
    // Save DB notification + realtime
    await sendRealTimeNotification(
      request.user_id,
      msg.title,
      msg.message,
      msg.type
    );

    // Socket Emission: Emit to user with explicit payload
    sendToUser(request.user_id, EVENTS.REQUEST_ACCEPTED, {
      requestId,
      mechanic: {
        id: mechanicId,
        name: mechanicName,
        phone: mechanicInfo.phone,
        rating: mechanic.rating || 0,
        businessName: 'Independent Mechanic'
      },
      acceptedAt: new Date()
    });

    sendToRequest(requestId, 'request:status:updated', {
      requestId,
      previousStatus: 'pending',
      newStatus: 'accepted',
      updatedAt: new Date(),
      mechanic: {
        id: mechanicId,
        name: mechanicName,
        phone: mechanicInfo.phone,
        rating: mechanic.rating || 0
      }
    });

    // Update Redis cache
    const activeCache = await redisClient.get(`request:active:${request.user_id}`);
    if (activeCache) {
      await redisClient.setex(
        `request:active:${request.user_id}`,
        3600,
        JSON.stringify({ ...JSON.parse(activeCache), status: 'accepted' })
      );
    }

    // Update Admin Dashboard
    emitDashboardUpdate();

    // Fetch full details for response
    const fullRequest = await getRequestById(requestId, mechanicId, 'mechanic');
    return fullRequest;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================
// REJECT REQUEST (MECHANIC)
// ============================================

/**
 * Mechanic rejects a pending request.
 * Sets mechanic_id to NULL so user can pick another mechanic.
 *
 * @param {string} requestId 
 * @param {string} mechanicId 
 * @returns {Object}
 */
const rejectRequest = async (requestId, mechanicId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const requestCheck = await client.query(
      'SELECT id, user_id, mechanic_id, status FROM service_requests WHERE id = $1 FOR UPDATE',
      [requestId]
    );

    if (requestCheck.rows.length === 0) {
      throw new AppError('Service request not found', 404);
    }

    const request = requestCheck.rows[0];

    if (request.status !== 'pending') {
      throw new AppError('Only pending requests can be rejected', 400);
    }

    await client.query(
      `UPDATE service_requests
       SET status = 'cancelled', 
           cancel_reason = 'Mechanic declined the request', 
           payment_status = 'cancelled',
           updated_at = NOW(),
           mechanic_lat = (SELECT current_lat FROM mechanic_profiles WHERE user_id = $2),
           mechanic_lng = (SELECT current_lng FROM mechanic_profiles WHERE user_id = $2)
       WHERE id = $1`,
      [requestId, mechanicId]
    );

    // Increment rejected count and check for auto-block
    const updateResult = await client.query(
      `UPDATE mechanic_profiles 
       SET total_requests_rejected = total_requests_rejected + 1,
           is_blocked = CASE WHEN total_requests_received >= 50 AND total_requests_accepted <= 2 THEN true ELSE is_blocked END
       WHERE user_id = $1
       RETURNING is_blocked`,
      [mechanicId]
    );

    await client.query('COMMIT');

    // If newly blocked, notify the mechanic via socket
    if (updateResult.rows[0]?.is_blocked) {
      sendToUser(mechanicId, 'mechanic:blocked', {
        message: 'Your account has been temporarily blocked due to a high request rejection rate.'
      });
      // Set them offline
      await redisClient.del(`user:online:${mechanicId}`);
    }

    // Notify the User via Socket
    sendToUser(request.user_id, 'request:rejected', {
      requestId,
      message: 'Mechanic declined your request. Please select another mechanic.'
    });

    await sendRealTimeNotification(
      request.user_id,
      'Request Declined',
      'The mechanic you selected is currently unavailable. Please select another mechanic.',
      'request_rejected'
    );

    // Send email to user
    try {
      const userQuery = await client.query('SELECT email, full_name FROM users WHERE id = $1', [request.user_id]);
      if (userQuery.rows.length > 0) {
        const userRow = userQuery.rows[0];
        sendRequestRejectedEmail(userRow.email, userRow.full_name).catch(console.error);
      }
    } catch (err) {
      logger.error('Failed to send rejection email: ' + err.message);
    }

    return request;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================
// UPDATE REQUEST STATUS (MECHANIC)
// ============================================

/**
 * Update a service request's status step-by-step.
 *
 * Allowed transitions (strict, no skipping):
 *   accepted  → en_route
 *   en_route  → arrived
 *   arrived   → in_progress
 *   in_progress → completed
 *
 * On completion:
 *   - completed_at = NOW()
 *   - final_price = estimated_price
 *   - mechanic is_available = true
 *   - mechanic total_jobs incremented by 1
 *
 * @param {string} requestId - Service request UUID
 * @param {string} mechanicId - Mechanic's user UUID from JWT
 * @param {string} newStatus - Target status
 * @returns {Object} Updated request
 * @throws {AppError} 404 if request not found
 * @throws {AppError} 403 if mechanic not assigned to this request
 * @throws {AppError} 400 if status transition is invalid
 */
const updateRequestStatus = async (requestId, mechanicId, newStatus) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch the request
    const requestCheck = await client.query(
      'SELECT id, user_id, mechanic_id, status, final_price FROM service_requests WHERE id = $1 FOR UPDATE',
      [requestId]
    );

    if (requestCheck.rows.length === 0) {
      throw new AppError('Service request not found', 404);
    }

    const request = requestCheck.rows[0];

    // 2. Verify this mechanic is assigned to this request
    if (request.mechanic_id !== mechanicId) {
      throw new AppError('You are not authorized to update this request', 403);
    }

    // 3. Validate status transition
    if (!isValidStatusTransition(request.status, newStatus)) {
      throw new AppError(
        `Invalid status transition: "${request.status}" → "${newStatus}". ` +
        `Allowed: ${request.status} → ${(validTransitions[request.status] || []).join(', ') || 'none'}`,
        400
      );
    }

    // 4. Build the update query based on new status
    // Map status to its corresponding timestamp column
    const statusTimestampMap = {
      en_route: 'en_route_at',
      arrived: 'arrived_at',
      in_progress: 'started_at',
      completed: 'completed_at',
    };

    const timestampColumn = statusTimestampMap[newStatus];
    let updateQuery;
    let updateParams;

    if (newStatus === 'completed') {
      // Completion: update timestamp
      updateQuery = `
        UPDATE service_requests
        SET status = $1,
            ${timestampColumn} = NOW(),
            updated_at = NOW()
        WHERE id = $2
        RETURNING *`;
      updateParams = [newStatus, requestId];
    } else {
      // Normal status update: set status + timestamp
      updateQuery = `
        UPDATE service_requests
        SET status = $1,
            ${timestampColumn} = NOW(),
            updated_at = NOW()
        WHERE id = $2
        RETURNING *`;
      updateParams = [newStatus, requestId];
    }

    const updatedRequest = await client.query(updateQuery, updateParams);

    // 5. If completed, update mechanic profile
    if (newStatus === 'completed') {
      await client.query(
        `UPDATE mechanic_profiles
         SET is_available = true,
             total_jobs = total_jobs + 1,
             updated_at = NOW()
         WHERE user_id = $1`,
        [mechanicId]
      );
    }

    await client.query('COMMIT');

    // Socket Emission: Emit status update to request room
    let detailedMsg;
    if (newStatus === 'en_route') {
      detailedMsg = {
        requestId,
        previousStatus: request.status,
        newStatus: 'en_route',
        updatedAt: new Date(),
        message: 'Mechanic is heading to your location'
      };
    } else if (newStatus === 'arrived') {
      detailedMsg = {
        requestId,
        previousStatus: request.status,
        newStatus: 'arrived',
        updatedAt: new Date(),
        message: 'Mechanic has arrived at your location'
      };
    } else if (newStatus === 'in_progress') {
      detailedMsg = {
        requestId,
        previousStatus: request.status,
        newStatus: 'in_progress',
        updatedAt: new Date(),
        message: 'Service work has started'
      };
    } else if (newStatus === 'completed') {
      detailedMsg = {
        requestId,
        previousStatus: request.status,
        newStatus: 'completed',
        updatedAt: new Date(),
        finalPrice: request.estimated_price,
        message: 'Service completed successfully',
        canReview: true
      };
    }

    if (detailedMsg) {
      sendToRequest(requestId, 'request:status:updated', detailedMsg);
    }

    // Update Redis cache
    const activeCache = await redisClient.get(`request:active:${request.user_id}`);
    if (activeCache) {
      if (newStatus === 'completed') {
        await redisClient.del(`request:active:${request.user_id}`);
      } else {
        await redisClient.setex(
          `request:active:${request.user_id}`,
          3600,
          JSON.stringify({ ...JSON.parse(activeCache), status: newStatus })
        );
      }
    }

    // Notification to User
    const mechQuery = await pool.query('SELECT full_name FROM users WHERE id = $1', [mechanicId]);
    const mechanicName = mechQuery.rows[0]?.full_name || 'Your mechanic';
    let msg;

    if (newStatus === 'en_route') {
      msg = NotificationMessages.MECHANIC_EN_ROUTE(mechanicName, 15); // Mock 15m ETA
      sendToUser(request.user_id, EVENTS.MECHANIC_EN_ROUTE, {
        requestId,
        mechanicId,
        message: 'Mechanic is on the way to your location'
      });
    } else if (newStatus === 'arrived') {
      msg = NotificationMessages.MECHANIC_ARRIVED();
      sendToUser(request.user_id, EVENTS.MECHANIC_ARRIVED, {
        requestId,
        message: 'Mechanic has arrived at your location'
      });
    } else if (newStatus === 'completed') {
      msg = NotificationMessages.SERVICE_COMPLETED(request.estimated_price);
      sendToUser(request.user_id, EVENTS.SERVICE_COMPLETED, {
        requestId,
        finalPrice: request.estimated_price,
        message: 'Service completed! Please leave a review.'
      });
      // Notify mechanic too
      sendToMechanic(mechanicId, 'job:completed', {
        requestId,
        earnings: request.estimated_price,
        message: 'Job completed successfully!'
      });
    }

    if (msg) {
      await sendRealTimeNotification(request.user_id, msg.title, msg.message, msg.type);
    }

    // Update Admin Dashboard
    emitDashboardUpdate();

    return updatedRequest.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};



// ============================================
// GET REQUEST TIMELINE
// ============================================

/**
 * Get the full status timeline of a service request.
 * Returns all lifecycle timestamps in chronological order.
 *
 * @param {string} requestId - Service request UUID
 * @param {string} userId - User UUID from JWT (for access control)
 * @param {string} role - User's role from JWT
 * @returns {Object} Timeline with all timestamps
 * @throws {AppError} 404 if request not found
 * @throws {AppError} 403 if user doesn't have access
 */
const getRequestTimeline = async (requestId, userId, role) => {
  const result = await query(
    `SELECT
      sr.id,
      sr.status,
      sr.user_id,
      sr.mechanic_id,
      sr.requested_at,
      sr.accepted_at,
      sr.en_route_at,
      sr.arrived_at,
      sr.started_at,
      sr.completed_at,
      sr.cancelled_at,
      sr.created_at,
      sr.updated_at
    FROM service_requests sr
    WHERE sr.id = $1`,
    [requestId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Service request not found', 404);
  }

  const request = result.rows[0];

  // Access control
  if (role === 'user' && request.user_id !== userId) {
    throw new AppError('You do not have access to this request', 403);
  }

  if (role === 'mechanic' && request.mechanic_id !== userId) {
    throw new AppError('You do not have access to this request', 403);
  }

  // Build clean timeline object
  return {
    request_id: request.id,
    current_status: request.status,
    timeline: {
      created_at: request.created_at,
      requested_at: request.requested_at,
      accepted_at: request.accepted_at,
      en_route_at: request.en_route_at,
      arrived_at: request.arrived_at,
      started_at: request.started_at,
      completed_at: request.completed_at,
      cancelled_at: request.cancelled_at,
    },
  };
};

const submitFeedback = async (requestId, userId, feedback) => {
  const result = await pool.query(
    `UPDATE service_requests
     SET user_feedback = $1
     WHERE id = $2 AND user_id = $3
     RETURNING id`,
    [feedback, requestId, userId]
  );
  if (result.rows.length === 0) {
    throw new AppError('Request not found or you are not authorized', 404);
  }
  return result.rows[0];
};

const updateLocation = async (requestId, lat, lng, userId) => {
  const result = await pool.query(
    `UPDATE service_requests
     SET breakdown_lat = $1, breakdown_lng = $2
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    [lat, lng, requestId, userId]
  );
  if (result.rows.length === 0) {
    throw new AppError('Request not found or you are not authorized', 404);
  }
  return result.rows[0];
};


// ============================================
// SUBMIT PAYMENT (USER)
// ============================================
const submitPayment = async (requestId, userId, paymentMethod, receiptFile) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const reqCheck = await client.query('SELECT id, user_id, mechanic_id, status FROM service_requests WHERE id = $1 FOR UPDATE', [requestId]);
    if (reqCheck.rows.length === 0) throw new AppError('Request not found', 404);
    
    const request = reqCheck.rows[0];
    if (request.user_id !== userId) throw new AppError('Unauthorized', 403);
    if (request.status !== 'awaiting_payment') throw new AppError('Payment not awaited', 400);

    let receiptUrl = null;
    if (paymentMethod === 'online' && receiptFile) {
      receiptUrl = '/uploads/receipts/' + receiptFile.filename;
    }

    const newStatus = 'payment_verification';

    const updated = await client.query(
      `UPDATE service_requests 
       SET payment_status = $1, payment_method = $2, payment_receipt_url = $3, status = $4, updated_at = NOW() 
       WHERE id = $5 RETURNING *`,
      ['pending', paymentMethod, receiptUrl, newStatus, requestId]
    );

    sendToMechanic(request.mechanic_id, EVENTS.REQUEST_STATUS_UPDATE, { requestId, newStatus, paymentMethod, receiptUrl });
    const msg = NotificationMessages.REQUEST_STATUS_UPDATE(`Mechanic is verifying your ${paymentMethod} payment.`);
    await sendRealTimeNotification(userId, msg.title, msg.message, msg.type);
    
    if (paymentMethod === 'online') {
      await sendRealTimeNotification(request.mechanic_id, 'Payment Receipt Uploaded', 'User has uploaded a payment receipt for verification', 'info');
    } else {
      await sendRealTimeNotification(request.mechanic_id, 'Cash Payment Verification', 'User selected Cash payment. Please verify.', 'info');
    }

    await client.query('COMMIT');
    
    return updated.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ============================================
// VERIFY PAYMENT (MECHANIC)
// ============================================
const verifyPayment = async (requestId, mechanicId) => {
  const client = await pool.connect();
  let updatedRequest;
  try {
    await client.query('BEGIN');
    
    const reqCheck = await client.query('SELECT id, user_id, mechanic_id, status FROM service_requests WHERE id = $1 FOR UPDATE', [requestId]);
    if (reqCheck.rows.length === 0) throw new AppError('Request not found', 404);
    
    const request = reqCheck.rows[0];
    if (request.mechanic_id !== mechanicId) throw new AppError('Unauthorized', 403);
    if (request.status !== 'payment_verification') throw new AppError('Not pending verification', 400);

    const updated = await client.query(
      `UPDATE service_requests 
       SET payment_status = 'paid', status = 'completed', updated_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [requestId]
    );
    updatedRequest = updated.rows[0];

    const fullRequest = await getRequestById(requestId, mechanicId, 'mechanic');
    const invoiceUrl = '/uploads/invoices/invoice-' + requestId + '.pdf';
    const { generateInvoice } = require('../../utils/invoiceGenerator');
    await generateInvoice(fullRequest, path.join(__dirname, '../../../public' + invoiceUrl));
    await client.query('UPDATE service_requests SET invoice_url = $1 WHERE id = $2', [invoiceUrl, requestId]);
    await client.query("UPDATE invoices SET status = 'paid', paid_at = NOW() WHERE request_id = $1", [requestId]);

    await client.query('UPDATE mechanic_profiles SET is_available = true WHERE user_id = $1', [mechanicId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    throw err;
  }
  
  client.release();

  // Anything after COMMIT should NOT throw and fail the request, because DB is already saved as paid.
  try {
    const request = updatedRequest;
    const fullRequestCompleted = await getRequestById(requestId, request.user_id, 'user');
    sendToUser(request.user_id, 'request:status-update', fullRequestCompleted);
    sendToUser(request.user_id, EVENTS.REQUEST_COMPLETED, { requestId, message: 'Payment verified and job completed.' });
    const msg = NotificationMessages.REQUEST_COMPLETED('Payment verified successfully. Job is now complete!');
    await sendRealTimeNotification(request.user_id, msg.title, msg.message, msg.type);

    await redisClient.del(`request:active:${request.user_id}`);
    await redisClient.del(`mechanic:active:${mechanicId}`);

    const { sendJobAlert } = require('../../utils/email');
    const uQuery = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [request.user_id]);
    if (uQuery.rows.length > 0) {
      sendJobAlert(uQuery.rows[0].email, uQuery.rows[0].full_name, {
        serviceType: 'Invoice Available',
        locationArea: 'Payment Successful',
        distance: '-',
        description: 'Your payment was successfully verified. You can view the invoice in your Service History.',
        vehicleInfo: '-'
      }).catch(err => console.error('Email send failed:', err.message));
    }
  } catch (postCommitErr) {
    console.error('Non-critical error after verifyPayment commit:', postCommitErr);
  }

  return updatedRequest;
};

const rejectPayment = async (requestId, mechanicId, reason) => {
  const client = await pool.connect();
  const fs = require('fs');
  const path = require('path');
  try {
    await client.query('BEGIN');

    const request = await getRequestById(requestId, mechanicId, 'mechanic');
    if (request.status !== 'payment_verification') {
      throw new Error('Payment verification is not required for this request');
    }

    if (request.payment_receipt_url) {
      const filePath = path.join(__dirname, '../../..' + request.payment_receipt_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    const updated = await client.query(
      `UPDATE service_requests 
       SET payment_status = 'pending', status = 'awaiting_payment', payment_method = null, payment_receipt_url = null, updated_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [requestId]
    );

    const fullRequestRejected = await getRequestById(requestId, request.user_id, 'user');
    sendToUser(request.user_id, 'request:status-update', fullRequestRejected);
    
    const declineReason = reason || 'Invalid receipt or payment not received';
    sendToUser(request.user_id, EVENTS.PAYMENT_REJECTED, { requestId, message: `Payment rejected. Reason: ${declineReason}. Please try again.` });
    
    const msg = NotificationMessages.REQUEST_STATUS('payment_rejected', `Payment rejected by mechanic. Reason: ${declineReason}. Please submit payment again.`);
    await sendRealTimeNotification(request.user_id, msg.title, msg.message, msg.type);

    await client.query('COMMIT');
    return updated.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  submitPayment,
  verifyPayment,
  rejectPayment,
  createRequest,
  getUserRequests,
  getRequestById,
  cancelRequest,
  getAvailableRequests,
  getMechanicRequests,
  getActiveRequest,
  acceptRequest,
  rejectRequest,
  updateRequestStatus,
  getRequestTimeline,
  submitFeedback,
  updateLocation,
};
