import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { CartItem as CartItemType } from '../../types/cart';
import { CartQuantityControl } from './CartQuantityControl';

interface CartItemProps {
  item: CartItemType;
  onIncrease: () => void;
  onDecrease: () => void;
  isLoading?: boolean;
}

export const CartItem = ({ item, onIncrease, onDecrease, isLoading }: CartItemProps) => {
  const { productId: product, quantity, price, image, variantId, variantTitle, variantAttributes } = item;
  const productName = product?.name || 'Unknown Product';
  const rawImage = image 
    || (product?.images?.[0] as any)?.url 
    || (typeof product?.images?.[0] === 'string' ? product.images[0] : null);

  // Format attributes for subtitle 
  const attributesString = useMemo(() => {
    if (!variantAttributes) return '';
    return Object.entries(variantAttributes)
      .map(([_, val]) => val)
      .join(', ');
  }, [variantAttributes]);

  // Remove duplicates between title and attributes
  const subtitleTokens = [variantTitle, attributesString].filter(Boolean);
  const subtitle = [...new Set(subtitleTokens)].join(' • ');

  // Compute stock limitations specifically for the variant or fall back to product
  const maxAvailable = product?.stock || 0; // The actual validation boundary is server-enforced, but we can prevent blind presses here
  const isMaxStockReached = quantity >= maxAvailable;
  
  const formattedPrice = `₹${price.toLocaleString('en-IN')}`;
  
  return (
    <View className="flex-row p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
      <View className="w-20 h-20 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex-shrink-0 overflow-hidden">
        {rawImage ? (
          <Image
            source={rawImage}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
            transition={300}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-slate-400 text-xs">No image</Text>
          </View>
        )}
      </View>
      
      <View className="flex-1 ml-4 py-1 justify-between">
        <View>
          <Text className="text-slate-900 dark:text-white font-medium text-base mb-1" numberOfLines={2}>
            {productName}
          </Text>
          {!!subtitle && (
            <Text className="text-slate-500 dark:text-slate-400 text-xs mb-2">
              {subtitle}
            </Text>
          )}
        </View>

        <View className="flex-row items-center justify-between mt-auto pt-2">
          <Text className="text-slate-900 dark:text-white font-bold text-[17px]">
            {formattedPrice}
          </Text>
          
          <CartQuantityControl
            quantity={quantity}
            onIncrease={onIncrease}
            onDecrease={onDecrease}
            isLoading={isLoading}
            isMaxStockReached={isMaxStockReached}
          />
        </View>
      </View>
    </View>
  );
};
