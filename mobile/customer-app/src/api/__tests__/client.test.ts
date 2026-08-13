import { apiClient } from '../client';
import { ENV } from '../../config/env';

describe('API Client', () => {
  it('should be created with the correct base URL', () => {
    expect(apiClient.defaults.baseURL).toBe(ENV.API_URL);
  });

  it('should have withCredentials enabled', () => {
    expect(apiClient.defaults.withCredentials).toBe(true);
  });
});
