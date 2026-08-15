import React from 'react';
import { View, Text } from 'react-native';
import { Star } from 'lucide-react-native';
import { Product, ProductVariant } from '../../types/catalog';

interface Props {
  product: Product;
  activeVariant: ProductVariant | null;
}

export const ProductInfo = ({ product, activeVariant }: Props) => {
  const displayPrice = activeVariant ? activeVariant.price : product.price;
  const displayDiscountPrice = activeVariant ? activeVariant.discountPrice : product.discountPrice;
  const displayStock = activeVariant ? activeVariant.stock : product.stock;
  
  const hasDiscount = !!displayDiscountPrice && displayDiscountPrice < displayPrice;
  const finalPrice = hasDiscount ? displayDiscountPrice : displayPrice;
  const discountPercent = hasDiscount
    ? Math.round(((displayPrice - displayDiscountPrice) / displayPrice) * 100)
    : 0;
    
  return (
    <View className="px-4 py-4 bg-white dark:bg-slate-950 mt-1">
      {/* Target UI Rating Badge */}
      <View className="flex-row items-center mb-4">
        <View className="flex-row items-center bg-amber-100/50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full">
          <Star size={12} className="text-amber-500 mr-1" fill="#f59e0b" />
          <Text className="text-amber-700 dark:text-amber-400 text-xs font-bold">
            {product.ratings?.averageRating ? product.ratings.averageRating.toFixed(1) : 'New'}
          </Text>
          {product.ratings?.totalReviews ? (
            <Text className="text-amber-700/60 dark:text-amber-400/60 text-xs font-medium ml-1">
              ({product.ratings.totalReviews})
            </Text>
          ) : null}
        </View>
      </View>

      <Text className="text-xl font-medium text-slate-900 dark:text-white mb-2 leading-tight">
        {product.name}
      </Text>

      {/* Pricing row matching exact target mock */}
      <View className="flex-row items-center mb-1">
        <Text className="text-[28px] font-bold text-slate-900 dark:text-white mr-2">
          {product.currency} {finalPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        {hasDiscount && (
          <Text className="text-sm font-medium text-slate-400 line-through mb-1">
            {product.currency} {displayPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        )}
      </View>
      
      {/* You save text + Label */}
      {hasDiscount && (
        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-teal-600 dark:text-teal-400 font-bold text-sm max-w-[70%]">
            You save {product.currency} {(displayPrice - displayDiscountPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Inclusive of all taxes)
          </Text>
          <View className="bg-rose-100 dark:bg-rose-900/40 px-2 py-1.5 rounded-lg items-center">
            <Text className="text-rose-600 dark:text-rose-400 text-sm font-black text-center leading-4">{discountPercent}%{'\n'}OFF</Text>
          </View>
        </View>
      )}
      
      {displayStock <= 0 ? (
        <Text className="text-red-500 font-bold text-sm mt-3">Out of Stock</Text>
      ) : displayStock <= (product.lowStockThreshold || 5) ? (
        <Text className="text-orange-500 font-bold text-sm mt-3">Only {displayStock} left - order soon</Text>
      ) : (
        <Text className="text-green-600 dark:text-green-400 font-medium text-sm mt-3">In Stock</Text>
      )}
    </View>
  );
};
