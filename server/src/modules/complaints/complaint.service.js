const { query } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');

const HIGH_PRIORITY_CATEGORIES = ['fraud', 'harassment', 'threatening_behavior', 'safety_concern', 'fake_service'];

/**
 * Submit a new complaint
 */
const submitComplaint = async (userId, data) => {
  const { mechanic_id, request_id, category, description, evidence_urls } = data;

  // Insert complaint
  const result = await query(
    `INSERT INTO complaints (user_id, mechanic_id, request_id, category, description, evidence_urls)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, mechanic_id, request_id || null, category, description, JSON.stringify(evidence_urls || [])]
  );
  const complaint = result.rows[0];

  // If high priority, create safety alert
  if (HIGH_PRIORITY_CATEGORIES.includes(category)) {
    await query(
      `INSERT INTO safety_alerts (complaint_id) VALUES ($1)`,
      [complaint.id]
    );
  }

  // Deduct Trust Score for getting a complaint (-10)
  await updateTrustScore(mechanic_id, -10);

  return complaint;
};

/**
 * Get all complaints (Admin)
 */
const getComplaints = async (filters) => {
  let q = `
    SELECT c.*, 
           u.full_name AS user_name, u.email AS user_email,
           m.full_name AS mechanic_name, m.email AS mechanic_email
    FROM complaints c
    JOIN users u ON c.user_id = u.id
    JOIN users m ON c.mechanic_id = m.id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (filters.status) {
    q += ` AND c.status = $${paramIndex++}`;
    params.push(filters.status);
  }
  if (filters.category) {
    q += ` AND c.category = $${paramIndex++}`;
    params.push(filters.category);
  }
  if (filters.mechanic_id) {
    q += ` AND c.mechanic_id = $${paramIndex++}`;
    params.push(filters.mechanic_id);
  }

  q += ` ORDER BY c.created_at DESC`;
  
  if (filters.limit) {
    q += ` LIMIT $${paramIndex++}`;
    params.push(filters.limit);
  }

  const result = await query(q, params);
  return result.rows;
};

/**
 * Update Complaint Status & Resolve
 */
const updateComplaintStatus = async (complaintId, status, adminNotes, adminId) => {
  const check = await query(`SELECT * FROM complaints WHERE id = $1`, [complaintId]);
  if (!check.rows.length) throw new AppError('Complaint not found', 404);
  const complaint = check.rows[0];

  const updateFields = status === 'resolved' || status === 'rejected' 
    ? 'status = $1, admin_notes = $2, resolved_at = NOW(), updated_at = NOW()'
    : 'status = $1, admin_notes = $2, updated_at = NOW()';

  const result = await query(
    `UPDATE complaints SET ${updateFields} WHERE id = $3 RETURNING *`,
    [status, adminNotes || null, complaintId]
  );

  const updatedComplaint = result.rows[0];

  // If resolved, apply strike and evaluate enforcement
  if (status === 'resolved' && complaint.status !== 'resolved') {
    await applyStrike(complaint.mechanic_id, complaint.id, 'Complaint Resolved: ' + complaint.category, adminId);
  }

  // If rejected, restore trust score (+10) since complaint was invalid
  if (status === 'rejected' && complaint.status !== 'rejected') {
    await updateTrustScore(complaint.mechanic_id, 10);
  }

  // Resolve safety alert if it exists
  if (status === 'resolved' || status === 'rejected') {
    await query(`UPDATE safety_alerts SET status = 'handled', handled_at = NOW() WHERE complaint_id = $1`, [complaintId]);
  }

  return updatedComplaint;
};

/**
 * Apply a strike and auto-enforce
 */
const applyStrike = async (mechanicId, complaintId, reason, adminId) => {
  // Add strike
  await query(
    `INSERT INTO mechanic_strikes (mechanic_id, complaint_id, reason) VALUES ($1, $2, $3)`,
    [mechanicId, complaintId || null, reason]
  );

  // Update strike count on profile
  const profileResult = await query(
    `UPDATE mechanic_profiles SET total_strikes = total_strikes + 1 WHERE user_id = $1 RETURNING total_strikes`,
    [mechanicId]
  );
  const strikes = profileResult.rows[0].total_strikes;

  // Auto Enforcement Rules
  if (strikes === 3) {
    await enforceMechanic(mechanicId, 'warning', 'Reached 3 strikes', adminId);
  } else if (strikes === 5) {
    await enforceMechanic(mechanicId, 'suspension', 'Reached 5 strikes (7-day suspension)', adminId, 7);
  } else if (strikes === 7) {
    await enforceMechanic(mechanicId, 'suspension', 'Reached 7 strikes (30-day suspension)', adminId, 30);
  } else if (strikes >= 10) {
    await enforceMechanic(mechanicId, 'ban', 'Reached 10 strikes (Permanent Ban)', adminId);
  }
};

/**
 * Enforce action on mechanic (Warning, Suspension, Ban, Reactivation)
 */
const enforceMechanic = async (mechanicId, actionType, reason, adminId, suspensionDays = 0) => {
  let updateQ = '';
  let params = [];

  if (actionType === 'warning') {
    updateQ = `UPDATE mechanic_profiles SET warning_count = warning_count + 1 WHERE user_id = $1`;
    params = [mechanicId];
    await updateTrustScore(mechanicId, -5);
  } else if (actionType === 'suspension') {
    updateQ = `UPDATE users SET suspension_end_date = NOW() + INTERVAL '${suspensionDays} days' WHERE id = $1`;
    params = [mechanicId];
    await updateTrustScore(mechanicId, -15);
  } else if (actionType === 'ban') {
    updateQ = `UPDATE users SET is_banned = true WHERE id = $1`;
    params = [mechanicId];
  } else if (actionType === 'reactivation') {
    updateQ = `UPDATE users SET is_banned = false, suspension_end_date = NULL WHERE id = $1`;
    params = [mechanicId];
  } else if (actionType === 'unblock') {
    updateQ = `UPDATE mechanic_profiles SET is_blocked = false, total_requests_received = 0, total_requests_accepted = 0, total_requests_rejected = 0 WHERE user_id = $1`;
    params = [mechanicId];
  }

  if (updateQ) await query(updateQ, params);

  // Log Audit
  await query(
    `INSERT INTO audit_logs (admin_id, action_type, target_user_id, reason) VALUES ($1, $2, $3, $4)`,
    [adminId, actionType, mechanicId, reason]
  );

  // TODO: Send notification email/push to mechanic

  return { mechanicId, actionType, reason };
};

/**
 * Update Trust Score (Caps between 0 and 100)
 */
const updateTrustScore = async (mechanicId, points) => {
  await query(
    `UPDATE mechanic_profiles 
     SET trust_score = LEAST(100, GREATEST(0, trust_score + $1)) 
     WHERE user_id = $2`,
    [points, mechanicId]
  );
};

const getDashboardStats = async () => {
  const result = await query(`
    SELECT 
      (SELECT COUNT(*) FROM complaints) as total_complaints,
      (SELECT COUNT(*) FROM complaints WHERE status IN ('pending', 'under_investigation')) as open_complaints,
      (SELECT COUNT(*) FROM complaints WHERE category = 'fraud') as fraud_complaints,
      (SELECT COUNT(*) FROM complaints WHERE category = 'harassment') as harassment_complaints,
      (SELECT COUNT(*) FROM users WHERE is_banned = true AND role = 'mechanic') as banned_mechanics,
      (SELECT COUNT(*) FROM users WHERE suspension_end_date > NOW() AND role = 'mechanic') as suspended_mechanics
  `);
  return result.rows[0];
};

const getSafetyAlerts = async () => {
  const result = await query(`
    SELECT sa.*, c.category, c.description, c.created_at as complaint_date,
           m.full_name as mechanic_name
    FROM safety_alerts sa
    JOIN complaints c ON sa.complaint_id = c.id
    JOIN users m ON c.mechanic_id = m.id
    WHERE sa.status = 'active'
    ORDER BY sa.created_at DESC
  `);
  return result.rows;
};

const getAuditLogs = async () => {
  const result = await query(`
    SELECT al.*, a.full_name as admin_name, t.full_name as target_name, t.email as target_email
    FROM audit_logs al
    JOIN users a ON al.admin_id = a.id
    JOIN users t ON al.target_user_id = t.id
    ORDER BY al.created_at DESC LIMIT 100
  `);
  return result.rows;
};

module.exports = {
  submitComplaint,
  getComplaints,
  updateComplaintStatus,
  applyStrike,
  enforceMechanic,
  getDashboardStats,
  getSafetyAlerts,
  getAuditLogs
};
