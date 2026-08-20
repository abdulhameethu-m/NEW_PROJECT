import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Minus, Plus, Trash2 } from 'lucide-react-native';

interface CartQuantityControlProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  isLoading?: boolean;
  isMaxStockReached?: boolean;
}

export const CartQuantityControl = ({
  quantity,
  onIncrease,
  onDecrease,
  isLoading = false,
  isMaxStockReached = false,
}: CartQuantityControlProps) => {
  return (
    <View className="flex-row items-center border border-slate-200 dark:border-slate-700 rounded-lg">
      <Pressable
        onPress={onDecrease}
        disabled={isLoading}
        className={`w-8 h-8 items-center justify-center border-r border-slate-200 dark:border-slate-700 ${
          quantity <= 1 ? 'opacity-50' : 'active:bg-slate-100 dark:active:bg-slate-800'
        }`}
        accessibilityLabel={quantity === 1 ? "Remove item" : "Decrease quantity"}
      >
        {quantity === 1 ? (
          <Trash2 size={16} className="text-red-500" />
        ) : (
          <Minus size={16} className="text-slate-600 dark:text-slate-400" />
        )}
      </Pressable>

      <View className="w-10 h-8 items-center justify-center bg-slate-50 dark:bg-slate-900 border-x border-slate-200 dark:border-slate-700">
        {isLoading ? (
          <ActivityIndicator size="small" color="#64748b" />
        ) : (
          <Text className="text-slate-900 dark:text-white font-medium">{quantity}</Text>
        )}
      </View>

      <Pressable
        onPress={onIncrease}
        disabled={isLoading || isMaxStockReached}
        className={`w-8 h-8 items-center justify-center border-l border-slate-200 dark:border-slate-700 ${
          isMaxStockReached ? 'opacity-50' : 'active:bg-slate-100 dark:active:bg-slate-800'
        }`}
        accessibilityLabel="Increase quantity"
      >
        <Plus size={16} className="text-slate-600 dark:text-slate-400" />
      </Pressable>
    </View>
  );
};
