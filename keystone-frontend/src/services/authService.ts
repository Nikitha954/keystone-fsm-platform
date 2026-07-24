// services/authService.ts
import api from './api';
import { AuthResponse, ApiResponse } from '@/types';

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post<ApiResponse<AuthResponse>>('/auth/login', { email, password });
    return res.data.data;
  },
  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const res = await api.post<ApiResponse<AuthResponse>>(`/auth/refresh?refreshToken=${refreshToken}`);
    return res.data.data;
  },
};
