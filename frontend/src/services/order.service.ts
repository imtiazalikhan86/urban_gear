import { api } from './http';
import type { Order, OrderListResponse } from '../types/api';

export const orderService = {
  create: (items: Array<{ productId: string; quantity: number }>, marginPercent?: number) =>
    api.post<{ data: Order }>('/orders', { items, marginPercent }),
  list: (status?: string) => api.get<OrderListResponse>('/orders', { status, pageSize: 10 }),
  get: (id: string) => api.get<{ data: Order }>(`/orders/${id}`),
  updateStatus: (id: string, status: 'CONFIRMED' | 'CANCELLED') => api.patch<{ data: Order }>(`/orders/${id}/status`, { status }),
};
