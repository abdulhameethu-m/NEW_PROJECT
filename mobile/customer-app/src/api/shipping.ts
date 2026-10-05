import { apiClient } from './client';

export const getShippingStates = async (): Promise<string[]> => {
  try {
    const { data } = await apiClient.get('/shipping/locations/states');
    return data?.data?.states || ['Tamil Nadu', 'Other'];
  } catch {
    return ['Tamil Nadu', 'Other'];
  }
};

export const getShippingDistricts = async (state: string): Promise<string[]> => {
  if (!state) return [];
  try {
    const { data } = await apiClient.get('/shipping/locations/districts', {
      params: { state },
    });
    return data?.data?.districts || [];
  } catch {
    return [];
  }
};
