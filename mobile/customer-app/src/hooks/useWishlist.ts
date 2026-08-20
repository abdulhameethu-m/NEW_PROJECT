import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWishlist, addToWishlist, removeFromWishlist } from '../api/wishlist';
import { WishlistItem, WishlistMutationResponse } from '../types/wishlist';
import { useAuthStore } from '../stores/authStore';

export const WISHLIST_QUERY_KEY = ['wishlist'];

export function useWishlist() {
  const status = useAuthStore(state => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';
  
  return useQuery<WishlistItem[], Error>({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: getWishlist,
    enabled: isAuthenticated, // Only fetch for authenticated users
    retry: 1,
  });
}

// Queue for wishlist mutations preventing "Add Remove Add Remove" race conditions
let mutextPromise: Promise<any> = Promise.resolve();
function runSequentially<T>(fn: () => Promise<T>): Promise<T> {
  const result = mutextPromise.then(fn, fn); 
  mutextPromise = result.catch(() => {});
  return result as Promise<T>;
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();
  
  return useMutation<
    WishlistMutationResponse, 
    Error, 
    { productId: string; active: boolean; variantId?: string; selectedAttributes?: Record<string, any> }
  >({
    mutationFn: (variables) => 
      runSequentially(() => 
        variables.active 
          ? addToWishlist(variables.productId, variables.variantId, variables.selectedAttributes)
          : removeFromWishlist(variables.productId)
      ),
    onMutate: async (variables) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: WISHLIST_QUERY_KEY });
      const previousWishlist = queryClient.getQueryData<WishlistItem[]>(WISHLIST_QUERY_KEY);
      
      if (previousWishlist) {
        if (variables.active) {
          // Optimistically assume it was added
          const optimisticItem = {
            _id: 'temp-' + Date.now().toString(),
            product: { _id: variables.productId } as any, // Not full data, but enough for ID checks
            addedAt: new Date().toISOString(),
          };
          queryClient.setQueryData<WishlistItem[]>(WISHLIST_QUERY_KEY, [...previousWishlist, optimisticItem]);
        } else {
          // Optimistically remove
          queryClient.setQueryData<WishlistItem[]>(
            WISHLIST_QUERY_KEY, 
            previousWishlist.filter(item => item.product._id !== variables.productId)
          );
        }
      }
      return { previousWishlist };
    },
    onError: (err, variables, context: any) => {
      // Rollback
      if (context?.previousWishlist) {
        queryClient.setQueryData(WISHLIST_QUERY_KEY, context.previousWishlist);
      }
    },
    onSettled: () => {
      // Always refetch to reconcile authoritative state
      queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
    },
  });
}
