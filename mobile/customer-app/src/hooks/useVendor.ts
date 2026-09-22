import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorApi } from '../api/vendors';
import { VendorStoreQueryParams, StorefrontData, FollowedStoresResponse, VendorStore } from '../types/vendor';
import { useAuthStore } from '../stores/authStore';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

export const VENDOR_KEYS = {
  all: ['vendors'] as const,
  storefront: (slug: string) => [...VENDOR_KEYS.all, 'storefront', slug] as const,
  products: (slug: string, params?: any) => [...VENDOR_KEYS.all, 'products', slug, params] as const,
  reviews: (slug: string, params?: any) => [...VENDOR_KEYS.all, 'reviews', slug, params] as const,
  followed: (params?: any) => [...VENDOR_KEYS.all, 'followed', params] as const,
  directory: (params?: any) => [...VENDOR_KEYS.all, 'directory', params] as const,
};

/**
 * Fetch full vendor storefront data (profile, collections, featured rows)
 */
export function useVendorStorefront(slugOrId: string | undefined) {
  return useQuery({
    queryKey: VENDOR_KEYS.storefront(slugOrId || ''),
    queryFn: () => vendorApi.getStorefront(slugOrId!),
    enabled: Boolean(slugOrId && slugOrId.trim().length > 0),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Fetch filtered, paginated catalog for a vendor's store
 */
export function useVendorProducts(
  slugOrId: string | undefined,
  params?: VendorStoreQueryParams
) {
  return useQuery({
    queryKey: VENDOR_KEYS.products(slugOrId || '', params),
    queryFn: () => vendorApi.getStoreProducts(slugOrId!, params),
    enabled: Boolean(slugOrId && slugOrId.trim().length > 0),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Fetch vendor customer reviews & breakdown
 */
export function useVendorReviews(
  slugOrId: string | undefined,
  params?: { page?: number; limit?: number; sortBy?: string }
) {
  return useQuery({
    queryKey: VENDOR_KEYS.reviews(slugOrId || '', params),
    queryFn: () => vendorApi.getStoreReviews(slugOrId!, params),
    enabled: Boolean(slugOrId && slugOrId.trim().length > 0),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch stores followed by the active customer
 */
export function useFollowedStores(params?: { page?: number; limit?: number }) {
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  return useQuery({
    queryKey: VENDOR_KEYS.followed(params),
    queryFn: () => vendorApi.getFollowedStores(params),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Fetch marketplace vendor directory for public discovery
 */
export function useAllStores(params?: { limit?: number; skip?: number }) {
  return useQuery({
    queryKey: VENDOR_KEYS.directory(params),
    queryFn: () => vendorApi.getAllStores(params),
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Optimistic follow / unfollow store mutation hook
 */
export function useToggleFollowStore() {
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      slug,
      isCurrentlyFollowing,
    }: {
      slug: string;
      isCurrentlyFollowing: boolean;
    }) => {
      if (status !== 'AUTHENTICATED') {
        throw new Error('AUTH_REQUIRED');
      }

      if (isCurrentlyFollowing) {
        return await vendorApi.unfollowStore(slug);
      } else {
        return await vendorApi.followStore(slug);
      }
    },
    onMutate: async ({ slug, isCurrentlyFollowing }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: VENDOR_KEYS.storefront(slug) });

      // Snapshot previous storefront data
      const previousStorefront = queryClient.getQueryData<StorefrontData>(
        VENDOR_KEYS.storefront(slug)
      );

      // Optimistically update follow status & follower count
      if (previousStorefront?.vendor) {
        const delta = isCurrentlyFollowing ? -1 : 1;
        const currentFollowers = previousStorefront.vendor.followersCount || 0;

        queryClient.setQueryData<StorefrontData>(VENDOR_KEYS.storefront(slug), {
          ...previousStorefront,
          isFollowing: !isCurrentlyFollowing,
          vendor: {
            ...previousStorefront.vendor,
            followersCount: Math.max(0, currentFollowers + delta),
          },
        });
      }

      return { previousStorefront, slug };
    },
    onError: (err: any, variables, context) => {
      // Rollback on error
      if (context?.previousStorefront) {
        queryClient.setQueryData(
          VENDOR_KEYS.storefront(context.slug),
          context.previousStorefront
        );
      }

      if (err?.message === 'AUTH_REQUIRED') {
        Alert.alert(
          'Login Required',
          'Please sign in to follow your favorite stores and receive updates.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => router.push('/(auth)/login') },
          ]
        );
      } else {
        const errorMsg =
          err?.response?.data?.message || err?.message || 'Could not update follow status.';
        Alert.alert('Action Failed', errorMsg);
      }
    },
    onSettled: (_data, _error, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: VENDOR_KEYS.storefront(variables.slug) });
      queryClient.invalidateQueries({ queryKey: VENDOR_KEYS.followed() });
      queryClient.invalidateQueries({ queryKey: VENDOR_KEYS.directory() });
    },
  });
}
