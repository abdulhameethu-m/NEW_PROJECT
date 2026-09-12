import React, { useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Check, ShoppingBag, ArrowRight, Package, Truck, ShieldCheck } from 'lucide-react-native';
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
  { id: 1, angle: 0, distance: 68, color: '#10b981', size: 8 },
  { id: 2, angle: 45, distance: 75, color: '#6366f1', size: 10 },
  { id: 3, angle: 90, distance: 70, color: '#f59e0b', size: 7 },
  { id: 4, angle: 135, distance: 76, color: '#ec4899', size: 9 },
  { id: 5, angle: 180, distance: 68, color: '#3b82f6', size: 8 },
  { id: 6, angle: 225, distance: 78, color: '#10b981', size: 11 },
  { id: 7, angle: 270, distance: 72, color: '#8b5cf6', size: 8 },
  { id: 8, angle: 315, distance: 74, color: '#f97316', size: 10 },
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
    orderNumber?: string;
    orderGroupId?: string;
    totalAmount?: string;
    paymentMethod?: string;
    recipientName?: string;
    deliveryCity?: string;
  }>();

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
    ring1Scale.value = withDelay(
      150,
      withTiming(2.2, { duration: 750 })
    );
    ring1Opacity.value = withDelay(
      150,
      withTiming(0, { duration: 750 })
    );

    ring2Scale.value = withDelay(
      280,
      withTiming(2.5, { duration: 800 })
    );
    ring2Opacity.value = withDelay(
      280,
      withTiming(0, { duration: 800 })
    );

    // 3. Popping particles burst outwards
    particleProgress.value = withDelay(
      200,
      withTiming(1, { duration: 650 })
    );
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

  return (
    <SafeAreaScreen className="flex-1 bg-slate-50 dark:bg-black">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 50, alignItems: 'center' }}
      >
        {/* Celebratory Popping Checkmark Container */}
        <View className="mt-8 mb-5 items-center justify-center h-44 w-44">
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
            <View className="w-20 h-20 rounded-full border-2 border-emerald-300/40 items-center justify-center">
              <Check size={48} color="white" strokeWidth={3.5} />
            </View>
          </Animated.View>
        </View>

        {/* Order Confirmed Text (Slides up) */}
        <Animated.View entering={FadeInUp.delay(220).duration(400)} className="items-center mb-6">
          <Text className="text-2xl font-black text-slate-900 dark:text-white text-center tracking-tight">
            Order Confirmed!
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-xs text-center mt-1.5 px-4 leading-5">
            Thank you, <Text className="font-bold text-slate-800 dark:text-slate-200">{recipientName}</Text>! Your order has been placed and is being packed.
          </Text>
        </Animated.View>

        {/* Order Details Card (Slides up) */}
        <Animated.View
          entering={FadeInUp.delay(360).duration(450)}
          className="w-full bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm mb-5"
        >
          {/* Order Reference */}
          <View className="pb-3.5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between">
            <View>
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                Order Number
              </Text>
              <Text className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                #{orderNumber}
              </Text>
            </View>

            <View className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full">
              <Text className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                Confirmed
              </Text>
            </View>
          </View>

          {/* Meta rows */}
          <View className="py-3.5 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
            {/* Payment Mode */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Package size={15} className="text-slate-400 mr-2" />
                <Text className="text-xs text-slate-500 dark:text-slate-400">Payment Mode</Text>
              </View>
              <View className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment'}
                </Text>
              </View>
            </View>

            {/* Delivery To */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <Truck size={15} className="text-slate-400 mr-2 flex-shrink-0" />
                <Text className="text-xs text-slate-500 dark:text-slate-400">Deliver To</Text>
              </View>
              <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[55%]" numberOfLines={1}>
                {deliveryCity}
              </Text>
            </View>

            {/* Estimated Delivery */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <ShieldCheck size={15} className="text-slate-400 mr-2" />
                <Text className="text-xs text-slate-500 dark:text-slate-400">Estimated Delivery</Text>
              </View>
              <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                3 - 5 Business Days
              </Text>
            </View>
          </View>

          {/* Total Amount Row */}
          <View className="pt-3.5 flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-bold text-slate-900 dark:text-white">
                {paymentMethod === 'COD' ? 'Payable on Delivery' : 'Total Paid'}
              </Text>
              <Text className="text-[10px] text-slate-400">All taxes & fees included</Text>
            </View>
            <Text className="text-xl font-black text-indigo-600 dark:text-indigo-400">
              ₹{totalAmount.toLocaleString('en-IN')}
            </Text>
          </View>
        </Animated.View>

        {/* Action Buttons (Slide up) */}
        <Animated.View entering={FadeInUp.delay(500).duration(450)} className="w-full space-y-2.5">
          <Pressable
            onPress={() => router.replace('/(tabs)/shop')}
            className="w-full h-12 bg-indigo-600 rounded-xl flex-row items-center justify-center active:bg-indigo-700 shadow-md shadow-indigo-200 dark:shadow-none"
          >
            <ShoppingBag size={17} color="white" className="mr-2" />
            <Text className="text-white font-bold text-sm">Continue Shopping</Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace('/(tabs)')}
            className="w-full h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex-row items-center justify-center active:bg-slate-50 dark:active:bg-slate-800"
          >
            <Text className="text-slate-700 dark:text-slate-200 font-bold text-sm mr-2">
              Back to Home
            </Text>
            <ArrowRight size={15} className="text-slate-400" />
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaScreen>
  );
}
