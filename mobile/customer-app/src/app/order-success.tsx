import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Check,
  ShoppingBag,
  ArrowRight,
  Package,
  MapPin,
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  FadeInUp,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaScreen } from '../components/layout/SafeAreaScreen';

const { width } = Dimensions.get('window');

// Confetti particle configuration
const PARTICLES = [
  { id: 1, angle: 0, distance: 70, color: '#10b981', size: 8 },
  { id: 2, angle: 45, distance: 78, color: '#6366f1', size: 10 },
  { id: 3, angle: 90, distance: 72, color: '#f59e0b', size: 7 },
  { id: 4, angle: 135, distance: 80, color: '#ec4899', size: 9 },
  { id: 5, angle: 180, distance: 70, color: '#3b82f6', size: 8 },
  { id: 6, angle: 225, distance: 82, color: '#10b981', size: 10 },
  { id: 7, angle: 270, distance: 74, color: '#8b5cf6', size: 8 },
  { id: 8, angle: 315, distance: 78, color: '#f97316', size: 10 },
];

const ConfettiDot = ({
  angle,
  distance,
  color,
  size,
  progress,
}: {
  angle: number;
  distance: number;
  color: string;
  size: number;
  progress: SharedValue<number>;
}) => {
  const rad = (angle * Math.PI) / 180;
  const targetX = Math.cos(rad) * distance;
  const targetY = Math.sin(rad) * distance;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: targetX * progress.value },
        { translateY: targetY * progress.value },
        { scale: (1 - progress.value * 0.4) * (progress.value > 0 ? 1 : 0) },
      ],
      opacity: (1 - progress.value) * (progress.value > 0.1 ? 1 : progress.value * 10),
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

export default function OrderSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderId?: string;
    orderNumber?: string;
    orderGroupId?: string;
    totalAmount?: string;
    paymentMethod?: string;
    recipientName?: string;
    deliveryCity?: string;
  }>();

  const orderId = params.orderId || '';
  const orderNumber = params.orderNumber || 'CONFIRMED';
  const totalAmount = params.totalAmount ? Number(params.totalAmount) : 0;
  const paymentMethod = params.paymentMethod || 'COD';
  const recipientName = params.recipientName || 'Customer';
  const deliveryCity = params.deliveryCity || 'Your Delivery Address';

  // Animation values
  const tickScale = useSharedValue(0);
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0.8);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0.6);
  const particleProgress = useSharedValue(0);

  useEffect(() => {
    // 1. Tick Circle Pops with bouncy spring
    tickScale.value = withSequence(
      withTiming(1.25, { duration: 320 }),
      withSpring(1.0, { damping: 9, stiffness: 130 })
    );

    // 2. Ripple rings shockwave expansion
    ring1Scale.value = withDelay(150, withTiming(2.2, { duration: 750 }));
    ring1Opacity.value = withDelay(150, withTiming(0, { duration: 750 }));

    ring2Scale.value = withDelay(280, withTiming(2.5, { duration: 800 }));
    ring2Opacity.value = withDelay(280, withTiming(0, { duration: 800 }));

    // 3. Popping particles burst outwards
    particleProgress.value = withDelay(200, withTiming(1, { duration: 650 }));
  }, []);

  const tickStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tickScale.value }],
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const isCod = paymentMethod === 'COD';

  return (
    <SafeAreaScreen style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Celebratory Popping Checkmark Container */}
        <View style={styles.animationContainer}>
          {/* Shockwave Ripple Ring 2 */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: 96,
                height: 96,
                borderRadius: 48,
                borderWidth: 2,
                borderColor: '#10b981',
              },
              ring2Style,
            ]}
          />

          {/* Shockwave Ripple Ring 1 */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: '#a7f3d0',
              },
              ring1Style,
            ]}
          />

          {/* Popping Confetti Dots */}
          {PARTICLES.map((p) => (
            <ConfettiDot
              key={p.id}
              angle={p.angle}
              distance={p.distance}
              color={p.color}
              size={p.size}
              progress={particleProgress}
            />
          ))}

          {/* Main Popping Tick Badge */}
          <Animated.View
            style={[
              {
                width: 92,
                height: 92,
                borderRadius: 46,
                backgroundColor: '#10b981',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#10b981',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.35,
                shadowRadius: 16,
                elevation: 10,
              },
              tickStyle,
            ]}
          >
            <View style={styles.innerTickRing}>
              <Check size={46} color="#ffffff" strokeWidth={3.5} />
            </View>
          </Animated.View>
        </View>

        {/* Order Confirmed Text (Slides up) */}
        <Animated.View entering={FadeInUp.delay(220).duration(400)} style={styles.titleSection}>
          <Text style={styles.titleText} allowFontScaling={false}>
            Order Confirmed!
          </Text>
          <Text style={styles.subtitleText} allowFontScaling={false}>
            Thank you, <Text style={styles.recipientHighlight}>{recipientName}</Text>! Your order has been placed and is being packed.
          </Text>
        </Animated.View>

        {/* Order Details Card (Slides up) */}
        <Animated.View entering={FadeInUp.delay(360).duration(450)} style={styles.card}>
          {/* Order Header: Number + Status Badge */}
          <View style={styles.cardHeader}>
            <View style={styles.orderNumberBlock}>
              <Text style={styles.orderNumberLabel} allowFontScaling={false}>
                ORDER NUMBER
              </Text>
              <Text style={styles.orderNumberText} numberOfLines={1} allowFontScaling={false}>
                #{orderNumber}
              </Text>
            </View>

            <View style={styles.confirmedBadge}>
              <Text style={styles.confirmedBadgeText} allowFontScaling={false}>
                Confirmed
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Information Rows */}
          <View style={styles.infoRows}>
            {/* Payment Mode */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabelGroup}>
                {isCod ? (
                  <Banknote size={16} color="#64748b" style={styles.infoIcon} />
                ) : (
                  <CreditCard size={16} color="#64748b" style={styles.infoIcon} />
                )}
                <Text style={styles.infoLabel} allowFontScaling={false}>
                  Payment Mode
                </Text>
              </View>
              <View style={styles.paymentMethodPill}>
                <Text style={styles.paymentMethodText} allowFontScaling={false}>
                  {isCod ? 'Cash on Delivery' : 'Online Payment'}
                </Text>
              </View>
            </View>

            {/* Deliver To */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabelGroup}>
                <MapPin size={16} color="#64748b" style={styles.infoIcon} />
                <Text style={styles.infoLabel} allowFontScaling={false}>
                  Deliver To
                </Text>
              </View>
              <Text style={styles.addressValue} numberOfLines={1} allowFontScaling={false}>
                {deliveryCity}
              </Text>
            </View>

            {/* Estimated Delivery */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabelGroup}>
                <ShieldCheck size={16} color="#64748b" style={styles.infoIcon} />
                <Text style={styles.infoLabel} allowFontScaling={false}>
                  Estimated Delivery
                </Text>
              </View>
              <Text style={styles.deliveryEstimateText} allowFontScaling={false}>
                3 - 5 Business Days
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Total Amount Row */}
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel} allowFontScaling={false}>
                {isCod ? 'Payable on Delivery' : 'Total Paid'}
              </Text>
              <Text style={styles.totalSubtitle} allowFontScaling={false}>
                All taxes & fees included
              </Text>
            </View>
            <Text style={styles.totalAmount} allowFontScaling={false}>
              ₹{totalAmount.toLocaleString('en-IN')}
            </Text>
          </View>
        </Animated.View>

        {/* Action Buttons (Slide up) */}
        <Animated.View entering={FadeInUp.delay(500).duration(450)} style={styles.actionsContainer}>
          <TouchableOpacity
            onPress={() => {
              if (orderId) {
                router.replace({
                  pathname: '/orders/[id]' as any,
                  params: { id: orderId },
                });
              } else {
                router.replace('/orders' as any);
              }
            }}
            style={styles.primaryBtn}
            activeOpacity={0.82}
          >
            <Truck size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText} allowFontScaling={false}>
              Track Order
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/shop')}
            style={styles.secondaryBtn}
            activeOpacity={0.82}
          >
            <ShoppingBag size={18} color="#1e293b" style={{ marginRight: 8 }} />
            <Text style={styles.secondaryBtnText} allowFontScaling={false}>
              Continue Shopping
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={styles.textBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.textBtnTitle} allowFontScaling={false}>
              Back to Home
            </Text>
            <ArrowRight size={14} color="#64748b" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
    alignItems: 'center',
  },
  animationContainer: {
    marginTop: 18,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    width: 140,
  },
  innerTickRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  recipientHighlight: {
    fontWeight: '700',
    color: '#1e293b',
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  orderNumberBlock: {
    flex: 1,
    marginRight: 10,
  },
  orderNumberLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  orderNumberText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4f46e5',
  },
  confirmedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 20,
  },
  confirmedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  infoRows: {
    paddingVertical: 12,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  infoLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  paymentMethodPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  addressValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    maxWidth: '55%',
    textAlign: 'right',
  },
  deliveryEstimateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4f46e5',
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#1e293b',
    fontSize: 15,
    fontWeight: '700',
  },
  textBtn: {
    width: '100%',
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  textBtnTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
});
