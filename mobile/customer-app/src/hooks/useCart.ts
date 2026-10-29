import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCart, addToCart, updateCartItem, removeCartItem, clearCart } from '../api/cart';
import { Cart, CartMutationResponse } from '../types/cart';
import { useAuthStore } from '../stores/authStore';
import { guestCartStorage } from '../utils/guestCartStorage';

export const CART_QUERY_KEY = ['cart'];

export function useCart() {
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  return useQuery<Cart, Error>({
    queryKey: CART_QUERY_KEY,
    queryFn: async () => {
      if (isAuthenticated) {
        return await getCart();
      }
      return await guestCartStorage.getCart();
    },
    // Keep active whether authenticated or guest (skip only when initializing)
    enabled: status !== 'INITIALIZING',
    retry: 1,
  });
}

// Queue / Mutex primitive to ensure deterministic sequential quantity updates
let mutextPromise: Promise<any> = Promise.resolve();
function runSequentially<T>(fn: () => Promise<T>): Promise<T> {
  const result = mutextPromise.then(fn, fn);
  mutextPromise = result.catch(() => {});
  return result as Promise<T>;
}

export function useAddCartItem() {
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  return useMutation<
    CartMutationResponse,
    Error,
    { productId: string; quantity: number; variantId?: string; product?: any }
  >({
    mutationFn: (variables) =>
      runSequentially(async () => {
        if (isAuthenticated) {
          return await addToCart(variables.productId, variables.quantity, variables.variantId);
        }
        return await guestCartStorage.addItem({
          productId: variables.productId,
          quantity: variables.quantity,
          variantId: variables.variantId,
          product: variables.product,
        });
      }),
    onSuccess: (data) => {
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
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  return useMutation<Cart, Error, { productId: string; quantity: number; variantId?: string }>({
    mutationFn: (variables) =>
      runSequentially(async () => {
        if (isAuthenticated) {
          return await updateCartItem(variables.productId, variables.quantity, variables.variantId);
        }
        return await guestCartStorage.updateQuantity(
          variables.productId,
          variables.quantity,
          variables.variantId
        );
      }),
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
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  return useMutation<Cart, Error, { productId: string; variantId?: string }>({
    mutationFn: (variables) =>
      runSequentially(async () => {
        if (isAuthenticated) {
          return await removeCartItem(variables.productId, variables.variantId);
        }
        return await guestCartStorage.removeItem(variables.productId, variables.variantId);
      }),
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
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  return useMutation<Cart, Error, void>({
    mutationFn: async () => {
      if (isAuthenticated) {
        return await clearCart();
      }
      return await guestCartStorage.clearCart();
    },
    onSuccess: (clearedCart) => {
      queryClient.setQueryData(CART_QUERY_KEY, clearedCart);
    },
  });
}

