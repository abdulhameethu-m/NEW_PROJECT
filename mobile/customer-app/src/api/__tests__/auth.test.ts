import { authApi } from '../auth';
import { apiClient, ensureCsrfToken } from '../client';
import { useAuthStore } from '../../stores/authStore';
import CookieManager from '@preeternal/react-native-cookie-manager';

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
  ensureCsrfToken: jest.fn().mockResolvedValue('test-csrf'),
}));

jest.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      setCsrfToken: jest.fn(),
      clearSession: jest.fn(),
    })),
  },
}));

jest.mock('@preeternal/react-native-cookie-manager', () => ({
  clearAll: jest.fn(),
}));

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetchCsrfToken fetches and stores token', async () => {
    (ensureCsrfToken as jest.Mock).mockResolvedValueOnce('test-csrf');
    const token = await authApi.fetchCsrfToken();
    expect(token).toBe('test-csrf');
    expect(ensureCsrfToken).toHaveBeenCalledWith(true);
  });

  it('logout calls backend and clears cookies natively', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({});
    (CookieManager.clearAll as jest.Mock).mockResolvedValueOnce(true);
    
    await authApi.logout();
    
    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
    expect(CookieManager.clearAll).toHaveBeenCalled();
  });
});
