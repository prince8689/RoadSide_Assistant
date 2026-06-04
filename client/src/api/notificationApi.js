import api from './axios';

export const getNotifications = (page = 1) =>
  api.get(`/notifications?page=${page}&limit=20`);
export const getUnreadCount = () => api.get('/notifications/unread-count');
export const markAllRead = () => api.patch('/notifications/mark-all-read');
export const markRead = (ids) =>
  api.patch('/notifications/mark-read', { notification_ids: ids });
