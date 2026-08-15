import React, { useMemo, useState, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Heart } from 'lucide-react-native';

import { useProduct } from '../../hooks/useProduct';
import { useProductReviews } from '../../hooks/useProductReviews';
import { ResponsiveContainer } from '../../components/layout/ResponsiveContainer';
import { ProductGallery } from '../../components/product/ProductGallery';
import { ProductInfo } from '../../components/product/ProductInfo';
import { VariantSelector } from '../../components/product/VariantSelector';
import { ProductAttributes } from '../../components/product/ProductAttributes';
import { ProductDescription } from '../../components/product/ProductDescription';
import { ReviewSummary } from '../../components/product/ReviewSummary';
import { ReviewCard } from '../../components/product/ReviewCard';
import { ReviewForm } from '../../components/product/ReviewForm';
import { ProductVariant } from '../../types/catalog';

export default function ProductDetailsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [isReviewFormVisible, setIsReviewFormVisible] = useState(false);

  const { data: product, isLoading: isProductLoading, isError: isProductError } = useProduct(slug);
  const { 
    data: reviewsData, 
    isLoading: isReviewsLoading, 
    hasNextPage, 
    fetchNextPage,
    isFetchingNextPage
  } = useProductReviews(product?._id);

  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);

  // Auto-select default variant on load
  useEffect(() => {
    if (product?.variants?.length) {
      const def = product.variants.find(v => v.isDefault) || product.variants[0];
      if (def && (!activeVariantId || !product.variants.find(v => v.variantId === activeVariantId))) {
        setActiveVariantId(def.variantId);
      }
    }
  }, [product, activeVariantId]);

  const activeVariant = useMemo(() => {
    if (!product || !activeVariantId) return null;
    return product.variants?.find(v => v.variantId === activeVariantId) || null;
  }, [product, activeVariantId]);

  const reviews = useMemo(() => {
    return reviewsData?.pages.flatMap(page => page.reviews) || [];
  }, [reviewsData]);

  if (isProductLoading) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" className="text-indigo-600" />
      </View>
    );
  }

  if (isProductError || !product) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-950 justify-center items-center p-4">
        <Text className="text-red-500 mb-4">Error loading product details</Text>
        <Text onPress={() => router.back()} className="text-indigo-600 font-medium">Go Back</Text>
      </View>
    );
  }

  const renderHeader = () => {
    // Determine overlapping presentation states
    const displayImages = activeVariant?.images && activeVariant.images.length > 0 
      ? activeVariant.images 
      : product.images;

    return (
      <View className="pb-4">
        {/* Keeping strict standard back navigation for product app */}
        <View 
          className="flex-row items-center px-4 pb-2 bg-white dark:bg-slate-950 z-10" 
          style={{ paddingTop: insets.top + 8 }}
        >
          <ChevronLeft 
            size={28} 
            className="text-slate-900 dark:text-slate-100 mr-2" 
            onPress={() => router.back()} 
          />
          <Text className="text-lg font-bold text-slate-900 dark:text-white flex-1" numberOfLines={1}>
            {product.name}
          </Text>
        </View>
        
        <ProductGallery images={displayImages} />
        <ProductInfo product={product} activeVariant={activeVariant} />
        <VariantSelector 
          product={product} 
          activeVariant={activeVariant} 
          onSelectVariant={setActiveVariantId} 
        />
        <ProductDescription description={product.description} />
        <ProductAttributes attributes={product.attributes} />
        
        {/* Placeholder for "Sold By" component from Phase 6 */}
        <View className="px-4 py-4 mt-2 bg-white dark:bg-slate-950">
          <Text className="text-lg font-bold text-slate-900 dark:text-white mb-4">Sold By</Text>
          <View className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex-row items-center">
            <View className="w-12 h-12 bg-blue-600 rounded-lg justify-center items-center mr-3">
              <Text className="text-white font-bold text-xs">{product.sellerId?.shopName?.substring(0, 3) || 'SIM'}</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="font-bold text-slate-900 dark:text-white mr-1">{product.sellerId?.shopName || 'Store'}</Text>
              </View>
              <Text className="text-slate-500 text-xs mt-0.5">⭐ New  ·  80 Followers</Text>
            </View>
            <View className="flex-row">
              <Pressable className="bg-indigo-500 px-3 py-1.5 rounded mr-2"><Text className="text-white text-xs font-bold">View Profile</Text></Pressable>
              <Pressable className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded"><Text className="text-slate-900 dark:text-slate-100 text-xs font-bold">Follow</Text></Pressable>
            </View>
          </View>
        </View>

        <ReviewSummary ratings={product.ratings} />
        
        <View className="px-4 pt-4 pb-24 bg-white dark:bg-slate-950">
          <Pressable 
            onPress={() => setIsReviewFormVisible(true)}
            className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 items-center justify-center"
          >
            <Text className="text-slate-900 dark:text-white font-bold">Write a Review</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (isReviewsLoading || isFetchingNextPage) {
      return (
        <View className="p-4 items-center">
          <ActivityIndicator size="small" className="text-indigo-600" />
        </View>
      );
    }
    
    if (reviews.length === 0) {
      return (
        <View className="p-8 pb-32 items-center bg-white dark:bg-slate-950">
        </View>
      );
    }
    
    return <View className="h-32 bg-white dark:bg-slate-950" />;
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ResponsiveContainer>
        <FlatList
          data={reviews}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <ReviewCard review={item} />}
          ListHeaderComponent={renderHeader()}
          ListFooterComponent={renderFooter()}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom }}
        />
        
        {/* Fixed Bottom Cart Bar matching Target UI */}
        <View 
          className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-950 pt-4 pb-4 px-4 border-t border-slate-200 dark:border-slate-800 flex-row items-center rounded-t-3xl shadow-lg shadow-black/10"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="absolute top-2 w-full items-center">
            <View className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </View>
          
          <Pressable className="w-12 h-12 rounded-2xl border border-slate-200 dark:border-slate-700 items-center justify-center mr-3 mt-2">
            <Heart size={22} className="text-slate-600 dark:text-slate-400" />
          </Pressable>
          <Pressable className="flex-1 bg-[#0f172a] h-12 rounded-xl items-center justify-center mr-2 mt-2">
            <Text className="text-white font-bold">Add to Cart</Text>
          </Pressable>
          <Pressable className="flex-1 bg-[#f97316] h-12 rounded-xl items-center justify-center mt-2">
            <Text className="text-white font-bold">Buy Now</Text>
          </Pressable>
        </View>

        <ReviewForm 
          productId={product._id} 
          isVisible={isReviewFormVisible} 
          onClose={() => setIsReviewFormVisible(false)} 
        />
      </ResponsiveContainer>
    </View>
  );
}
