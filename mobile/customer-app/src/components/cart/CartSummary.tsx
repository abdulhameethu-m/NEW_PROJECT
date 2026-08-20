import React from 'react';
import { View, Text } from 'react-native';

interface CartSummaryProps {
  subtotal: number;
  totalAmount: number;
  currency: string;
}

export const CartSummary = ({ subtotal, totalAmount, currency }: CartSummaryProps) => {
  // We strictly rely on backend calculations.
  // We can format it explicitly based on the app's established rules (₹ symbol etc.)
  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <View className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 pb-8 safe-area-bottom">
      <View className="space-y-3 mb-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-slate-500 dark:text-slate-400">Subtotal</Text>
          <Text className="text-slate-900 dark:text-white font-medium">{formatCurrency(subtotal)}</Text>
        </View>
        <View className="flex-row justify-between items-center">
          <Text className="text-slate-500 dark:text-slate-400">Delivery</Text>
          <Text className="text-green-600 dark:text-green-500 font-medium">Calculated at checkout</Text>
        </View>
      </View>
      
      <View className="flex-row justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800 mb-6">
        <Text className="text-lg font-bold text-slate-900 dark:text-white">Total</Text>
        <Text className="text-2xl font-extrabold text-slate-900 dark:text-white">
          {formatCurrency(totalAmount)}
        </Text>
      </View>
      
      {/* Note: Checkout Button will be rendered at the screen level above this to handle navigation appropriately */}
    </View>
  );
};
