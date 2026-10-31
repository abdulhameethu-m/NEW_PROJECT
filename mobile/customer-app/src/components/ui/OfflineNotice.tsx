import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff, Wifi, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStatus } from '../../utils/network';
import { useQueryClient } from '@tanstack/react-query';

export const OfflineNotice: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { isOffline, isConnected } = useNetworkStatus();
  const queryClient = useQueryClient();

  const [wasOffline, setWasOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Animation values
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the reconnecting dot
  useEffect(() => {
    if (isOffline) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isOffline, pulseAnim]);

  // Handle transitions between offline, restored, and online
  useEffect(() => {
    if (isOffline) {
      setWasOffline(true);
      setShowRestored(false);

      // Slide down
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (wasOffline) {
      // Just reconnected
      setShowRestored(true);

      // Resume paused mutations or queries in React Query
      queryClient.resumePausedMutations();
      queryClient.invalidateQueries({ stale: true });

      // Hold restored state for 2.5 seconds, then dismiss
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -120,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setWasOffline(false);
          setShowRestored(false);
        });
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isOffline, wasOffline, opacity, translateY, queryClient]);

  const handleManualRetry = async () => {
    setIsRefreshing(true);
    try {
      const state = await NetInfo.refresh();
      if (state.isConnected && state.isInternetReachable !== false) {
        queryClient.invalidateQueries();
      }
    } catch {
      // Ignored
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  if (!isOffline && !showRestored) {
    return null;
  }

  const topOffset = Math.max(insets.top, Platform.OS === 'android' ? 12 : 24);

  return (
    <View style={[styles.outerContainer, { top: topOffset }]} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.banner,
          showRestored ? styles.bannerRestored : styles.bannerOffline,
          {
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.innerTouchable}
          activeOpacity={0.9}
          onPress={handleManualRetry}
          accessibilityRole="alert"
          accessibilityLabel={
            showRestored
              ? 'Internet connection restored'
              : 'No internet connection. Reconnecting. Tap to retry.'
          }
        >
          {showRestored ? (
            <View style={styles.contentRow}>
              <View style={[styles.iconCircle, styles.iconCircleRestored]}>
                <CheckCircle2 size={16} color="#ffffff" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.titleRestored}>Back Online</Text>
                <Text style={styles.subtitleRestored}>Connection restored · Syncing latest data</Text>
              </View>
            </View>
          ) : (
            <View style={styles.contentRow}>
              <View style={[styles.iconCircle, styles.iconCircleOffline]}>
                <WifiOff size={16} color="#ffffff" />
              </View>
              <View style={styles.textContainer}>
                <View style={styles.headerLine}>
                  <Text style={styles.titleOffline}>No Connection</Text>
                  <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
                  <Text style={styles.subTag}>Reconnecting...</Text>
                </View>
                <Text style={styles.subtitleOffline}>
                  Offline catalog mode active · Tap to retry
                </Text>
              </View>
              <View style={styles.retryAction}>
                {isRefreshing ? (
                  <ActivityIndicator size="small" color="#f59e0b" />
                ) : (
                  <RefreshCw size={15} color="#cbd5e1" />
                )}
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: 'center',
    elevation: 20,
  },
  banner: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 12,
    borderWidth: 1,
  },
  bannerOffline: {
    backgroundColor: '#0f172a', // Deep slate for modern contrast
    borderColor: '#334155',
  },
  bannerRestored: {
    backgroundColor: '#065f46', // Emerald green
    borderColor: '#059669',
  },
  innerTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconCircleOffline: {
    backgroundColor: '#ef4444',
  },
  iconCircleRestored: {
    backgroundColor: '#10b981',
  },
  textContainer: {
    flex: 1,
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleOffline: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
    marginHorizontal: 6,
  },
  subTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f59e0b',
  },
  subtitleOffline: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  titleRestored: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitleRestored: {
    fontSize: 11,
    color: '#a7f3d0',
    marginTop: 1,
  },
  retryAction: {
    paddingLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

