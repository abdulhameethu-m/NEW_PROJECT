import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prepareCheckout, createOrder, PrepareCheckoutParams } from '../api/checkout';
import { PreparedCheckoutSummary, CreateOrderPayload, CreateOrderResult } from '../types/checkout';
import { CART_QUERY_KEY } from './useCart';

export function usePrepareCheckout(
  params: PrepareCheckoutParams,
  options?: { enabled?: boolean }
) {
  const addressKey = params.shippingAddress
    ? `${params.shippingAddress.postalCode}-${params.shippingAddress.line1}`
    : 'no-address';
  const paymentKey = params.paymentMethod || 'COD';

  return useQuery<PreparedCheckoutSummary, Error>({
    queryKey: ['checkout', 'prepare', addressKey, paymentKey],
    queryFn: () => prepareCheckout(params),
    enabled: options?.enabled !== false,
    staleTime: 1000 * 30, // 30 seconds
    retry: 1,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation<CreateOrderResult, Error, CreateOrderPayload>({
    mutationFn: createOrder,
    onSuccess: () => {
      // Clear cart immediately on successful order placement
      queryClient.setQueryData(CART_QUERY_KEY, {
        _id: '',
        userId: '',
        items: [],
        totalAmount: 0,
        itemCount: 0,
        currency: 'INR',
      });
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}
