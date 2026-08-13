import { authApi } from '../auth';
import { apiClient } from '../client';
import { useAuthStore } from '../../stores/authStore';
import CookieManager from '@preeternal/react-native-cookie-manager';

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
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
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: { csrfToken: 'test-csrf' } } });
    const token = await authApi.fetchCsrfToken();
    expect(token).toBe('test-csrf');
    expect(apiClient.get).toHaveBeenCalledWith('/auth/csrf');
  });

  it('logout calls backend and clears cookies natively', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({});
    (CookieManager.clearAll as jest.Mock).mockResolvedValueOnce(true);
    
    await authApi.logout();
    
    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
    expect(CookieManager.clearAll).toHaveBeenCalled();
  });
});
