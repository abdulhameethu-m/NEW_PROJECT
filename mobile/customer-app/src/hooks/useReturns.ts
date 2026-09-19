import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { returnsApi } from '../api/returns';
import { ReturnRequest, ReturnsListResponse } from '../types/return';

export function useCustomerReturns(params: { page?: number; limit?: number } = {}) {
  return useQuery<ReturnsListResponse, Error>({
    queryKey: ['returns', params.page || 1, params.limit || 20],
    queryFn: () => returnsApi.getReturns(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useReturnDetails(id?: string) {
  return useQuery<ReturnRequest, Error>({
    queryKey: ['returns', id],
    queryFn: () => (id ? returnsApi.getReturnById(id) : Promise.reject(new Error('No ID provided'))),
    enabled: Boolean(id),
  });
}

export function useCreateReturn() {
  const queryClient = useQueryClient();

  return useMutation<ReturnRequest, Error, FormData>({
    mutationFn: (formData: FormData) => returnsApi.createReturn(formData),
    onSuccess: (newReturn) => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (newReturn.orderId) {
        const orderIdStr = typeof newReturn.orderId === 'object' ? newReturn.orderId._id : newReturn.orderId;
        queryClient.invalidateQueries({ queryKey: ['order', orderIdStr] });
      }
    },
  });
}
