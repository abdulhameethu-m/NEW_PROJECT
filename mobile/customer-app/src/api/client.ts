import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';

import { clearCookies } from './cookieManager';

export const apiClient = axios.create({
  baseURL: ENV.API_URL,
  withCredentials: true, // Crucial for native cookie jar handling
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Inject CSRF token if we have it in the store
    const csrfToken = useAuthStore.getState().csrfToken;
    if (csrfToken) {
      config.headers['x-csrf-token'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Ignore 401 on login or refresh to prevent infinite loops
    if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Must fetch a fresh CSRF token before performing POST /auth/refresh
        const csrfResponse = await axios.get(`${ENV.API_URL}/auth/csrf`, { withCredentials: true });
        const freshCsrf = csrfResponse.data?.data?.csrfToken || csrfResponse.data?.csrfToken;
        if (freshCsrf) {
          useAuthStore.getState().setCsrfToken(freshCsrf);
        }

        // Native cookie jar should automatically send the refreshToken cookie
        await apiClient.post('/auth/refresh');
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error);
        // Clear native cookies and reset UI state on complete session failure
        await clearCookies();
        useAuthStore.getState().clearSession();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // CSRF Error handling (403 CSRF_REQUIRED / CSRF_INVALID)
    const errorData = error.response?.data as any;
    if (error.response?.status === 403 && errorData?.code?.includes('CSRF')) {
      // Typically we'd try to fetch a new CSRF token and retry
      // For Phase 1, we just reject, and the caller can call fetchCsrfToken()
      console.warn('CSRF Token error detected for URL:', originalRequest.url, errorData);
    }

    return Promise.reject(error);
  }
);
