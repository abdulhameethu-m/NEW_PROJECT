import { apiClient } from './client';
import {
  ShippingAddress,
  PreparedCheckoutSummary,
  CreateOrderPayload,
  CreateOrderResult,
} from '../types/checkout';

export interface PrepareCheckoutParams {
  shippingAddress?: ShippingAddress;
  paymentMethod?: 'ONLINE' | 'COD';
  currency?: string;
  trackingToken?: string;
}

export const prepareCheckout = async (
  params: PrepareCheckoutParams = {}
): Promise<PreparedCheckoutSummary> => {
  const response = await apiClient.post<{ success: boolean; data: PreparedCheckoutSummary }>(
    '/checkout/prepare',
    params
  );
  return response.data.data;
};

export const createOrder = async (
  payload: CreateOrderPayload
): Promise<CreateOrderResult> => {
  const response = await apiClient.post<{ success: boolean; data: CreateOrderResult; message: string }>(
    '/checkout/create',
    payload
  );
  return response.data.data;
};

export interface CreateRazorpayOrderResponse {
  key_id: string;
  key?: string;
  razorpay_order_id: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentSessionId?: string;
}

export interface VerifyRazorpayPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  shippingAddress: ShippingAddress;
  trackingToken?: string;
}

export const createRazorpayOrder = async (payload: {
  shippingAddress: ShippingAddress;
  trackingToken?: string;
}): Promise<CreateRazorpayOrderResponse> => {
  const response = await apiClient.post<{ success: boolean; data: CreateRazorpayOrderResponse }>(
    '/payments/create-order',
    {
      cartId: 'current',
      shippingAddress: payload.shippingAddress,
      trackingToken: payload.trackingToken,
      paymentMethod: 'ONLINE',
    }
  );
  return response.data.data;
};

export const verifyRazorpayPayment = async (
  payload: VerifyRazorpayPaymentPayload
): Promise<CreateOrderResult> => {
  const response = await apiClient.post<{
    success: boolean;
    orderId: string;
    orderGroupId: string;
    orders: any[];
    payment: any;
  }>('/payments/verify', payload);
  return response.data as unknown as CreateOrderResult;
};

