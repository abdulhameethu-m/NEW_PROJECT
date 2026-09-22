import { useRouter } from 'expo-router';

export type AppRouter = ReturnType<typeof useRouter>;

/**
 * Safely navigates back if there is a screen in the history stack,
 * otherwise navigates to the fallback route (defaulting to '/(tabs)').
 * Prevents "The action 'GO_BACK' was not handled by any navigator" error.
 */
export function safeGoBack(router: AppRouter, fallbackRoute: string = '/(tabs)') {
  try {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as any);
    }
  } catch {
    try {
      router.replace(fallbackRoute as any);
    } catch {
      // Graceful ignore
    }
  }
}
