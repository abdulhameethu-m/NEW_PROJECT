import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { resolveUrl } from '../../utils/resolveUrl';

interface BannerSlide {
  heading?: string;
  subheading?: string;
  mobileImage?: string;
  desktopImage?: string;
  url?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  textPosition?: 'LEFT' | 'CENTER' | 'RIGHT';
}

interface HomeBannerCarouselProps {
  slides: BannerSlide[];
  autoSlide?: boolean;
  slideSpeed?: number;
  showArrows?: boolean;
  showDots?: boolean;
  overlayOpacity?: number;
  isLoading?: boolean;
}

export const HomeBannerCarousel = ({
  slides = [],
  autoSlide = true,
  slideSpeed = 3500,
  showArrows = true,
  showDots = true,
  overlayOpacity = 0.35,
  isLoading = false,
}: HomeBannerCarouselProps) => {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const validSlides = slides.filter(Boolean);
  const count = validSlides.length;

  const goTo = useCallback(
    (idx: number) => {
      const safeIdx = ((idx % count) + count) % count;
      scrollRef.current?.scrollTo({ x: safeIdx * screenWidth, animated: true });
      setCurrentIndex(safeIdx);
    },
    [count, screenWidth]
  );

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoSlide && count > 1) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const next = (prev + 1) % count;
          scrollRef.current?.scrollTo({ x: next * screenWidth, animated: true });
          return next;
        });
      }, slideSpeed);
    }
  }, [autoSlide, count, slideSpeed, screenWidth]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetTimer]);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    setCurrentIndex(idx);
    resetTimer();
  };

  if (isLoading) {
    return <View style={[styles.banner, { width: screenWidth, backgroundColor: '#e2e8f0' }]} />;
  }

  if (count === 0) return null;

  return (
    <View style={{ width: screenWidth }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        decelerationRate="fast"
      >
        {validSlides.map((slide, i) => {
          const imageUrl = resolveUrl(slide.mobileImage || slide.desktopImage || slide.url);
          const alignItems =
            slide.textPosition === 'CENTER'
              ? 'center'
              : slide.textPosition === 'RIGHT'
              ? 'flex-end'
              : 'flex-start';

          return (
            <Pressable
              key={i}
              style={[styles.banner, { width: screenWidth }]}
              onPress={() => {
                if (slide.ctaUrl?.startsWith('/')) router.push(slide.ctaUrl as any);
              }}
            >
              {imageUrl ? (
                <>
                  <Image
                    source={imageUrl}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={300}
                  />
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      { backgroundColor: `rgba(0,0,0,${overlayOpacity})` },
                    ]}
                  />
                </>
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1e293b' }]} />
              )}

              <View style={[styles.textBlock, { alignItems }]}>
                {slide.heading ? (
                  <Text style={styles.heading} numberOfLines={2}>
                    {slide.heading}
                  </Text>
                ) : null}
                {slide.subheading ? (
                  <Text style={styles.subheading} numberOfLines={2}>
                    {slide.subheading}
                  </Text>
                ) : null}
                {slide.ctaLabel ? (
                  <View style={styles.ctaButton}>
                    <Text style={styles.ctaText}>{slide.ctaLabel}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Arrows */}
      {showArrows && count > 1 && (
        <>
          <Pressable
            style={[styles.arrowButton, { left: 12 }]}
            onPress={() => goTo(currentIndex - 1)}
          >
            <ChevronLeft size={20} color="#fff" />
          </Pressable>
          <Pressable
            style={[styles.arrowButton, { right: 12 }]}
            onPress={() => goTo(currentIndex + 1)}
          >
            <ChevronRight size={20} color="#fff" />
          </Pressable>
        </>
      )}

      {/* Dots */}
      {showDots && count > 1 && (
        <View style={styles.dotsContainer}>
          {validSlides.map((_, i) => (
            <Pressable key={i} onPress={() => goTo(i)}>
              <View
                style={[
                  styles.dot,
                  i === currentIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    height: 200,
    position: 'relative',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  textBlock: {
    padding: 20,
    paddingBottom: 36,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subheading: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 12,
  },
  ctaButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  ctaText: {
    color: '#1e293b',
    fontSize: 13,
    fontWeight: '700',
  },
  arrowButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    borderRadius: 4,
  },
  dotActive: {
    width: 20,
    height: 6,
    backgroundColor: '#fff',
  },
  dotInactive: {
    width: 6,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});
