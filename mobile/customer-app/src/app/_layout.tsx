import '../global.css';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform, StyleSheet, BackHandler } from 'react-native';
import { getPendingImage, wasCameraSessionActive, clearPendingPhoto } from '../utils/imagePickerService';
import { initErrorHandler, logToTerminal } from '../utils/errorHandler';
import { notificationService } from '../services/notificationService';
import * as Linking from 'expo-linking';
import { handleIncomingDeepLink } from '../utils/deepLinking';
import { setupOfflineCachePersistence } from '../utils/offlineCache';
import { initNetworkManager } from '../utils/network';
import { OfflineNotice } from '../components/ui/OfflineNotice';
import { initSentry, setSentryUser, captureException } from '../services/sentryService';

// Initialize global crash analytics & error tracking
initSentry();

// Initialize global error suppression inside app & route errors to terminal
initErrorHandler();

// Initialize real-time network connectivity sync with React Query
initNetworkManager();

// Silence Reanimated strict-mode warnings (reading/writing shared values during render).
// These come from internal animation components and are safe to suppress in dev.
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any, query) => {
      const status = error?.response?.status;
      const isRoutineAuth = status === 401 && (query.queryKey[0] === 'auth' || query.queryKey[0] === 'user');
      const isCsrfRoutine = status === 403 && String(error?.response?.data?.code || '').includes('CSRF');
      if (!isRoutineAuth && !isCsrfRoutine) {
        logToTerminal(`React Query [${query.queryKey.join('/')}]`, error);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: any, _variables, _context, mutation) => {
      const status = error?.response?.status;
      const isCsrfRoutine = status === 403 && String(error?.response?.data?.code || '').includes('CSRF');
      if (!isCsrfRoutine) {
        const mutationKey = mutation.options.mutationKey ? mutation.options.mutationKey.join('/') : 'mutation';
        logToTerminal(`React Mutation [${mutationKey}]`, error);
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days retention for offline catalog browsing
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

// Setup 7-day AsyncStorage offline query cache persistence
setupOfflineCachePersistence(queryClient);

function RootLayoutNav() {
  const status = useAuthStore(state => state.status);
  const setUser = useAuthStore(state => state.setUser);
  const clearSession = useAuthStore(state => state.clearSession);

  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  // Initialization check
  useEffect(() => {
    const initSession = async () => {
      try {
        const user = await authApi.getMe();
        setUser(user);
        setSentryUser({ id: user._id, email: user.email, name: user.name });
      } catch (e) {
        clearSession();
        setSentryUser(null);
      }
    };
    initSession();
  }, [setUser, clearSession]);

  // Auth Guard & Pending Camera Navigation
  useEffect(() => {
    if (!rootNavigationState?.key) return;
    if (status === 'INITIALIZING') return;

    let isMounted = true;

    const handleNavigation = async () => {
      // Check if Android killed the app during a camera session.
      try {
        const sessionWasActive = await wasCameraSessionActive();
        if (sessionWasActive) {
          const pendingPhoto = await getPendingImage();
          await clearPendingPhoto();

          if (pendingPhoto && isMounted) {
            router.replace({
              pathname: '/profile/edit',
              params: { pendingPhotoUri: pendingPhoto },
            });
            return;
          } else if (isMounted) {
            router.replace('/profile/edit');
            return;
          }
        }
      } catch (e) {
        console.warn('[Layout] Camera recovery check failed:', e);
      }

      if (!isMounted) return;

      const inAuthGroup = segments[0] === '(auth)';
      const rootSegment = segments[0] || '';
      const subSegment = segments[1] || '';

      // Define routes strictly requiring an authenticated session
      const isProtected =
        ['checkout', 'orders', 'returns', 'addresses'].includes(rootSegment) ||
        (rootSegment === 'profile' && ['edit', 'security', 'change-password'].includes(subSegment)) ||
        (rootSegment === 'support' && subSegment === 'new');

      if (status === 'UNAUTHENTICATED' && isProtected) {
        const targetPath = '/' + segments.join('/');
        router.replace({
          pathname: '/(auth)/login',
          params: { returnTo: targetPath },
        });
      } else if (status === 'AUTHENTICATED' && inAuthGroup) {
        router.replace('/(tabs)');
      }
    };

    handleNavigation();

    return () => {
      isMounted = false;
    };
  }, [status, segments, router, rootNavigationState?.key]);

  // Push Notification Registration & Banner Tap Handling
  useEffect(() => {
    // 1. Register push token if user is authenticated
    if (status === 'AUTHENTICATED') {
      notificationService.registerForPushNotificationsAsync().catch((err) => {
        console.log('[Layout] Push notification registration note:', err?.message || err);
      });
    }

    // 2. Setup tap listener for incoming push notifications (foreground & background)
    const subscription = notificationService.addNotificationResponseListener((response) => {
      try {
        const data = response?.notification?.request?.content?.data as any;
        if (!data) return;

        if (data.orderId) {
          router.push(`/orders/${data.orderId}` as any);
        } else if (data.slug) {
          router.push(`/product/${data.slug}` as any);
        } else if (data.ticketId) {
          router.push(`/support/${data.ticketId}` as any);
        } else if (data.screen === 'cart') {
          router.push('/(tabs)/cart');
        } else if (data.screen === 'shop') {
          router.push('/(tabs)/shop');
        } else {
          router.push('/notifications');
        }
      } catch (e) {
        console.warn('[Layout] Failed to route notification tap:', e);
      }
    });

    return () => {
      subscription?.remove?.();
    };
  }, [status, router]);

  // Universal Links & Deep Linking Listener (Cold start & Runtime)
  useEffect(() => {
    if (!rootNavigationState?.key) return;

    let isMounted = true;

    // 1. Check for initial cold-start deep link
    Linking.getInitialURL()
      .then((url) => {
        if (url && isMounted) {
          handleIncomingDeepLink(url, router);
        }
      })
      .catch((err) => {
        console.warn('[Layout] Failed to get initial deep link URL:', err);
      });

    // 2. Listen for runtime deep links while app is open or backgrounded
    const subscription = Linking.addEventListener('url', (event) => {
      if (event?.url && isMounted) {
        handleIncomingDeepLink(event.url, router);
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [rootNavigationState?.key, router]);

  // Handle Android hardware back press gracefully
  useEffect(() => {
    const onBackPress = () => {
      // If we are at the root level of the app (tabs root or auth login), exit cleanly
      const isAtRootTab = segments[0] === '(tabs)' && (!segments[1] || (segments[1] as string) === 'index');
      const isAtRootAuth = segments[0] === '(auth)' && (!segments[1] || (segments[1] as string) === 'login');

      if (isAtRootTab || isAtRootAuth) {
        BackHandler.exitApp();
        return true;
      }

      if (router.canGoBack()) {
        try {
          router.back();
          return true;
        } catch {
          // Ignore and fallback
        }
      }

      // If cannot go back, safely fallback
      if (segments[0] === '(auth)') {
        router.replace('/(auth)/login');
      } else {
        router.replace('/(tabs)');
      }
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [router, segments]);

  return (
    <View style={{ flex: 1 }}>
      <OfflineNotice />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="cart-drawer"
          options={{
            presentation: 'transparentModal',
            headerShown: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen name="checkout" options={{ headerShown: false }} />
        <Stack.Screen name="order-success" options={{ headerShown: false }} />
        <Stack.Screen name="orders/index" options={{ headerShown: false }} />
        <Stack.Screen name="orders/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="orders/[id]/invoice" options={{ headerShown: false }} />
        <Stack.Screen name="returns/index" options={{ headerShown: false }} />
        <Stack.Screen name="returns/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="wishlist" options={{ headerShown: false }} />
        <Stack.Screen name="addresses/index" options={{ headerShown: false }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
        <Stack.Screen name="profile/security" options={{ headerShown: false }} />
        <Stack.Screen name="stores/index" options={{ headerShown: false }} />
        <Stack.Screen name="stores/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="stores/followed" options={{ headerShown: false }} />
        <Stack.Screen name="support/index" options={{ headerShown: false }} />
        <Stack.Screen name="support/new" options={{ headerShown: false }} />
        <Stack.Screen name="support/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="search/index" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="legal/terms" options={{ headerShown: false }} />
        <Stack.Screen name="legal/privacy" options={{ headerShown: false }} />
      </Stack>

      {status === 'INITIALIZING' && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  const content = (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <style>{`
          input:-webkit-autofill,
          input:-webkit-autofill:hover,
          input:-webkit-autofill:focus,
          input:-webkit-autofill:active {
              -webkit-box-shadow: 0 0 0 30px white inset !important;
              box-shadow: 0 0 0 30px white inset !important;
              -webkit-text-fill-color: #0f172a !important;
          }
        `}</style>
        <View style={styles.mobileWrapper}>{content}</View>
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileWrapper: {
    width: '100%',
    maxWidth: 480,
    flex: 1,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 320,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});

/**
 * Root ErrorBoundary: Catches unhandled render errors gracefully.
 * Logs the full error and stack trace to the developer terminal,
 * while showing a clean, friendly retry view to avoid disturbing the user.
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  useEffect(() => {
    logToTerminal('App ErrorBoundary (UI Render Error)', error);
    captureException(error, { location: 'RootErrorBoundary' });
  }, [error]);

  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorSubtitle}>
        We ran into a temporary issue loading this screen. Please try again.
      </Text>
      <TouchableOpacity onPress={retry} style={styles.retryButton} activeOpacity={0.8}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

