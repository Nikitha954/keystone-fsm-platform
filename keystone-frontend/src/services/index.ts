// services/partService.ts
import api from './api';
import { ApiResponse, PageResponse, Part } from '@/types';

export const partService = {
  getAll: async (params: { page?: number; size?: number }) => {
    const res = await api.get<ApiResponse<PageResponse<Part>>>('/parts', { params });
    return res.data.data;
  },
  getLowStock: async () => {
    const res = await api.get<ApiResponse<Part[]>>('/parts/low-stock');
    return res.data.data;
  },
  create: async (data: {
    partNumber: string; name: string; description?: string;
    unitCost: number; stockQty: number; minStock: number;
  }) => {
    const res = await api.post<ApiResponse<Part>>('/parts', data);
    return res.data.data;
  },
  logUsage: async (workOrderId: number, data: { partId: number; quantity: number; notes?: string }) => {
    await api.post(`/parts/workorder/${workOrderId}/usage`, data);
  },
  adjustStock: async (id: number, quantity: number) => {
    const res = await api.patch<ApiResponse<Part>>(`/parts/${id}/stock?quantity=${quantity}`);
    return res.data.data;
  },
};

// services/dashboardService.ts
export const dashboardService = {
  getManagerDashboard: async () => {
    const res = await api.get<ApiResponse<any>>('/dashboard/manager');
    return res.data.data;
  },
  getTechnicianDashboard: async () => {
    const res = await api.get<ApiResponse<any>>('/dashboard/technician');
    return res.data.data;
  },
};

// services/notificationService.ts
export const notificationService = {
  getAll: async (params: { page?: number; size?: number }) => {
    const res = await api.get<ApiResponse<PageResponse<any>>>('/notifications', { params });
    return res.data.data;
  },
  getUnreadCount: async () => {
    const res = await api.get<ApiResponse<{ unreadCount: number }>>('/notifications/unread-count');
    return res.data.data.unreadCount;
  },
  markAllRead: async () => { await api.post('/notifications/mark-all-read'); },
};

// services/userService.ts
import { User } from '@/types';
export const userService = {
  getTechnicians: async () => {
    const res = await api.get<ApiResponse<User[]>>('/users/technicians');
    return res.data.data;
  },
  getAll: async (params: { page?: number; size?: number; search?: string }) => {
    const res = await api.get<ApiResponse<PageResponse<User>>>('/users', { params });
    return res.data.data;
  },
  create: async (data: {
    username: string; email: string; password: string;
    firstName: string; lastName: string; phone?: string; roles: string[];
  }) => {
    const res = await api.post<ApiResponse<User>>('/users', data);
    return res.data.data;
  },
  toggleStatus: async (id: number) => {
    const res = await api.patch<ApiResponse<User>>(`/users/${id}/toggle-status`);
    return res.data.data;
  },
};
