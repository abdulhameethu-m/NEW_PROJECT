import '../global.css';
import { Slot, Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';
import { View, ActivityIndicator, Platform, StyleSheet } from 'react-native';

const queryClient = new QueryClient({
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

  // Initialization check
  useEffect(() => {
    const initSession = async () => {
      try {
        const user = await authApi.getMe();
        setUser(user);
      } catch (e) {
        // If /me fails and refresh queue completely fails, it throws here
        clearSession();
      }
    };
    initSession();
  }, [setUser, clearSession]);

  // Auth Guard Navigation
  useEffect(() => {
    if (status === 'INITIALIZING') return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (status === 'UNAUTHENTICATED' && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (status === 'AUTHENTICATED' && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [status, segments, router]);

  if (status === 'INITIALIZING') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
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
          /* Fix Web Autofill Blue Background */
          input:-webkit-autofill,
          input:-webkit-autofill:hover, 
          input:-webkit-autofill:focus, 
          input:-webkit-autofill:active {
              -webkit-box-shadow: 0 0 0 30px white inset !important;
              box-shadow: 0 0 0 30px white inset !important;
              -webkit-text-fill-color: #0f172a !important;
          }
        `}</style>
        <View style={styles.mobileWrapper}>
          {content}
        </View>
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
  }
});
