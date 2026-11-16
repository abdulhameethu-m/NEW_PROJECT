import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowRight } from 'lucide-react-native';

interface CartSummaryProps {
  subtotal: number;
  totalAmount: number;
  currency: string;
  onCheckout?: () => void;
}

export const CartSummary = ({ subtotal, totalAmount, onCheckout }: CartSummaryProps) => {
  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl mx-3 my-3 shadow-sm">
      <View className="gap-2.5 mb-3">
        <View className="flex-row justify-between items-center">
          <Text className="text-slate-500 dark:text-slate-400 text-xs font-medium">Subtotal</Text>
          <Text className="text-slate-900 dark:text-slate-100 font-semibold text-xs">{formatCurrency(subtotal)}</Text>
        </View>
        <View className="flex-row justify-between items-center">
          <Text className="text-slate-500 dark:text-slate-400 text-xs font-medium">Delivery</Text>
          <Text className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs">Calculated at checkout</Text>
        </View>
      </View>
      
      <View className="flex-row justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
        <Text className="text-sm font-bold text-slate-900 dark:text-white">Total</Text>
        <Text className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(totalAmount)}</Text>
      </View>

      {onCheckout && (
        <TouchableOpacity
          onPress={onCheckout}
          activeOpacity={0.8}
          className="w-full h-12 bg-indigo-600 rounded-xl flex-row items-center justify-center mt-4"
        >
          <Text className="text-white font-extrabold text-sm">Move to Checkout</Text>
          <ArrowRight size={16} color="#ffffff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      )}
    </View>
  );
};
