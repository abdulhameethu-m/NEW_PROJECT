import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Star } from 'lucide-react-native';
import { Product } from '../../types/catalog';
import { useRouter } from 'expo-router';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = memo(({ product }: ProductCardProps) => {
  const router = useRouter();

  const handlePress = () => {
    // Navigate to future product details route
    // Note: this route doesn't exist yet in Phase 3, this is the foundational setup
    router.push(`/product/${product._id}` as any);
  };

  const imageRef = product.images?.[0];
  const imageUrl = (typeof imageRef === 'string' ? imageRef : (imageRef as any)?.url) || product.thumbnail || '';
  const price = product.price || 0;
  const discountPrice = product.discountPrice;
  const hasDiscount = discountPrice && discountPrice < price;
  const displayPrice = hasDiscount ? discountPrice : price;
  
  const discountPercent = hasDiscount
    ? Math.round(((price - discountPrice) / price) * 100)
    : 0;

  return (
    <Pressable 
      onPress={handlePress}
      className="flex-1 m-1 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
    >
      <View className="aspect-square w-full bg-slate-50 dark:bg-slate-800 relative">
        {imageUrl ? (
          <Image
            source={imageUrl}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-slate-400">No Image</Text>
          </View>
        )}
        
        {hasDiscount && (
          <View className="absolute top-2 left-2 bg-red-500 px-2 py-1 rounded-md">
            <Text className="text-white text-xs font-bold">{discountPercent}% OFF</Text>
          </View>
        )}
        
        {product.stock <= 0 && (
          <View className="absolute top-2 right-2 bg-slate-900/80 px-2 py-1 rounded-md">
            <Text className="text-white text-xs font-bold">Out of Stock</Text>
          </View>
        )}
      </View>

      <View className="p-3">
        <Text numberOfLines={2} className="text-sm font-medium text-slate-900 dark:text-slate-100 h-10">
          {product.name}
        </Text>
        
        <View className="flex-row items-center mt-1">
          <Star size={12} className="text-amber-400" fill="#fbbf24" />
          <Text className="text-xs text-slate-500 dark:text-slate-400 ml-1">
            {product.ratings?.averageRating ? product.ratings.averageRating.toFixed(1) : 'New'}
          </Text>
          {product.ratings?.totalReviews ? (
            <Text className="text-xs text-slate-400 dark:text-slate-500 ml-1">
              ({product.ratings.totalReviews})
            </Text>
          ) : null}
        </View>

        <View className="flex-row items-baseline mt-2 space-x-2">
          <Text className="text-base font-bold text-slate-900 dark:text-white">
            {product.currency} {displayPrice.toLocaleString()}
          </Text>
          {hasDiscount && (
            <Text className="text-xs text-slate-400 line-through">
              {price.toLocaleString()}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
});
