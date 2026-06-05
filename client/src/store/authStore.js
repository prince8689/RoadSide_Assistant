import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loginUser, registerUser, logoutUser, getMe, sendOtp } from '../api/authApi';
import useRequestStore from './requestStore';
import useNotificationStore from './notificationStore';
import { disconnectSocket } from '../socket/socketClient';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await loginUser({ email, password });
          const { user, accessToken, token: fallbackToken } = res.data.data || res.data;
          const token = accessToken || fallbackToken;
          localStorage.setItem('token', token);
          set({ user, token, isLoading: false });
          return { success: true, role: user.role };
        } catch (err) {
          const msg = err.response?.data?.message || err.response?.data?.error || 'Login failed';
          set({ isLoading: false, error: msg });
          return { success: false, error: msg };
        }
      },

      sendOtp: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const res = await sendOtp(data);
          set({ isLoading: false });
          return { success: true, message: res.data.message || 'OTP sent successfully' };
        } catch (err) {
          const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to send OTP';
          set({ isLoading: false, error: msg });
          return { success: false, error: msg };
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const res = await registerUser(data);
          const { user, accessToken, token: fallbackToken } = res.data.data || res.data;
          const token = accessToken || fallbackToken;
          localStorage.setItem('token', token);
          set({ user, token, isLoading: false });
          return { success: true, role: user.role };
        } catch (err) {
          const msg = err.response?.data?.message || err.response?.data?.error || 'Registration failed';
          set({ isLoading: false, error: msg });
          return { success: false, error: msg };
        }
      },

      logout: async () => {
        try { await logoutUser(); } catch {}

        // Clear all stores
        localStorage.removeItem('token');
        localStorage.removeItem('auth-storage');

        // Reset all Zustand stores
        useRequestStore.getState().clearActiveRequest();
        useNotificationStore.setState({
          notifications: [], unreadCount: 0
        });

        // Disconnect socket
        disconnectSocket();

        // Reset auth store
        set({ user: null, token: null, error: null });

        window.location.href = '/login';
      },

      fetchMe: async () => {
        try {
          const res = await getMe();
          set({ user: res.data.data || res.data.user });
        } catch {
          get().logout();
        }
      },

      isAuthenticated: () => !!get().token,
      isUser: () => get().user?.role === 'user',
      isMechanic: () => get().user?.role === 'mechanic',
      isAdmin: () => get().user?.role === 'admin',
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

export default useAuthStore;
