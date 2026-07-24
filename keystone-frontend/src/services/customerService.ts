// services/customerService.ts
import api from './api';
import { ApiResponse, Customer, PageResponse, Site } from '@/types';

export const customerService = {
  getAll: async (params: { page?: number; size?: number; search?: string }) => {
    const res = await api.get<ApiResponse<PageResponse<Customer>>>('/customers', { params });
    return res.data.data;
  },
  getById: async (id: number) => {
    const res = await api.get<ApiResponse<Customer>>(`/customers/${id}`);
    return res.data.data;
  },
  create: async (data: { name: string; email?: string; phone?: string; address?: string }) => {
    const res = await api.post<ApiResponse<Customer>>('/customers', data);
    return res.data.data;
  },
  update: async (id: number, data: Partial<Customer>) => {
    const res = await api.put<ApiResponse<Customer>>(`/customers/${id}`, data);
    return res.data.data;
  },
  delete: async (id: number) => { await api.delete(`/customers/${id}`); },

  getSitesByCustomer: async (customerId: number) => {
    const res = await api.get<ApiResponse<Site[]>>(`/sites/customer/${customerId}/all`);
    return res.data.data;
  },
  createSite: async (data: {
    customerId: number; name: string; address: string;
    city?: string; latitude?: number; longitude?: number;
  }) => {
    const res = await api.post<ApiResponse<Site>>('/sites', data);
    return res.data.data;
  },
};
