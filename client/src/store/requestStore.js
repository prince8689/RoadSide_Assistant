import { create } from 'zustand';
import { getActiveRequest, getMyRequests } from '../api/requestApi';

const useRequestStore = create((set) => ({
  activeRequest: null,
  requests: [],
  mechanicLocation: null,
  isLoading: false,

  fetchActiveRequest: async () => {
    try {
      const res = await getActiveRequest();
      set({ activeRequest: res.data.data || null });
    } catch { set({ activeRequest: null }); }
  },

  fetchMyRequests: async () => {
    set({ isLoading: true });
    try {
      const res = await getMyRequests();
      set({
        requests: res.data.data || [],
        isLoading: false
      });
    } catch { set({ isLoading: false }); }
  },

  updateActiveRequest: (data) => {
    set((state) => ({
      activeRequest: state.activeRequest
        ? { ...state.activeRequest, status: data.newStatus, ...data }
        : null
    }));
  },

  updateMechanicLocation: (data) => {
    set({ mechanicLocation: { lat: data.lat, lng: data.lng } });
  },

  clearActiveRequest: () => set({ activeRequest: null, mechanicLocation: null }),
}));

export default useRequestStore;
