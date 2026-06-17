import api from './axios';

// Dashboard
export const getDashboardStats = () => api.get('/admin/dashboard');

// Users
export const getAllUsers = (params) => api.get('/admin/users', { params });
export const getUserDetails = (id) => api.get(`/admin/users/${id}`);
export const updateUserStatus = (id, isActive) =>
  api.patch(`/admin/users/${id}/status`, { is_active: isActive });
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);

// Mechanics
export const getPendingMechanics = () => api.get('/admin/mechanics/pending');
export const verifyMechanic = (id, data) =>
  api.patch(`/admin/mechanics/${id}/verify`, data);

// Requests
export const getAllRequests = (params) => api.get('/admin/requests', { params });
export const getRequestDetails = (id) => api.get(`/admin/requests/${id}`);

// Categories
export const getAllCategories = () => api.get('/admin/categories');
export const createCategory = (data) => api.post('/admin/categories', data);
export const updateCategory = (id, data) => api.patch(`/admin/categories/${id}`, data);

// Reports
export const getRequestsReport = (params) =>
  api.get('/admin/reports/requests', { params });
export const getMechanicPerformance = () =>
  api.get('/admin/reports/mechanics');

// Complaints & Enforcement
export const getComplaints = (params) => api.get('/complaints/admin', { params });
export const updateComplaintStatus = (id, data) => api.patch(`/complaints/admin/${id}/status`, data);
export const enforceMechanicAction = (mechanicId, data) => api.post(`/complaints/admin/enforce/${mechanicId}`, data);
export const getSafetyAlerts = () => api.get('/complaints/admin/safety-alerts');
export const getAuditLogs = () => api.get('/complaints/admin/audit-logs');

// Billing
export const getFinancialStats = () => api.get('/billing/admin/stats');

// Settings
export const getAdminSettings = () => api.get('/admin/settings');
export const updateAdminSettings = (data) => api.patch('/admin/settings', data);
