import axios from 'axios';
import { toast } from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor — attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (import.meta.env.DEV) {
    console.log(`API: ${config.method?.toUpperCase()} ${config.url}`);
  }
  
  return config;
}, (error) => Promise.reject(error));

// Response interceptor — handle errors and return data
api.interceptors.response.use(
  (response) => {
    // Return response.data directly so we don't need .data everywhere
    return response.data;
  },
  async (error) => {
    // Network error
    if (!error.response) {
      toast.error('No internet connection or server unreachable');
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          // Send refresh request using standard axios to avoid interceptor loops
          const res = await axios.post('/auth/refresh',
            { refreshToken },
            { baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' }
          );
          const newToken = res.data.data?.accessToken || res.data.accessToken;
          if (newToken) {
            localStorage.setItem('token', newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, clear everything and redirect to login
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }

      // If no refresh token, clear and redirect
      localStorage.clear();
      window.location.href = '/login';
    }

    // Handle 500 Server Error
    if (error.response.status >= 500) {
      toast.error('Server error, please try again');
    }

    return Promise.reject(error);
  }
);

// Export named methods
export const get = api.get;
export const post = api.post;
export const put = api.put;
export const patch = api.patch;
export const del = api.delete;

// Export instance as default
export default api;
