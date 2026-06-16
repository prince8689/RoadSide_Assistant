import { create } from 'zustand';
import {
  getDashboardStats, getAllUsers,
  getPendingMechanics, getAllRequests
} from '../api/adminApi';

const useAdminStore = create((set) => ({
  stats: null,
  users: [],
  pendingMechanics: [],
  requests: [],
  isLoading: false,
  pagination: {},

  fetchStats: async () => {
    try {
      const res = await getDashboardStats();
      set({ stats: res.data?.stats || res.data });
    } catch {}
  },

  fetchUsers: async (params = {}) => {
    set({ isLoading: true });
    try {
      const res = await getAllUsers(params);
      set({
        users: res.data?.users || res.data || [],
        pagination: res.data.pagination || {},
        isLoading: false
      });
    } catch { set({ isLoading: false }); }
  },

  fetchPendingMechanics: async () => {
    try {
      const res = await getPendingMechanics();
      set({ pendingMechanics: res.data?.mechanics || res.data || [] });
    } catch {}
  },

  fetchRequests: async (params = {}) => {
    set({ isLoading: true });
    try {
      const res = await getAllRequests(params);
      set({
        requests: res.data?.requests || res.data || [],
        pagination: res.data.pagination || {},
        isLoading: false
      });
    } catch { set({ isLoading: false }); }
  },

  updateLiveStats: (newStats) => {
    set((state) => ({ stats: { ...state.stats, ...newStats } }));
  },
}));

export default useAdminStore;
