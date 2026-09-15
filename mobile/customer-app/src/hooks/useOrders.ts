import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrders, getOrderById, getOrderTracking, cancelOrder, CancelOrderPayload } from '../api/order';
import { Order, OrdersListResponse, OrderTrackingInfo } from '../types/order';
import { useAuthStore } from '../stores/authStore';

export const ORDERS_QUERY_KEY = ['orders'];
export const ORDER_DETAILS_QUERY_KEY = (id: string) => ['orders', id];
export const ORDER_TRACKING_QUERY_KEY = (id: string) => ['orders', id, 'tracking'];

export function useOrders(statusFilter?: string, page: number = 1, limit: number = 20) {
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  return useQuery<OrdersListResponse, Error>({
    queryKey: [...ORDERS_QUERY_KEY, { status: statusFilter || 'ALL', page, limit }],
    queryFn: () =>
      getOrders({
        page,
        limit,
        status: statusFilter && statusFilter !== 'ALL' ? statusFilter : undefined,
      }),
    enabled: isAuthenticated,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useOrderDetails(orderId?: string) {
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  return useQuery<Order, Error>({
    queryKey: ORDER_DETAILS_QUERY_KEY(orderId || ''),
    queryFn: () => getOrderById(orderId!),
    enabled: isAuthenticated && Boolean(orderId),
    staleTime: 1000 * 20, // 20 seconds
  });
}

export function useOrderTracking(orderId?: string) {
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  return useQuery<OrderTrackingInfo, Error>({
    queryKey: ORDER_TRACKING_QUERY_KEY(orderId || ''),
    queryFn: () => getOrderTracking(orderId!),
    enabled: isAuthenticated && Boolean(orderId),
    staleTime: 1000 * 15, // 15 seconds
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation<Order, Error, { orderId: string; payload: CancelOrderPayload }>({
    mutationFn: ({ orderId, payload }) => cancelOrder(orderId, payload),
    onSuccess: (updatedOrder) => {
      // Invalidate all orders queries so list reflects updated status
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      if (updatedOrder?._id) {
        queryClient.setQueryData(ORDER_DETAILS_QUERY_KEY(updatedOrder._id), updatedOrder);
      }
    },
  });
}
