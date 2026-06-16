import api from './axios';

export const getMyMechanicProfile  = () => api.get('/mechanics/profile');
export const updateMechanicProfile = (data) => api.patch('/mechanics/profile', data);
export const createMechanicProfile = (data) => api.post('/mechanics/profile', data);
export const updateLocation = (lat, lng) =>
  api.patch('/mechanics/location', { current_lat: lat, current_lng: lng });
export const updateAvailability = (isAvailable) =>
  api.patch('/mechanics/availability', { is_available: isAvailable });
export const getAvailableRequests  = () => api.get('/requests/available');
export const acceptRequest  = (id) => api.patch(`/requests/${id}/accept`);
export const rejectRequest  = (id) => api.patch(`/requests/${id}/reject`);
export const updateStatus   = (id, status) =>
  api.patch(`/requests/${id}/status`, { status });
export const getMechanicStats = () => api.get('/mechanics/stats');
export const getJobHistory  = () => api.get('/history');
export const getMechanicReviews = (id) =>
  api.get(`/reviews/mechanic/${id}`);
export const getMyServices = () => api.get('/mechanics/services');
export const updateMyServices = (services) => api.put('/mechanics/services', { services });
export const createServiceCategory = (data) => api.post('/services', data);
export const generateInvoice = (requestId, items) => api.post(`/billing/request/${requestId}/generate`, { items });
