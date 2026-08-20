import { apiClient } from './client';
import { WishlistItem, WishlistMutationResponse } from '../types/wishlist';

export const getWishlist = async (): Promise<WishlistItem[]> => {
  const response = await apiClient.get<{ success: boolean; data: WishlistItem[] }>('/wishlist');
  return response.data.data;
};

export const addToWishlist = async (productId: string, variantId?: string, selectedAttributes?: Record<string, any>): Promise<WishlistMutationResponse> => {
  const response = await apiClient.post<{ success: boolean; data: WishlistMutationResponse }>(`/wishlist/${productId}`, {
    variantId: variantId || null,
    selectedAttributes: selectedAttributes || {},
  });
  return response.data.data;
};

export const removeFromWishlist = async (productId: string): Promise<WishlistMutationResponse> => {
  const response = await apiClient.delete<{ success: boolean; data: WishlistMutationResponse }>(`/wishlist/${productId}`);
  return response.data.data;
};

export const mergeGuestWishlist = async (guestWishlistItems: any[]): Promise<any> => {
  const response = await apiClient.post('/wishlist/merge', { guestWishlistItems });
  return response.data.data;
};
