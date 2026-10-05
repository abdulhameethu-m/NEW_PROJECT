import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  useWindowDimensions,
  Easing,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Zap, Gift, Tag, Truck, Wallet, CreditCard, Star, Flame, Bell
} from 'lucide-react-native';
import { resolveUrl } from '../../utils/resolveUrl';

interface HomeDealsStripProps {
  primaryHeading?: string;
  secondaryHeading?: string;
  offerText?: string;
  badgeText?: string;
  couponCode?: string;
  ctaText?: string;
  ctaUrl?: string;
  endDate?: string;
  layoutVariant?:
    | 'CENTER_BANNER'
    | 'LEFT_CONTENT_RIGHT_BUTTON'
    | 'COUPON_BANNER'
    | 'THREE_COLUMN_STRIP'
    | 'SCROLLING_MARQUEE'
    | 'COUNTDOWN_BANNER'
    | 'MARKETPLACE_PROMO_STRIP';
  icon?: string;
  gradientColor1?: string;
  gradientColor2?: string;
  backgroundImage?: string;
  textColor?: string;
  headingColor?: string;
  enableCountdown?: boolean;
  countdownEndDate?: string;
}

interface TimeLeft { h: number; m: number; s: number }

function calcTimeLeft(endDate?: string): TimeLeft {
  if (!endDate) return { h: 0, m: 0, s: 0 };
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return { h: 0, m: 0, s: 0 };
  return {
    h: Math.floor(diff / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

const ICONS: Record<string, React.ReactNode> = {
  FLASH: <Zap size={22} color="#fff" fill="#fff" />,
  GIFT: <Gift size={22} color="#fff" />,
  DISCOUNT: <Tag size={22} color="#fff" />,
  TRUCK: <Truck size={22} color="#fff" />,
  WALLET: <Wallet size={22} color="#fff" />,
  CREDIT_CARD: <CreditCard size={22} color="#fff" />,
  FIRE: <Flame size={22} color="#fff" fill="#fff" />,
  ANNOUNCEMENT: <Bell size={22} color="#fff" />,
  COUPON: <Tag size={22} color="#fff" />,
};

export const HomeDealsStrip = ({
  primaryHeading = '',
  secondaryHeading = '',
  offerText = '',
  badgeText = '',
  couponCode = '',
  ctaText = 'Shop Now',
  ctaUrl = '',
  layoutVariant = 'LEFT_CONTENT_RIGHT_BUTTON',
  icon = 'FLASH',
  gradientColor1 = '#e11d48',
  gradientColor2 = '#f97316',
  backgroundImage,
  textColor = '#ffffff',
  headingColor = '#ffffff',
  enableCountdown = false,
  countdownEndDate,
  endDate,
}: HomeDealsStripProps) => {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calcTimeLeft(countdownEndDate || endDate));
  const marqueeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enableCountdown && !endDate) return;
    const timer = setInterval(() => {
      setTimeLeft(calcTimeLeft(countdownEndDate || endDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdownEndDate, endDate, enableCountdown]);

  // Marquee animation for SCROLLING_MARQUEE
  useEffect(() => {
    if (layoutVariant !== 'SCROLLING_MARQUEE') return;
    Animated.loop(
      Animated.timing(marqueeAnim, {
        toValue: -screenWidth,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [layoutVariant, marqueeAnim, screenWidth]);

  const bannerUrl = resolveUrl(backgroundImage);

  const handleCta = () => {
    if (ctaUrl?.startsWith('/')) router.push(ctaUrl as any);
  };

  const IconComponent = ICONS[icon] || ICONS['FLASH'];

  const stripContent = (() => {
    switch (layoutVariant) {
      case 'SCROLLING_MARQUEE':
        return (
          <View style={styles.marqueeWrapper}>
            <Animated.View style={[styles.marqueeTrack, { transform: [{ translateX: marqueeAnim }] }]}>
              {[primaryHeading, offerText, badgeText, couponCode ? `Code: ${couponCode}` : '']
                .filter(Boolean)
                .map((txt, i) => (
                  <View key={i} style={styles.marqueeItem}>
                    {IconComponent}
                    <Text style={[styles.marqueeText, { color: textColor }]}>{txt}</Text>
                  </View>
                ))}
            </Animated.View>
          </View>
        );

      case 'COUPON_BANNER':
        return (
          <View style={styles.couponBanner}>
            <View style={styles.couponLeft}>
              {IconComponent}
              <View style={{ marginLeft: 10 }}>
                <Text style={[styles.heading, { color: headingColor }]}>{primaryHeading}</Text>
                {offerText ? <Text style={[styles.offerText, { color: textColor }]}>{offerText}</Text> : null}
              </View>
            </View>
            {couponCode ? (
              <View style={styles.couponCodeBox}>
                <Text style={styles.couponCodeLabel}>USE CODE</Text>
                <Text style={styles.couponCode}>{couponCode}</Text>
              </View>
            ) : null}
          </View>
        );

      case 'THREE_COLUMN_STRIP':
        return (
          <View style={styles.threeCol}>
            <View style={styles.colItem}>
              {IconComponent}
              <Text style={[styles.colText, { color: textColor }]}>{primaryHeading}</Text>
            </View>
            <View style={[styles.colItem, styles.colBorder]}>
              <Tag size={18} color="#fff" />
              <Text style={[styles.colText, { color: textColor }]}>{offerText || secondaryHeading}</Text>
            </View>
            <Pressable style={styles.colItem} onPress={handleCta}>
              <Text style={[styles.colCta, { color: textColor }]}>{ctaText}</Text>
            </Pressable>
          </View>
        );

      case 'COUNTDOWN_BANNER':
        return (
          <View style={styles.countdownBanner}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heading, { color: headingColor }]}>{primaryHeading}</Text>
              {offerText ? <Text style={[styles.offerText, { color: textColor }]}>{offerText}</Text> : null}
            </View>
            <View style={styles.countdownBlocks}>
              {([
                { v: timeLeft.h, l: 'HRS' },
                { v: timeLeft.m, l: 'MIN' },
                { v: timeLeft.s, l: 'SEC' },
              ] as const).map(({ v, l }) => (
                <View key={l} style={styles.cdBlock}>
                  <Text style={styles.cdNumber}>{pad(v)}</Text>
                  <Text style={styles.cdLabel}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 'CENTER_BANNER':
        return (
          <View style={styles.centerBanner}>
            {IconComponent}
            <Text style={[styles.heading, { color: headingColor, textAlign: 'center', marginTop: 8 }]}>
              {primaryHeading}
            </Text>
            {offerText ? (
              <Text style={[styles.offerText, { color: textColor, textAlign: 'center' }]}>{offerText}</Text>
            ) : null}
            {ctaText ? (
              <Pressable onPress={handleCta} style={styles.ctaBtn}>
                <Text style={styles.ctaBtnText}>{ctaText}</Text>
              </Pressable>
            ) : null}
          </View>
        );

      default: // LEFT_CONTENT_RIGHT_BUTTON, MARKETPLACE_PROMO_STRIP
        return (
          <View style={styles.leftRight}>
            <View style={styles.leftContent}>
              {IconComponent}
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={[styles.heading, { color: headingColor }]} numberOfLines={1}>
                  {primaryHeading}
                </Text>
                {offerText ? (
                  <Text style={[styles.offerText, { color: textColor }]} numberOfLines={1}>
                    {offerText}
                  </Text>
                ) : null}
              </View>
            </View>
            {ctaText ? (
              <Pressable onPress={handleCta} style={styles.ctaBtn}>
                <Text style={styles.ctaBtnText}>{ctaText}</Text>
              </Pressable>
            ) : null}
          </View>
        );
    }
  })();

  return (
    <View style={[styles.strip, { width: screenWidth }]}>
      {bannerUrl ? (
        <>
          <Image source={bannerUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
        </>
      ) : (
        // Simulated gradient using two overlapping views
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: gradientColor1 }]} />
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: gradientColor2,
                opacity: 0.6,
                // gradient direction approximation - right half fades in
              },
            ]}
          />
        </>
      )}
      <View style={styles.stripInner}>{stripContent}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    minHeight: 68,
    position: 'relative',
    marginBottom: 8,
    overflow: 'hidden',
  },
  stripInner: {
    padding: 14,
    paddingHorizontal: 16,
  },
  // LEFT_RIGHT
  leftRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  heading: {
    fontSize: 15,
    fontWeight: '800',
  },
  offerText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  ctaBtn: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  ctaBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  // MARQUEE
  marqueeWrapper: {
    height: 40,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  marqueeTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  marqueeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  marqueeText: {
    fontSize: 13,
    fontWeight: '600',
    whiteSpace: 'nowrap',
  } as any,
  // COUPON
  couponBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  couponLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  couponCodeBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderStyle: 'dashed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  couponCodeLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
  },
  couponCode: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  // THREE_COL
  threeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colItem: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  colBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  colText: {
    fontSize: 12,
    fontWeight: '600',
  },
  colCta: {
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  // COUNTDOWN
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countdownBlocks: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  cdBlock: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
    minWidth: 38,
  },
  cdNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  cdLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 8,
    fontWeight: '600',
  },
  // CENTER
  centerBanner: {
    alignItems: 'center',
    paddingVertical: 8,
  },
});
