import { apiClient } from './client';
import { Order, OrderTrackingInfo, OrdersListResponse } from '../types/order';

export interface GetOrdersParams {
  page?: number;
  limit?: number;
  status?: string;
}

export interface CancelOrderPayload {
  reason: string;
  notes?: string;
}

export const getOrders = async (params: GetOrdersParams = {}): Promise<OrdersListResponse> => {
  const response = await apiClient.get<{ success: boolean; data: OrdersListResponse; message: string }>(
    '/orders/user',
    { params }
  );
  return response.data.data;
};

export const getOrderById = async (orderId: string): Promise<Order> => {
  const response = await apiClient.get<{ success: boolean; data: Order; message: string }>(
    `/orders/${orderId}`
  );
  return response.data.data;
};

export const getOrderTracking = async (orderId: string): Promise<OrderTrackingInfo> => {
  const response = await apiClient.get<{ success: boolean; data: OrderTrackingInfo; message: string }>(
    `/orders/${orderId}/track`
  );
  return response.data.data;
};

export const cancelOrder = async (
  orderId: string,
  payload: CancelOrderPayload
): Promise<Order> => {
  const response = await apiClient.post<{ success: boolean; data: Order; message: string }>(
    `/orders/${orderId}/cancel`,
    payload
  );
  return response.data.data;
};
