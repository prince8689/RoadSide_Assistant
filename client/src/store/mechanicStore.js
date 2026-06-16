import { create } from 'zustand';
import {
  getMyMechanicProfile, updateAvailability,
  getAvailableRequests, getMechanicStats
} from '../api/mechanicApi';
import { getActiveRequest } from '../api/requestApi';

const useMechanicStore = create((set, get) => ({
  profile: null,
  isAvailable: false,
  availableRequests: [],
  activeJobs: [],
  stats: null,
  isLoading: false,

  fetchProfile: async () => {
    set({ isLoading: true });
    try {
      const res = await getMyMechanicProfile();
      const profileData = res.data?.profile || res.data;
      set({
        profile: profileData,
        isAvailable: profileData?.is_available || false,
        isLoading: false
      });
    } catch { set({ isLoading: false }); }
  },

  toggleAvailability: async () => {
    const current = get().isAvailable;
    try {
      await updateAvailability(!current);
      set({ isAvailable: !current });
      return { success: true };
    } catch {
      return { success: false };
    }
  },

  fetchAvailableRequests: async () => {
    try {
      const res = await getAvailableRequests();
      set({ availableRequests: res.data?.requests || res.data || [] });
    } catch {}
  },

  fetchStats: async () => {
    try {
      const res = await getMechanicStats();
      set({ stats: res.data?.stats || res.data });
    } catch {}
  },

  fetchActiveJobs: async () => {
    try {
      const res = await getActiveRequest();
      set({ activeJobs: res.data?.requests || [] });
    } catch {}
  },

  setActiveJobs: (jobs) => set({ activeJobs: jobs }),
  clearActiveJobs: () => set({ activeJobs: [] }),

  addNewRequest: (request) => {
    set((state) => ({
      availableRequests: [request, ...state.availableRequests]
    }));
  },
  
  removeFromAvailable: (requestId) => {
    set((state) => ({
      availableRequests: state.availableRequests.filter(r => r.id !== requestId)
    }));
  }
}));

export default useMechanicStore;
