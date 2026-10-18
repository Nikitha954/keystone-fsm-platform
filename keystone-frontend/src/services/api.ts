// services/api.ts - Central Axios instance with JWT injection and error handling

import axios, { AxiosInstance, AxiosError } from 'axios';
import toast from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor: inject JWT token into every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401/expired session → redirect to login; show error toasts
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status;
    const isAuthRoute = error.config?.url?.includes('/auth/');
    const errorMessage = error.response?.data?.message || '';

    if (status === 401 && !isAuthRoute) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (status === 403 && !isAuthRoute) {
      if (errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('token') || !localStorage.getItem('accessToken')) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }
      toast.error(errorMessage || 'Access denied: insufficient permissions');
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;
