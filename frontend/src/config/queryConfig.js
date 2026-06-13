/**
 * TanStack Query Configuration
 * Provides optimal configuration for data fetching and caching
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Create optimized QueryClient
 */
export function createOptimizedQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time: how long data is considered fresh
        staleTime: 1000 * 60 * 5, // 5 minutes
        // Cache time: how long unused data remains in cache
        gcTime: 1000 * 60 * 30, // 30 minutes
        // Retry failed requests
        retry: 2,
        // Don't retry on 4xx errors
        retryOnMount: true,
        // Refetch on window focus
        refetchOnWindowFocus: false,
        // Refetch on mount if stale
        refetchOnMount: 'stale',
        // Refetch on reconnect
        refetchOnReconnect: 'stale',
      },
      mutations: {
        // Retry mutations once
        retry: 1,
        // Don't retry on 4xx errors
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    },
  });
}

// Global QueryClient instance
export const queryClient = createOptimizedQueryClient();

/**
 * TanStack Query Provider wrapper
 */
export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export default {
  createOptimizedQueryClient,
  queryClient,
  QueryProvider,
};
