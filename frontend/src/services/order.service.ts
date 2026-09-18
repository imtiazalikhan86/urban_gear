import { api } from './http';
import type { Order, OrderListResponse } from '../types/api';

export const orderService = {
  create: (items: Array<{ productId: string; quantity: number }>, marginPercent?: number) =>
    api.post<{ data: Order }>('/orders', { items, marginPercent }),
  list: (status?: string, pageSize = 10) => api.get<OrderListResponse>('/orders', { status, pageSize }),
  get: (id: string) => api.get<{ data: Order }>(`/orders/${id}`),
  updateStatus: (id: string, status: 'CONFIRMED' | 'CANCELLED') => api.patch<{ data: Order }>(`/orders/${id}/status`, { status }),
};
