import { create } from 'zustand';
import { getNotifications, getUnreadCount, markAllRead } from '../api/notificationApi';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await getNotifications();
      set({
        notifications: res.data?.notifications || [],
        isLoading: false
      });
    } catch { set({ isLoading: false }); }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await getUnreadCount();
      set({ unreadCount: res.data?.unread_count || 0 });
    } catch {}
  },

  markAllAsRead: async () => {
    try {
      await markAllRead();
      set({ unreadCount: 0, notifications: [] });
    } catch {}
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    }));
  },

  setUnreadCount: (count) => set({ unreadCount: count }),
}));

export default useNotificationStore;
