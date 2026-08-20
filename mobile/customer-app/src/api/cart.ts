import { apiClient } from './client';
import { Cart, CartMutationResponse } from '../types/cart';

export const getCart = async (): Promise<Cart> => {
  const response = await apiClient.get<{ success: boolean; data: Cart }>('/cart');
  return response.data.data;
};

export const addToCart = async (productId: string, quantity: number, variantId?: string): Promise<CartMutationResponse> => {
  const response = await apiClient.post<{ success: boolean; data: CartMutationResponse; message: string }>('/cart/add', {
    productId,
    quantity,
    variantId: variantId || '',
  });
  return response.data.data;
};

export const updateCartItem = async (productId: string, quantity: number, variantId?: string): Promise<Cart> => {
  const response = await apiClient.patch<{ success: boolean; data: Cart }>('/cart/update', {
    productId,
    quantity,
    variantId: variantId || '',
  });
  return response.data.data;
};

export const removeCartItem = async (productId: string, variantId?: string): Promise<Cart> => {
  const response = await apiClient.delete<{ success: boolean; data: Cart }>('/cart/remove', {
    data: { productId, variantId: variantId || '' }
  });
  return response.data.data;
};

export const clearCart = async (): Promise<Cart> => {
  const response = await apiClient.delete<{ success: boolean; data: Cart }>('/cart/clear');
  return response.data.data;
};

export const mergeGuestCart = async (guestCartItems: any[]): Promise<any> => {
  const response = await apiClient.post('/cart/merge', { guestCartItems });
  return response.data.data;
};
