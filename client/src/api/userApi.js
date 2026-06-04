import api from './axios';

export const getMyProfile = () => api.get('/users/profile');
export const updateProfile = (data) => api.patch('/users/profile', data);
export const getMyVehicles = () => api.get('/users/vehicles');
export const addVehicle = (data) => api.post('/users/vehicles', data);
export const deleteVehicle = (id) => api.delete(`/users/vehicles/${id}`);
