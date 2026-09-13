import axios from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('urbangear.accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) localStorage.removeItem('urbangear.accessToken');
    return Promise.reject(error);
  },
);

export const api = {
  get: <T>(url: string, params?: object) => http.get<T>(url, { params }).then((response) => response.data),
  post: <T>(url: string, body?: unknown) => http.post<T>(url, body).then((response) => response.data),
  put: <T>(url: string, body?: unknown) => http.put<T>(url, body).then((response) => response.data),
  patch: <T>(url: string, body?: unknown) => http.patch<T>(url, body).then((response) => response.data),
  delete: <T>(url: string) => http.delete<T>(url).then((response) => response.data),
};
