import { create } from 'zustand';
import {
  getMyMechanicProfile, updateAvailability,
  getAvailableRequests, getMechanicStats
} from '../api/mechanicApi';

const useMechanicStore = create((set, get) => ({
  profile: null,
  isAvailable: false,
  availableRequests: [],
  activeJob: null,
  stats: null,
  isLoading: false,

  fetchProfile: async () => {
    set({ isLoading: true });
    try {
      const res = await getMyMechanicProfile();
      const profile = res.data.data || res.data;
      set({
        profile,
        isAvailable: profile.is_available,
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
      set({ availableRequests: res.data.data || [] });
    } catch {}
  },

  fetchStats: async () => {
    try {
      const res = await getMechanicStats();
      set({ stats: res.data.data || res.data });
    } catch {}
  },

  setActiveJob: (job) => set({ activeJob: job }),
  clearActiveJob: () => set({ activeJob: null }),

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
