import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { clearCookies } from './cookieManager';
import { logToTerminal } from '../utils/errorHandler';

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

let csrfFetchPromise: Promise<string | null> | null = null;

export async function ensureCsrfToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh) {
    const currentToken = useAuthStore.getState().csrfToken;
    if (currentToken) return currentToken;
  }

  if (!csrfFetchPromise) {
    csrfFetchPromise = (async () => {
      try {
        const response = await axios.get(`${ENV.API_URL}/auth/csrf`, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Bypass-Tunnel-Reminder': 'true',
          },
        });
        const token = response.data?.data?.csrfToken || response.data?.csrfToken;
        if (token) {
          useAuthStore.getState().setCsrfToken(token);
        }
        return token || null;
      } catch (e) {
        return null;
      } finally {
        csrfFetchPromise = null;
      }
    })();
  }
  return csrfFetchPromise;
}

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const method = (config.method || 'get').toLowerCase();
    const isStateMutating = !['get', 'head', 'options'].includes(method);

    let csrfToken = useAuthStore.getState().csrfToken;
    if (isStateMutating && !csrfToken) {
      csrfToken = await ensureCsrfToken();
    }

    if (csrfToken) {
      config.headers['x-csrf-token'] = csrfToken;
      const existingCookie = (config.headers['Cookie'] as string) || '';
      if (!existingCookie.includes('csrf_token=')) {
        config.headers['Cookie'] = existingCookie
          ? `${existingCookie}; csrf_token=${csrfToken}`
          : `csrf_token=${csrfToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _csrfRetry?: boolean };

    const isRoutineAuthCheck =
      (error.response?.status === 401 &&
        (originalRequest?.url?.includes('/auth/me') ||
          originalRequest?.url?.includes('/users/me') ||
          originalRequest?.url?.includes('/auth/login') ||
          originalRequest?.url?.includes('/auth/refresh'))) ||
      (error.response?.status === 403 &&
        String((error.response?.data as any)?.code || '').includes('CSRF'));

    // Log genuine unexpected API failures to developer terminal
    if (!isRoutineAuthCheck) {
      logToTerminal(`API ${originalRequest?.method?.toUpperCase() || 'REQUEST'} ${originalRequest?.url || ''}`, error);
    }

    // Ignore 401 on login or refresh to prevent infinite loops
    if (originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    // Handle session expiration for logged-in requests (excluding initial /auth/me check for guests)
    const isInitialAuthCheck = originalRequest?.url?.includes('/auth/me') || originalRequest?.url?.includes('/users/me');

    if (error.response?.status === 401 && !originalRequest._retry && !isInitialAuthCheck) {
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
        await ensureCsrfToken();
        await apiClient.post('/auth/refresh');
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error);
        await clearCookies();
        useAuthStore.getState().clearSession();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Transparent CSRF Retry: If a request fails with 403 CSRF error, fetch fresh token and retry once
    const errorData = error.response?.data as any;
    if (error.response?.status === 403 && String(errorData?.code || '').includes('CSRF') && !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true;
      try {
        useAuthStore.getState().setCsrfToken(null);
        const freshToken = await ensureCsrfToken(true);
        if (freshToken) {
          originalRequest.headers['x-csrf-token'] = freshToken;
          const existingCookie = (originalRequest.headers['Cookie'] as string) || '';
          originalRequest.headers['Cookie'] = existingCookie
            ? `${existingCookie.replace(/csrf_token=[^;]+;?\s*/, '')}; csrf_token=${freshToken}`
            : `csrf_token=${freshToken}`;
          return apiClient(originalRequest);
        }
      } catch (csrfRetryErr) {
        return Promise.reject(csrfRetryErr);
      }
    }

    return Promise.reject(error);
  }
);
