import AsyncStorage from '@react-native-async-storage/async-storage';
import { WishlistItem, WishlistMutationResponse } from '../types/wishlist';

const GUEST_WISHLIST_STORAGE_KEY = '@uchooz_guest_wishlist';

export const guestWishlistStorage = {
  /**
   * Retrieve guest wishlist from local storage.
   */
  async getWishlist(): Promise<WishlistItem[]> {
    try {
      const raw = await AsyncStorage.getItem(GUEST_WISHLIST_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as WishlistItem[];
    } catch (e) {
      console.warn('[guestWishlistStorage] Error reading guest wishlist:', e);
      return [];
    }
  },

  /**
   * Toggle item in guest wishlist.
   */
  async toggleWishlist(params: {
    productId: string;
    active: boolean;
    variantId?: string;
    product?: any;
    selectedAttributes?: Record<string, any>;
  }): Promise<WishlistMutationResponse> {
    const { productId, active, variantId, product, selectedAttributes } = params;
    let list = await this.getWishlist();

    if (active) {
      // Add if not already present
      const exists = list.some((item) => String(item.product?._id) === String(productId));
      if (!exists) {
        const newItem: WishlistItem = {
          _id: `guest_wl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          product: {
            _id: productId,
            name: product?.name || 'Product',
            category: product?.category || '',
            price: Number(product?.price || 0),
            discountPrice: product?.discountPrice ? Number(product.discountPrice) : undefined,
            images: product?.images || [],
            stock: product?.stock ?? 10,
            status: product?.status || 'APPROVED',
            isActive: true,
            slug: product?.slug || '',
          },
          addedAt: new Date().toISOString(),
        };
        list.push(newItem);
      }
    } else {
      // Remove
      list = list.filter((item) => String(item.product?._id) !== String(productId));
    }

    await AsyncStorage.setItem(GUEST_WISHLIST_STORAGE_KEY, JSON.stringify(list));

    return {
      saved: active,
      productId,
      variantId: variantId || null,
      selectedAttributes,
    };
  },

  /**
   * Clear all guest wishlist items.
   */
  async clearWishlist(): Promise<void> {
    await AsyncStorage.removeItem(GUEST_WISHLIST_STORAGE_KEY);
  },

  /**
   * Get formatted items to pass to /auth/merge-guest-data.
   */
  async getItemsForMerge(): Promise<Array<{ productId: string; variantId?: string }>> {
    const list = await this.getWishlist();
    return list.map((item) => ({
      productId: String(item.product?._id || item._id),
    }));
  },
};
