import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listAddresses, createAddress, deleteAddress } from '../api/address';
import { UserAddress } from '../types/checkout';
import { useAuthStore } from '../stores/authStore';

export const ADDRESSES_QUERY_KEY = ['user', 'addresses'];

export function useAddresses() {
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  return useQuery<UserAddress[], Error>({
    queryKey: ADDRESSES_QUERY_KEY,
    queryFn: listAddresses,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();

  return useMutation<UserAddress, Error, Omit<UserAddress, '_id'>>({
    mutationFn: createAddress,
    onSuccess: (newAddress) => {
      queryClient.setQueryData<UserAddress[]>(ADDRESSES_QUERY_KEY, (prev = []) => {
        if (newAddress.isDefault) {
          return [newAddress, ...prev.map((a) => ({ ...a, isDefault: false }))];
        }
        return [newAddress, ...prev];
      });
      queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation<{ _id: string }, Error, string>({
    mutationFn: deleteAddress,
    onSuccess: (result) => {
      queryClient.setQueryData<UserAddress[]>(ADDRESSES_QUERY_KEY, (prev = []) =>
        prev.filter((a) => a._id !== result._id)
      );
      queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
    },
  });
}
