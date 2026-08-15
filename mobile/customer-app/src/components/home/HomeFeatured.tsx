import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ResponsiveContainer } from '../layout/ResponsiveContainer';
import { ProductCard } from '../catalog/ProductCard';
import { ProductSkeleton } from '../catalog/ProductSkeleton';
import { Product } from '../../types/catalog';
import { useRouter } from 'expo-router';

interface HomeFeaturedProps {
  products: Product[];
  isLoading?: boolean;
  title?: string;
}

export const HomeFeatured = ({ products, isLoading, title = "Explore Products" }: HomeFeaturedProps) => {
  const router = useRouter();

  if (isLoading) {
    return (
      <View className="py-4">
        <View className="px-4 mb-3">
          <Text className="text-lg font-bold text-slate-900 dark:text-white">{title}</Text>
        </View>
        <View className="flex-row flex-wrap px-3">
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className="w-1/2 p-1">
              <ProductSkeleton />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <ResponsiveContainer className="py-4" withPadding={false}>
      <View className="px-4 mb-3 flex-row justify-between items-end">
        <Text className="text-lg font-bold text-slate-900 dark:text-white flex-1 mr-2" numberOfLines={1}>{title}</Text>
        <Pressable onPress={() => router.push('/(tabs)/shop')}>
          <Text className="text-amber-600 dark:text-amber-500 font-semibold text-sm">See All</Text>
        </Pressable>
      </View>
      <View className="flex-row flex-wrap px-3">
        {products.map((product) => (
          <View key={product._id} className="w-1/2 expanded:w-1/3 p-1">
            <ProductCard product={product} />
          </View>
        ))}
      </View>
    </ResponsiveContainer>
  );
};
