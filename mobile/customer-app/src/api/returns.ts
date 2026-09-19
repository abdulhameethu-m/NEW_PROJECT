import { apiClient } from './client';
import { ReturnRequest, ReturnsListResponse } from '../types/return';

export const returnsApi = {
  createReturn: async (formData: FormData): Promise<ReturnRequest> => {
    const response = await apiClient.post<{ success: boolean; data: ReturnRequest; message: string }>(
      '/returns',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  },

  getReturns: async (params: { page?: number; limit?: number } = {}): Promise<ReturnsListResponse> => {
    const response = await apiClient.get<{ success: boolean; returns?: ReturnRequest[]; data?: any; total?: number }>(
      '/returns',
      { params }
    );
    const data = response.data;
    const items = data.returns || data.data?.returns || (Array.isArray(data.data) ? data.data : []);
    return {
      returns: items,
      total: data.total || data.data?.total || items.length,
      page: params.page || 1,
      limit: params.limit || 20,
    };
  },

  getReturnById: async (id: string): Promise<ReturnRequest> => {
    const response = await apiClient.get<{ success: boolean; data: ReturnRequest; message: string }>(
      `/returns/${id}`
    );
    return response.data.data;
  },
};
