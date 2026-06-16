// ============================================
// SERVICE REQUEST MODULE — CONTROLLER
// ============================================
// Thin layer: handles HTTP req/res only.
// All business logic is in request.service.js.
// Every method uses async/await with try/catch,
// errors forwarded to global error handler via next().

const requestService = require('./request.service');
const { success } = require('../../utils/apiResponse');

// ============================================
// CREATE REQUEST
// ============================================

/**
 * POST /api/requests
 * Create a new service request (user role only).
 *
 * Body: { vehicle_id, category_id, breakdown_lat, breakdown_lng, breakdown_address, description? }
 * Returns: 201 + request object with vehicle and category details
 */
const createRequest = async (req, res, next) => {
  try {
    const request = await requestService.createRequest(req.user.id, req.body);

    return success(res, { request }, 'Service request created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// ============================================
// GET MY REQUESTS
// ============================================

/**
 * GET /api/requests
 * Get all requests for the authenticated user.
 * - User role: returns user's own requests
 * - Mechanic role: returns requests assigned to mechanic
 *
 * Returns: 200 + array of requests with details
 */
const getMyRequests = async (req, res, next) => {
  try {
    let requests;

    if (req.user.role === 'mechanic') {
      requests = await requestService.getMechanicRequests(req.user.id);
    } else {
      requests = await requestService.getUserRequests(req.user.id);
    }

    return success(res, {
      requests,
      count: requests.length,
    }, 'Requests fetched successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================
// GET SINGLE REQUEST
// ============================================

/**
 * GET /api/requests/:id
 * Get a single request by ID with role-based access control.
 *
 * Returns: 200 + full request details
 */
const getRequestById = async (req, res, next) => {
  try {
    const request = await requestService.getRequestById(
      req.params.id,
      req.user.id,
      req.user.role
    );

    return success(res, { request }, 'Request details fetched successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================
// CANCEL REQUEST
// ============================================

/**
 * PATCH /api/requests/:id/cancel
 * Cancel a pending or accepted request (user only).
 *
 * Body: { cancel_reason }
 * Returns: 200 + { message, status }
 */
const cancelRequest = async (req, res, next) => {
  try {
    const request = await requestService.cancelRequest(
      req.params.id,
      req.user.id,
      req.body.cancel_reason
    );

    return success(res, {
      request_id: request.id,
      status: request.status,
      cancelled_at: request.cancelled_at,
    }, 'Request cancelled successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================
// GET AVAILABLE REQUESTS (MECHANIC)
// ============================================

/**
 * GET /api/requests/available
 * Get all pending requests that mechanics can accept (mechanic only).
 *
 * Returns: 200 + array of pending requests
 */
const getAvailableRequests = async (req, res, next) => {
  try {
    const requests = await requestService.getAvailableRequests(req.user.id);

    return success(res, {
      requests,
      count: requests.length,
    }, 'Available requests fetched successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================
// GET ACTIVE REQUEST
// ============================================

/**
 * GET /api/requests/active
 * Get the currently active request for the authenticated user/mechanic.
 *
 * Returns: 200 + active request or null
 */
const getActiveRequest = async (req, res, next) => {
  try {
    const requests = await requestService.getActiveRequest(req.user.id, req.user.role);

    return success(
      res,
      { requests },
      requests.length > 0 ? 'Active requests found' : 'No active requests'
    );
  } catch (error) {
    next(error);
  }
};

// ============================================
// UPDATE LOCATION
// ============================================

const updateLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    const request = await requestService.updateLocation(req.params.id, lat, lng, req.user.id);
    return success(res, { request }, 'Location updated successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================
// ACCEPT REQUEST (MECHANIC)
// ============================================

/**
 * PATCH /api/requests/:id/accept
 * Mechanic accepts a pending service request.
 *
 * Returns: 200 + accepted request with mechanic details
 */
const acceptRequest = async (req, res, next) => {
  try {
    const request = await requestService.acceptRequest(req.params.id, req.user.id);

    return success(res, { request }, 'Request accepted successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================
// UPDATE STATUS (MECHANIC)
// ============================================

/**
 * PATCH /api/requests/:id/status
 * Mechanic updates request status step-by-step.
 *
 * Body: { status: "en_route" | "arrived" | "in_progress" | "completed" }
 * Returns: 200 + updated request
 */
const updateStatus = async (req, res, next) => {
  try {
    const request = await requestService.updateRequestStatus(
      req.params.id,
      req.user.id,
      req.body.status
    );

    return success(res, { request }, `Status updated to "${request.status}" successfully`);
  } catch (error) {
    next(error);
  }
};

// ============================================
// REJECT REQUEST (MECHANIC)
// ============================================

/**
 * PATCH /api/requests/:id/reject
 * Mechanic rejects a pending request without accepting.
 * Request stays pending for other mechanics.
 *
 * Returns: 200 + { message, status: "pending" }
 */
const rejectRequest = async (req, res, next) => {
  try {
    const request = await requestService.rejectRequest(req.params.id, req.user.id);

    return success(res, {
      request_id: request.id,
      status: request.status,
    }, 'Request rejected. It remains available for other mechanics.');
  } catch (error) {
    next(error);
  }
};

// ============================================
// GET REQUEST TIMELINE
// ============================================

/**
 * GET /api/requests/:id/timeline
 * Get the full status timeline with all timestamps.
 *
 * Returns: 200 + timeline object
 */
const getTimeline = async (req, res, next) => {
  try {
    const timeline = await requestService.getRequestTimeline(
      req.params.id,
      req.user.id,
      req.user.role
    );

    return success(res, timeline, 'Request timeline fetched successfully');
  } catch (error) {
    next(error);
  }
};

const submitFeedback = async (req, res, next) => {
  try {
    const { feedback } = req.body;
    await requestService.submitFeedback(req.params.id, req.user.id, feedback);
    return success(res, null, 'Feedback submitted successfully');
  } catch (error) {
    next(error);
  }
};


const submitPayment = async (req, res, next) => {
  try {
    const { payment_method } = req.body;
    const request = await requestService.submitPayment(
      req.params.id,
      req.user.id,
      payment_method,
      req.file
    );
    return success(res, { request }, 'Payment submitted successfully');
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const request = await requestService.verifyPayment(req.params.id, req.user.id);
    return success(res, { request }, 'Payment verified and job completed');
  } catch (error) {
    next(error);
  }
};

const rejectPayment = async (req, res, next) => {
  try {
    const request = await requestService.rejectPayment(req.params.id, req.user.id);
    return success(res, { request }, 'Payment rejected successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitPayment,
  verifyPayment,
  rejectPayment,
  createRequest,
  getMyRequests,
  getRequestById,
  cancelRequest,
  getAvailableRequests,
  getActiveRequest,
  updateLocation,
  acceptRequest,
  updateStatus,
  rejectRequest,
  getTimeline,
  submitFeedback,
};
