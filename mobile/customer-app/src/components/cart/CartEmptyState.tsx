import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface CartEmptyStateProps {
  onShopPress?: () => void;
}

export const CartEmptyState = ({ onShopPress }: CartEmptyStateProps) => {
  const router = useRouter();

  const handleShopPress = () => {
    if (onShopPress) {
      onShopPress();
    } else {
      router.push('/(tabs)/shop');
    }
  };

  return (
    <View className="flex-1 items-center justify-center p-8 bg-white dark:bg-slate-900">
      <View className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-6">
        <ShoppingBag size={48} className="text-slate-300 dark:text-slate-600" />
      </View>
      
      <Text className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">
        Your cart is empty
      </Text>
      
      <Text className="text-slate-500 dark:text-slate-400 text-center mb-8 px-4 leading-5">
        Looks like you haven't added anything to your cart yet.
      </Text>
      
      <Pressable 
        onPress={handleShopPress}
        className="bg-primary w-full max-w-[240px] h-14 rounded-xl items-center justify-center active:opacity-90"
      >
        <Text className="text-white font-semibold text-base">Start Shopping</Text>
      </Pressable>
    </View>
  );
};
