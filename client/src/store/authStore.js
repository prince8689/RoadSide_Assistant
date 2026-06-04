import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loginUser, registerUser, logoutUser, getMe } from '../api/authApi';

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
          const { user, token } = res.data.data || res.data;
          localStorage.setItem('token', token);
          set({ user, token, isLoading: false });
          return { success: true, role: user.role };
        } catch (err) {
          const msg = err.response?.data?.message || err.response?.data?.error || 'Login failed';
          set({ isLoading: false, error: msg });
          return { success: false, error: msg };
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const res = await registerUser(data);
          const { user, token } = res.data.data || res.data;
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
        localStorage.removeItem('token');
        set({ user: null, token: null });
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
