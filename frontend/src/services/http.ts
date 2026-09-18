import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

const ACCESS_TOKEN_KEY = 'urbangear.accessToken';
const REFRESH_TOKEN_KEY = 'urbangear.refreshToken';

export const tokenStorage = {
  access: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  refresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  save: (accessToken: string, refreshToken?: string | null) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export const http = axios.create({
  baseURL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = tokenStorage.access();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function endSession() {
  tokenStorage.clear();
  // The store cannot be imported here without a cycle, so App listens for this.
  window.dispatchEvent(new Event('urbangear:unauthorized'));
}

/**
 * One refresh at a time: a burst of 401s from parallel requests all wait on the same
 * exchange instead of each spending the (single-use, rotating) refresh token.
 */
let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.refresh();
  if (!refreshToken) throw new Error('No refresh token stored');

  // A bare client, so this call cannot recurse through the interceptor below.
  const response = await axios.post<{ data: { accessToken: string; refreshToken: string } }>(
    `${baseURL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' }, timeout: 10000 },
  );
  const { accessToken, refreshToken: rotated } = response.data.data;
  tokenStorage.save(accessToken, rotated);
  window.dispatchEvent(new Event('urbangear:refreshed'));
  return accessToken;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const isAuthCall = original?.url?.includes('/auth/refresh') || original?.url?.includes('/auth/login');

    if (status !== 401 || !original || original._retried || isAuthCall) {
      if (status === 401 && !isAuthCall) endSession();
      return Promise.reject(error);
    }

    original._retried = true;
    try {
      refreshInFlight =
        refreshInFlight ??
        refreshAccessToken().finally(() => {
          refreshInFlight = null;
        });
      const accessToken = await refreshInFlight;
      original.headers = AxiosHeaders.from(original.headers ?? {});
      original.headers.set('Authorization', `Bearer ${accessToken}`);
      return await http(original);
    } catch {
      endSession();
      return Promise.reject(error);
    }
  },
);

export const api = {
  get: <T>(url: string, params?: object) => http.get<T>(url, { params }).then((response) => response.data),
  post: <T>(url: string, body?: unknown) => http.post<T>(url, body).then((response) => response.data),
  put: <T>(url: string, body?: unknown) => http.put<T>(url, body).then((response) => response.data),
  patch: <T>(url: string, body?: unknown) => http.patch<T>(url, body).then((response) => response.data),
  delete: <T>(url: string) => http.delete<T>(url).then((response) => response.data),
};
