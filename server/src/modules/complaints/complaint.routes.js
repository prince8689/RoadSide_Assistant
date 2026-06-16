const express = require('express');
const router = express.Router();
const complaintController = require('./complaint.controller');
const validate = require('../../middleware/validate');
const { verifyToken, authorizeRoles } = require('../../middleware/auth');
const { submitComplaintSchema, updateComplaintStatusSchema, enforceMechanicSchema } = require('./complaint.validation');

// ============================================
// USER ROUTES
// ============================================
router.post('/user', verifyToken, authorizeRoles('user'), validate(submitComplaintSchema), complaintController.submitComplaint);

// ============================================
// ADMIN ROUTES
// ============================================
router.get('/admin', verifyToken, authorizeRoles('admin'), complaintController.getComplaints);
router.patch('/admin/:id/status', verifyToken, authorizeRoles('admin'), validate(updateComplaintStatusSchema), complaintController.updateComplaintStatus);
router.post('/admin/enforce/:mechanicId', verifyToken, authorizeRoles('admin'), validate(enforceMechanicSchema), complaintController.enforceMechanic);
router.get('/admin/stats', verifyToken, authorizeRoles('admin'), complaintController.getDashboardStats);
router.get('/admin/safety-alerts', verifyToken, authorizeRoles('admin'), complaintController.getSafetyAlerts);
router.get('/admin/audit-logs', verifyToken, authorizeRoles('admin'), complaintController.getAuditLogs);

module.exports = router;
