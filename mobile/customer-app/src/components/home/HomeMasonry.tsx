import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ResponsiveContainer } from '../layout/ResponsiveContainer';
import { ProductCard } from '../catalog/ProductCard';
import { ProductSkeleton } from '../catalog/ProductSkeleton';
import { Product } from '../../types/catalog';
import { resolveUrl } from '../../utils/resolveUrl';

interface HomeMasonryProps {
  title?: string;
  products: Product[];
  mobileColumns?: number;
  cardHeights?: 'AUTO' | 'MIXED' | 'TALL' | 'WIDE';
  isLoading?: boolean;
}

export const HomeMasonry = ({
  title = 'Discover',
  products = [],
  mobileColumns = 2,
  cardHeights = 'MIXED',
  isLoading = false,
}: HomeMasonryProps) => {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  const cols = Math.min(Math.max(mobileColumns, 1), 2);
  const itemWidth = (screenWidth - 32 - (cols - 1) * 8) / cols;

  if (isLoading) {
    return (
      <ResponsiveContainer className="py-4">
        <View className="flex-row flex-wrap">
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ width: itemWidth, margin: 4 }}>
              <ProductSkeleton />
            </View>
          ))}
        </View>
      </ResponsiveContainer>
    );
  }

  if (!products || products.length === 0) return null;

  // Split products into columns for masonry effect
  const leftCol: Product[] = [];
  const rightCol: Product[] = [];
  products.forEach((p, i) => {
    if (i % 2 === 0) leftCol.push(p);
    else rightCol.push(p);
  });

  // Heights for MIXED masonry effect
  const getHeight = (index: number): number => {
    if (cardHeights === 'TALL') return 300;
    if (cardHeights === 'WIDE') return 220;
    if (cardHeights === 'AUTO') return itemWidth;
    // MIXED: alternate between tall and short
    return index % 2 === 0 ? 280 : 220;
  };

  const renderColumn = (items: Product[], startIndex: number) => (
    <View style={{ flex: 1, gap: 8 }}>
      {items.map((product, i) => {
        const absIndex = startIndex + i * 2;
        const imageRef = product.images?.[0];
        const imageUrl =
          (typeof imageRef === 'string' ? imageRef : (imageRef as any)?.url) ||
          product.thumbnail ||
          '';
        const imgHeight = getHeight(absIndex);

        return (
          <Pressable
            key={product._id}
            style={[styles.card, { height: imgHeight + 80 }]}
            onPress={() => router.push(`/product/${product.slug}` as any)}
          >
            <Image
              source={resolveUrl(imageUrl) || imageUrl}
              style={[styles.cardImage, { height: imgHeight }]}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.cardInfo}>
              <Text style={styles.cardName} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={styles.cardPrice}>
                ₹{(product.discountPrice || product.price || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <ResponsiveContainer className="py-4" withPadding={false}>
      <View className="px-4 mb-3 flex-row justify-between items-end">
        <Text className="text-lg font-bold text-slate-900 dark:text-white flex-1 mr-2" numberOfLines={1}>
          {title}
        </Text>
        <Pressable onPress={() => router.push('/(tabs)/shop' as any)}>
          <Text className="text-amber-600 dark:text-amber-500 font-semibold text-sm">See All</Text>
        </Pressable>
      </View>

      <View style={styles.masonryContainer}>
        {renderColumn(leftCol, 0)}
        {cols > 1 && renderColumn(rightCol, 1)}
      </View>
    </ResponsiveContainer>
  );
};

const styles = StyleSheet.create({
  masonryContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardImage: {
    width: '100%',
  },
  cardInfo: {
    padding: 10,
    flex: 1,
  },
  cardName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 16,
    marginBottom: 4,
  },
  cardPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
});
