import '../global.css';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { getPendingImage, wasCameraSessionActive, clearPendingPhoto } from '../utils/imagePickerService';
import { initErrorHandler, logToTerminal } from '../utils/errorHandler';

// Initialize global error suppression inside app & route errors to terminal
initErrorHandler();

// Silence Reanimated strict-mode warnings (reading/writing shared values during render).
// These come from internal animation components and are safe to suppress in dev.
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any, query) => {
      logToTerminal(`React Query [${query.queryKey.join('/')}]`, error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: any, _variables, _context, mutation) => {
      const mutationKey = mutation.options.mutationKey ? mutation.options.mutationKey.join('/') : 'mutation';
      logToTerminal(`React Mutation [${mutationKey}]`, error);
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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
      } catch (e) {
        clearSession();
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
      if (status === 'UNAUTHENTICATED' && !inAuthGroup) {
        router.replace('/(auth)/login');
      } else if (status === 'AUTHENTICATED' && inAuthGroup) {
        router.replace('/(tabs)');
      }
    };

    handleNavigation();

    return () => {
      isMounted = false;
    };
  }, [status, segments, router, rootNavigationState?.key]);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
        <Stack.Screen name="addresses/index" options={{ headerShown: false }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
        <Stack.Screen name="profile/security" options={{ headerShown: false }} />
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

