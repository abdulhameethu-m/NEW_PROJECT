import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import { Product } from '../../types/catalog';
import { resolveUrl } from '../../utils/resolveUrl';
import { HighlightText } from './HighlightText';

interface SearchAutocompleteItemProps {
  product: Product;
  searchQuery: string;
  onPress: (product: Product) => void;
}

const formatPrice = (val: number, curr?: string) => {
  const sym = (!curr || curr === 'INR') ? '₹' : curr === 'USD' ? '$' : curr;
  return `${sym}${val.toLocaleString('en-IN')}`;
};

export const SearchAutocompleteItem: React.FC<SearchAutocompleteItemProps> = ({
  product,
  searchQuery,
  onPress,
}) => {
  const imageUrl = resolveUrl(
    product.thumbnail || (product.images && product.images.length > 0 ? product.images[0].url : undefined)
  );

  const displayPrice = product.discountPrice || product.price;
  const originalPrice = product.discountPrice ? product.price : null;
  const discountPercent = originalPrice && displayPrice
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
    : 0;

  const categoryName = typeof product.category === 'string' ? product.category : '';
  const sellerName = product.sellerId?.shopName || product.sellerId?.companyName;

  return (
    <Pressable
      onPress={() => onPress(product)}
      className="flex-row items-center py-3 px-4 border-b border-slate-100 dark:border-slate-800/80 active:bg-slate-50 dark:active:bg-slate-900"
    >
      {/* Product Thumbnail */}
      <View className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden items-center justify-center border border-slate-200/60 dark:border-slate-700/60">
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            className="w-full h-full"
            contentFit="cover"
            transition={200}
          />
        ) : (
          <Sparkles size={20} className="text-slate-400" />
        )}
      </View>

      {/* Product Details */}
      <View className="flex-1 ml-3 mr-2 justify-center">
        <HighlightText
          text={product.name}
          highlight={searchQuery}
          style={{ fontSize: 14, fontWeight: '600', color: '#0f172a' }}
          highlightStyle={{ color: '#d97706', fontWeight: '700' }}
          numberOfLines={2}
        />

        <View className="flex-row items-center mt-1 space-x-2">
          {categoryName ? (
            <View className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded mr-2">
              <Text className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                {categoryName}
              </Text>
            </View>
          ) : null}

          {sellerName ? (
            <Text className="text-[11px] text-slate-400 dark:text-slate-500" numberOfLines={1}>
              by {sellerName}
            </Text>
          ) : null}
        </View>

        {/* Pricing Row */}
        <View className="flex-row items-center mt-1">
          <Text className="text-xs font-bold text-slate-900 dark:text-white">
            {formatPrice(displayPrice, product.currency)}
          </Text>

          {originalPrice && originalPrice > displayPrice && (
            <Text className="text-[11px] text-slate-400 line-through ml-2">
              {formatPrice(originalPrice, product.currency)}
            </Text>
          )}

          {discountPercent > 0 && (
            <View className="bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded ml-2">
              <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                {discountPercent}% OFF
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Navigation Arrow */}
      <ChevronRight size={18} className="text-slate-400" />
    </Pressable>
  );
};
