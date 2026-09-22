import { apiClient } from './client';
import {
  StorefrontData,
  StorefrontResponse,
  StoreProductsResponse,
  StoreReviewsResponse,
  FollowedStoresResponse,
  FollowedStoreItem,
  VendorStore,
  VendorStoreQueryParams,
  PublicStoresResponse,
} from '../types/vendor';

export const vendorApi = {
  /**
   * Fetch complete storefront details including featured product rows and collections
   */
  getStorefront: async (slugOrId: string): Promise<StorefrontData> => {
    const encoded = encodeURIComponent(slugOrId.trim());
    try {
      const response = await apiClient.get<StorefrontResponse>(`/vendor-stores/${encoded}`);
      return response.data?.data;
    } catch {
      // Fallback to alias route if needed
      const fallback = await apiClient.get<StorefrontResponse>(`/vendors/${encoded}`);
      return fallback.data?.data;
    }
  },

  /**
   * Fetch paginated products for a vendor store with filters & sorting
   */
  getStoreProducts: async (
    slugOrId: string,
    params?: VendorStoreQueryParams
  ): Promise<StoreProductsResponse['data']> => {
    const encoded = encodeURIComponent(slugOrId.trim());
    const response = await apiClient.get<StoreProductsResponse>(
      `/vendor-stores/${encoded}/products`,
      { params }
    );
    return response.data?.data;
  },

  /**
   * Fetch reviews and rating distribution for a vendor store
   */
  getStoreReviews: async (
    slugOrId: string,
    params?: { page?: number; limit?: number; sortBy?: string }
  ): Promise<StoreReviewsResponse['data']> => {
    const encoded = encodeURIComponent(slugOrId.trim());
    const response = await apiClient.get<StoreReviewsResponse>(
      `/vendor-stores/${encoded}/reviews`,
      { params }
    );
    return response.data?.data;
  },

  /**
   * Follow a vendor store (authenticated customer)
   */
  followStore: async (
    slugOrId: string
  ): Promise<{ vendor: VendorStore; isFollowing: boolean }> => {
    const encoded = encodeURIComponent(slugOrId.trim());
    const response = await apiClient.post<{ success: boolean; data: { vendor: VendorStore; isFollowing: boolean } }>(
      `/vendor-stores/${encoded}/follow`
    );
    return response.data?.data;
  },

  /**
   * Unfollow a vendor store (authenticated customer)
   */
  unfollowStore: async (
    slugOrId: string
  ): Promise<{ vendor: VendorStore; isFollowing: boolean }> => {
    const encoded = encodeURIComponent(slugOrId.trim());
    const response = await apiClient.delete<{ success: boolean; data: { vendor: VendorStore; isFollowing: boolean } }>(
      `/vendor-stores/${encoded}/follow`
    );
    return response.data?.data;
  },

  /**
   * List stores followed by the logged-in customer
   */
  getFollowedStores: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<FollowedStoresResponse['data']> => {
    const response = await apiClient.get<FollowedStoresResponse>(
      '/user/followed-stores',
      { params }
    );
    return response.data?.data;
  },

  /**
   * Fetch public active vendor directory for discovery
   */
  getAllStores: async (params?: {
    limit?: number;
    skip?: number;
  }): Promise<VendorStore[]> => {
    const response = await apiClient.get<PublicStoresResponse | { data: VendorStore[] }>(
      '/public/vendors',
      { params }
    );
    const data = response.data as any;
    return Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  },

  /**
   * Track storefront interaction event (view, click, share)
   */
  trackStoreEvent: async (slugOrId: string, payload: Record<string, any>): Promise<void> => {
    try {
      const encoded = encodeURIComponent(slugOrId.trim());
      await apiClient.post(`/vendor-stores/${encoded}/events`, payload);
    } catch {
      // Non-blocking telemetry
    }
  },
};
