// services/workOrderService.ts
import api from './api';
import { ApiResponse, PageResponse, WorkOrder, WorkOrderStatus } from '@/types';

const BASE = '/workorders';

export const workOrderService = {
  getAll: async (params: {
    status?: WorkOrderStatus; customerId?: number;
    assignedToId?: number; search?: string; page?: number; size?: number;
  }) => {
    const res = await api.get<ApiResponse<PageResponse<WorkOrder>>>(BASE, { params });
    return res.data.data;
  },

  getMy: async (params: { status?: WorkOrderStatus; page?: number; size?: number }) => {
    const res = await api.get<ApiResponse<PageResponse<WorkOrder>>>(`${BASE}/my`, { params });
    return res.data.data;
  },

  getById: async (id: number) => {
    const res = await api.get<ApiResponse<WorkOrder>>(`${BASE}/${id}`);
    return res.data.data;
  },

  create: async (data: {
    title: string; description?: string; priority: string;
    siteId: number; customerId: number; assignedToId?: number; dueDate?: string;
  }) => {
    const res = await api.post<ApiResponse<WorkOrder>>(BASE, data);
    return res.data.data;
  },

  assign: async (id: number, technicianId: number) => {
    const res = await api.post<ApiResponse<WorkOrder>>(`${BASE}/${id}/assign`, { technicianId });
    return res.data.data;
  },

  updateStatus: async (id: number, status: WorkOrderStatus, reason?: string) => {
    const res = await api.post<ApiResponse<WorkOrder>>(`${BASE}/${id}/status`, { status, reason });
    return res.data.data;
  },

  delete: async (id: number) => {
    await api.delete(`${BASE}/${id}`);
  },
};
