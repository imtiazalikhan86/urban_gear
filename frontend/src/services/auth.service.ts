import { api } from './http';
import type { LoginResponse, User } from '../types/api';

export const authService = {
  login: (email: string, password: string) => api.post<LoginResponse>('/auth/login', { email, password }),
  me: () => api.get<{ data: User }>('/auth/me'),
  updateMargin: (marginPercent: number) => api.patch<{ data: User }>('/auth/me/margin', { marginPercent }),
};
