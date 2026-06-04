import api from './axios';

export const getServiceCategories = () => api.get('/services');
export const createRequest = (data) => api.post('/requests', data);
export const getMyRequests = () => api.get('/requests');
export const getActiveRequest = () => api.get('/requests/active');
export const cancelRequest = (id, reason) =>
  api.patch(`/requests/${id}/cancel`, { cancel_reason: reason });
export const getNearbyMechanics = (lat, lng, radius = 10) =>
  api.get(`/mechanics/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
export const getRequestById = (id) => api.get(`/requests/${id}`);
export const getLastLocation = (mechanicId) =>
  api.get(`/tracking/${mechanicId}/location`);
