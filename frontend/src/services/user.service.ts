import { api } from './http';
import type { User, UserRole, UserStatus } from '../types/api';

export interface UserListResponse {
  data: Array<Required<Pick<User, 'id' | 'name' | 'email' | 'role'>> & { status: UserStatus; createdAt: string }>;
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface UserCreateInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export const userService = {
  list: (filters: { search?: string; role?: UserRole; status?: UserStatus } = {}) =>
    api.get<UserListResponse>('/users', { ...filters, pageSize: 50 }),
  create: (user: UserCreateInput) => api.post<{ data: User }>('/users', user),
  update: (id: string, changes: { name?: string; email?: string; role?: UserRole; status?: UserStatus }) =>
    api.patch<{ data: User }>(`/users/${id}`, changes),
  resetPassword: (id: string, password: string) => api.post<void>(`/users/${id}/reset-password`, { password }),
  suspend: (id: string) => api.delete<{ data: User }>(`/users/${id}`),
};
