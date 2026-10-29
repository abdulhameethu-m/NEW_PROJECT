import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWishlist, addToWishlist, removeFromWishlist } from '../api/wishlist';
import { WishlistItem, WishlistMutationResponse } from '../types/wishlist';
import { useAuthStore } from '../stores/authStore';
import { guestWishlistStorage } from '../utils/guestWishlistStorage';

export const WISHLIST_QUERY_KEY = ['wishlist'];

export function useWishlist() {
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  return useQuery<WishlistItem[], Error>({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: async () => {
      if (isAuthenticated) {
        return await getWishlist();
      }
      return await guestWishlistStorage.getWishlist();
    },
    enabled: status !== 'INITIALIZING',
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
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  return useMutation<
    WishlistMutationResponse,
    Error,
    {
      productId: string;
      active: boolean;
      variantId?: string;
      selectedAttributes?: Record<string, any>;
      product?: any;
    }
  >({
    mutationFn: (variables) =>
      runSequentially(async () => {
        if (isAuthenticated) {
          return variables.active
            ? await addToWishlist(
                variables.productId,
                variables.variantId,
                variables.selectedAttributes
              )
            : await removeFromWishlist(variables.productId);
        }
        return await guestWishlistStorage.toggleWishlist({
          productId: variables.productId,
          active: variables.active,
          variantId: variables.variantId,
          product: variables.product,
          selectedAttributes: variables.selectedAttributes,
        });
      }),
    onMutate: async (variables) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: WISHLIST_QUERY_KEY });
      const previousWishlist = queryClient.getQueryData<WishlistItem[]>(WISHLIST_QUERY_KEY);

      if (previousWishlist) {
        if (variables.active) {
          const optimisticItem: WishlistItem = {
            _id: 'temp-' + Date.now().toString(),
            product: (variables.product || { _id: variables.productId }) as any,
            addedAt: new Date().toISOString(),
          };
          queryClient.setQueryData<WishlistItem[]>(WISHLIST_QUERY_KEY, [
            ...previousWishlist,
            optimisticItem,
          ]);
        } else {
          queryClient.setQueryData<WishlistItem[]>(
            WISHLIST_QUERY_KEY,
            previousWishlist.filter((item) => item.product._id !== variables.productId)
          );
        }
      }
      return { previousWishlist };
    },
    onError: (err, variables, context: any) => {
      if (context?.previousWishlist) {
        queryClient.setQueryData(WISHLIST_QUERY_KEY, context.previousWishlist);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
    },
  });
}

