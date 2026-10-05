import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Zap, Timer } from 'lucide-react-native';
import { ResponsiveContainer } from '../layout/ResponsiveContainer';
import { ProductCard } from '../catalog/ProductCard';
import { ProductSkeleton } from '../catalog/ProductSkeleton';
import { Product } from '../../types/catalog';
import { resolveUrl } from '../../utils/resolveUrl';

interface HomeFlashSaleProps {
  title?: string;
  products: Product[];
  startTime?: string;
  endTime?: string;
  flashBanner?: string;
  countdownStyle?: 'BLOCKS' | 'INLINE' | 'MINIMAL';
  isLoading?: boolean;
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function calcTimeLeft(endTime?: string): TimeLeft {
  if (!endTime) return { hours: 0, minutes: 0, seconds: 0, expired: false };
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { hours: h, minutes: m, seconds: s, expired: false };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export const HomeFlashSale = ({
  title = 'Flash Sale',
  products = [],
  endTime,
  flashBanner,
  countdownStyle = 'BLOCKS',
  isLoading = false,
}: HomeFlashSaleProps) => {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calcTimeLeft(endTime));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(calcTimeLeft(endTime));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [endTime]);

  if (isLoading) {
    return (
      <ResponsiveContainer className="py-4">
        <View style={styles.skeleton} />
      </ResponsiveContainer>
    );
  }

  if (!products || products.length === 0) return null;

  const bannerUrl = resolveUrl(flashBanner);
  const showCountdown = endTime && !timeLeft.expired;

  const CountdownBlock = ({ value, label }: { value: number; label: string }) => (
    <View style={styles.block}>
      <Text style={styles.blockNumber}>{pad(value)}</Text>
      <Text style={styles.blockLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={styles.header}>
        {bannerUrl ? (
          <>
            <Image source={bannerUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(220,38,38,0.75)' }]} />
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#dc2626' }]} />
        )}

        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Zap size={20} color="#fef08a" fill="#fef08a" />
            <Text style={styles.title}>{title}</Text>
          </View>

          {showCountdown && (
            <View style={styles.countdownRow}>
              {countdownStyle === 'BLOCKS' ? (
                <>
                  <CountdownBlock value={timeLeft.hours} label="HRS" />
                  <Text style={styles.colon}>:</Text>
                  <CountdownBlock value={timeLeft.minutes} label="MIN" />
                  <Text style={styles.colon}>:</Text>
                  <CountdownBlock value={timeLeft.seconds} label="SEC" />
                </>
              ) : countdownStyle === 'INLINE' ? (
                <View style={styles.inlineRow}>
                  <Timer size={14} color="#fef08a" />
                  <Text style={styles.inlineText}>
                    {`${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)} left`}
                  </Text>
                </View>
              ) : (
                <Text style={styles.minimalText}>
                  {`${pad(timeLeft.hours)}h ${pad(timeLeft.minutes)}m ${pad(timeLeft.seconds)}s`}
                </Text>
              )}
            </View>
          )}
        </View>

        <Pressable
          onPress={() => router.push('/(tabs)/shop' as any)}
          style={styles.seeAllBtn}
        >
          <Text style={styles.seeAllText}>See All</Text>
        </Pressable>
      </View>

      {/* Products Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsContainer}
      >
        {products.map((product) => (
          <View key={product._id} style={[styles.productWrapper, { width: screenWidth * 0.42 }]}>
            <ProductCard product={product} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  skeleton: {
    height: 120,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  header: {
    height: 80,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  block: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'center',
    minWidth: 38,
  },
  blockNumber: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  blockLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 8,
    fontWeight: '600',
  },
  colon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineText: {
    color: '#fef08a',
    fontSize: 12,
    fontWeight: '700',
  },
  minimalText: {
    color: '#fef08a',
    fontSize: 12,
    fontWeight: '600',
  },
  seeAllBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  seeAllText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  productsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  productWrapper: {
    minWidth: 160,
  },
});
