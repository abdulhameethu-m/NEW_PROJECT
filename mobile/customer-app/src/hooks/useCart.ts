import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCart, addToCart, updateCartItem, removeCartItem, clearCart } from '../api/cart';
import { Cart, CartMutationResponse } from '../types/cart';
import { useAuthStore } from '../stores/authStore';

export const CART_QUERY_KEY = ['cart'];

export function useCart() {
  const status = useAuthStore(state => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';
  
  return useQuery<Cart, Error>({
    queryKey: CART_QUERY_KEY,
    queryFn: getCart,
    enabled: isAuthenticated, // Only fetch for authenticated users, otherwise returns empty/guest later if applicable
    retry: 1, // Minimize aggressive retries on cart
  });
}

// Queue / Mutex primitive to ensure deterministic sequential quantity updates
let mutextPromise: Promise<any> = Promise.resolve();
function runSequentially<T>(fn: () => Promise<T>): Promise<T> {
  const result = mutextPromise.then(fn, fn); // Always continue regardless of previous fail
  mutextPromise = result.catch(() => {});
  return result as Promise<T>;
}

export function useAddCartItem() {
  const queryClient = useQueryClient();
  
  return useMutation<CartMutationResponse, Error, { productId: string; quantity: number; variantId?: string }>({
    mutationFn: (variables) => 
      runSequentially(() => addToCart(variables.productId, variables.quantity, variables.variantId)),
    onSuccess: (data) => {
      // Invalidate or Optimistically update based on returned dataset
      if (data && data.cart) {
        queryClient.setQueryData(CART_QUERY_KEY, data.cart);
      } else {
        queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      }
    },
  });
}

export function useUpdateCartQuantity() {
  const queryClient = useQueryClient();
  
  return useMutation<Cart, Error, { productId: string; quantity: number; variantId?: string }>({
    mutationFn: (variables) => 
      runSequentially(() => updateCartItem(variables.productId, variables.quantity, variables.variantId)),
    onSuccess: (updatedCart) => {
      if (updatedCart) {
        queryClient.setQueryData(CART_QUERY_KEY, updatedCart);
      } else {
        queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      }
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  
  return useMutation<Cart, Error, { productId: string; variantId?: string }>({
    mutationFn: (variables) => 
      runSequentially(() => removeCartItem(variables.productId, variables.variantId)),
    onSuccess: (updatedCart) => {
      if (updatedCart) {
        queryClient.setQueryData(CART_QUERY_KEY, updatedCart);
      } else {
        queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      }
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  
  return useMutation<Cart, Error, void>({
    mutationFn: clearCart,
    onSuccess: (clearedCart) => {
      queryClient.setQueryData(CART_QUERY_KEY, clearedCart);
    },
  });
}
