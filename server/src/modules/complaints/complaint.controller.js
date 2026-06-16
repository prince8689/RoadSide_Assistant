const complaintService = require('./complaint.service');
const { success } = require('../../utils/apiResponse');

const submitComplaint = async (req, res, next) => {
  try {
    const complaint = await complaintService.submitComplaint(req.user.id, req.body);
    return success(res, complaint, 'Complaint submitted successfully', 201);
  } catch (error) {
    next(error);
  }
};

const getComplaints = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      category: req.query.category,
      mechanic_id: req.query.mechanic_id,
      limit: parseInt(req.query.limit) || 100
    };
    const complaints = await complaintService.getComplaints(filters);
    return success(res, complaints, 'Complaints fetched successfully');
  } catch (error) {
    next(error);
  }
};

const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, admin_notes } = req.body;
    const complaint = await complaintService.updateComplaintStatus(req.params.id, status, admin_notes, req.user.id);
    return success(res, complaint, 'Complaint status updated successfully');
  } catch (error) {
    next(error);
  }
};

const enforceMechanic = async (req, res, next) => {
  try {
    const { action_type, reason, suspension_days } = req.body;
    const result = await complaintService.enforceMechanic(req.params.mechanicId, action_type, reason, req.user.id, suspension_days);
    return success(res, result, `Mechanic ${action_type} applied successfully`);
  } catch (error) {
    next(error);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await complaintService.getDashboardStats();
    return success(res, stats, 'Complaint stats fetched successfully');
  } catch (error) {
    next(error);
  }
};

const getSafetyAlerts = async (req, res, next) => {
  try {
    const alerts = await complaintService.getSafetyAlerts();
    return success(res, alerts, 'Safety alerts fetched successfully');
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await complaintService.getAuditLogs();
    return success(res, logs, 'Audit logs fetched successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitComplaint,
  getComplaints,
  updateComplaintStatus,
  enforceMechanic,
  getDashboardStats,
  getSafetyAlerts,
  getAuditLogs
};
