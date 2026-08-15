import { apiClient } from './client';
import { useAuthStore, User } from '../stores/authStore';
import { clearCookies } from './cookieManager';
import { LoginFormData, RegisterFormData } from '../utils/validation';
import { ENV } from '../config/env';

export const authApi = {
  fetchCsrfToken: async (): Promise<string | null> => {
    try {
      const response = await apiClient.get('/auth/csrf');
      const csrfToken = response.data?.data?.csrfToken || response.data?.csrfToken;
      if (csrfToken) {
        useAuthStore.getState().setCsrfToken(csrfToken);
      }
      return csrfToken;
    } catch (e) {
      console.warn('Failed to fetch CSRF token', e);
      return null;
    }
  },

  login: async (credentials: LoginFormData): Promise<User> => {
    // 1. Get fresh CSRF token
    await authApi.fetchCsrfToken();
    
    // 2. Perform backend login (sets cookies natively)
    const response = await apiClient.post('/auth/login', credentials);
    const user = response.data?.data?.user || response.data?.user;
    
    return user;
  },

  register: async (data: RegisterFormData): Promise<User> => {
    // 1. Get fresh CSRF token
    await authApi.fetchCsrfToken();
    
    // 2. Perform backend registration (sets cookies natively and returns user payload)
    const payload = {
      name: data.name,
      phone: data.phone,
      password: data.password,
      ...(data.email ? { email: data.email } : {}),
    };
    const response = await apiClient.post('/auth/register', payload);
    const user = response.data?.data?.user || response.data?.user;
    
    return user;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    const user = response.data?.data || response.data;
    return user;
  },

  logout: async () => {
    // 1. Attempt backend logout
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.warn('Backend logout failed or network error', e);
    } 
    
    // 2. Clear native cookies securely
    try {
      await clearCookies();
    } catch (e) {
      console.error('Failed to clear native cookies', e);
    }

    // 3. Update UI State (this handles clearing user data)
    useAuthStore.getState().clearSession();
  },

  findUserForRecovery: async (identifier: string) => {
    await authApi.fetchCsrfToken();
    const response = await apiClient.post('/auth/forgot-username', { identifier });
    return response.data?.data || response.data;
  },

  requestPasswordResetOTP: async (identifier: string) => {
    await authApi.fetchCsrfToken();
    const response = await apiClient.post('/auth/password-reset-otp/request', { identifier });
    return response.data?.data || response.data;
  },

  verifyPasswordResetOTP: async (email: string, otp: string) => {
    await authApi.fetchCsrfToken();
    const response = await apiClient.post('/auth/password-reset-otp/verify', { email, otp });
    return response.data?.data || response.data;
  },

  resetPassword: async (token: string, password: string) => {
    await authApi.fetchCsrfToken();
    const response = await apiClient.post('/auth/password-reset/confirm', { token, password });
    return response.data?.data || response.data;
  },
};
