import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Configure TanStack React Query to synchronize its online state
 * directly with React Native Community NetInfo.
 */
export function initNetworkManager(): void {
  onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state: NetInfoState) => {
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      setOnline(isOnline);
    });
  });
}

/**
 * Imperative check to determine if the device currently has active internet.
 */
export async function getIsOnline(): Promise<boolean> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    return navigator.onLine;
  }
  try {
    const state = await NetInfo.fetch();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  } catch {
    return true; // Fallback to optimistic online
  }
}

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  isOffline: boolean;
  connectionType: string;
}

/**
 * React hook that subscribes to network connectivity changes in real-time.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    isOffline: false,
    connectionType: 'unknown',
  });

  useEffect(() => {
    // Initial fetch
    NetInfo.fetch().then((state) => {
      const isOffline = state.isConnected === false || state.isInternetReachable === false;
      setStatus({
        isConnected: Boolean(state.isConnected),
        isInternetReachable: state.isInternetReachable,
        isOffline,
        connectionType: state.type || 'unknown',
      });
    });

    // Event listener
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isOffline = state.isConnected === false || state.isInternetReachable === false;
      setStatus({
        isConnected: Boolean(state.isConnected),
        isInternetReachable: state.isInternetReachable,
        isOffline,
        connectionType: state.type || 'unknown',
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return status;
}

