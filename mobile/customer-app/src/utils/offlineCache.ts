import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { Query } from '@tanstack/react-query';

const OFFLINE_CACHE_KEY = 'UCHOOZ_OFFLINE_CATALOG_CACHE';
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days offline retention

/**
 * AsyncStorage persister for TanStack React Query.
 * Throttled to 1 second to minimize I/O overhead on mobile devices.
 */
export const queryStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: OFFLINE_CACHE_KEY,
  throttleTime: 1000,
});

/**
 * Filter to determine which queries should be persisted offline.
 * Persists catalog browsing data, product details, home layout, categories, and wishlist.
 */
export function shouldDehydrateQuery(query: any): boolean {
  const queryKey = query?.queryKey?.[0];
  const persistableKeys = [
    'products',
    'product',
    'categories',
    'subcategories',
    'homepage-layout',
    'vendor-store',
    'vendor-products',
    'wishlist',
    'reels',
  ];

  return persistableKeys.includes(String(queryKey));
}

import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { QueryClient } from '@tanstack/react-query';

export const persistOptions: any = {
  persister: queryStoragePersister,
  maxAge: CACHE_MAX_AGE_MS,
  buster: 'v1.0.1',
  dehydrateOptions: {
    shouldDehydrateQuery,
  },
};

/**
 * Attaches the AsyncStorage offline persister directly to the QueryClient.
 * This restores cached queries on app launch and saves queries asynchronously,
 * while allowing standard QueryClientProvider to be used without JSX type conflicts.
 */
export function setupOfflineCachePersistence(client: QueryClient): void {
  try {
    persistQueryClient({
      queryClient: client as any,
      persister: queryStoragePersister,
      maxAge: CACHE_MAX_AGE_MS,
      buster: 'v1.0.1',
      dehydrateOptions: {
        shouldDehydrateQuery,
      },
    });
  } catch (error) {
    console.warn('[OfflineCache] Failed to initialize persister:', error);
  }
}
