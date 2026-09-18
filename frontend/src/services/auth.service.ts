import { api } from './http';
import type { LoginResponse, User } from '../types/api';

export const authService = {
  login: (email: string, password: string) => api.post<LoginResponse>('/auth/login', { email, password }),
  me: () => api.get<{ data: User }>('/auth/me'),
  logout: (refreshToken: string) => api.post<void>('/auth/logout', { refreshToken }),
  updateMargin: (marginPercent: number) => api.patch<{ data: User }>('/auth/me/margin', { marginPercent }),
  changePassword: (currentPassword: string, newPassword: string) => api.patch<void>('/auth/me/password', { currentPassword, newPassword }),
  forgotPassword: (email: string) => api.post<{ data: { message: string } }>('/auth/password/forgot', { email }),
  resetPassword: (token: string, newPassword: string) => api.post<void>('/auth/password/reset', { token, newPassword }),
};
