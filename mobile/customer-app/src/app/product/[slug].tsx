import React, { useMemo, useState, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, Text, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Heart } from 'lucide-react-native';

import { useProduct } from '../../hooks/useProduct';
import { useProductReviews } from '../../hooks/useProductReviews';
import { useAddCartItem } from '../../hooks/useCart';
import { useWishlist, useToggleWishlist } from '../../hooks/useWishlist';
import { useAuthStore } from '../../stores/authStore';
import { ResponsiveContainer } from '../../components/layout/ResponsiveContainer';
import { ProductGallery } from '../../components/product/ProductGallery';
import { ProductInfo } from '../../components/product/ProductInfo';
import { VariantSelector } from '../../components/product/VariantSelector';
import { ProductAttributes } from '../../components/product/ProductAttributes';
import { ProductDescription } from '../../components/product/ProductDescription';
import { ReviewSummary } from '../../components/product/ReviewSummary';
import { ReviewCard } from '../../components/product/ReviewCard';
import { ReviewForm } from '../../components/product/ReviewForm';

export default function ProductDetailsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const status = useAuthStore(state => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  const [isReviewFormVisible, setIsReviewFormVisible] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);

  const { data: product, isLoading: isProductLoading, isError: isProductError } = useProduct(slug);
  const { 
    data: reviewsData, 
    isLoading: isReviewsLoading, 
    hasNextPage, 
    fetchNextPage,
    isFetchingNextPage
  } = useProductReviews(product?._id);

  // Cart & Wishlist hooks
  const { mutateAsync: addCartItem, isPending: isAddingToCart } = useAddCartItem();
  const { data: wishlistItems = [] } = useWishlist();
  const { mutate: toggleWishlist, isPending: isWishlistLoading } = useToggleWishlist();

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

  const isWishlisted = useMemo(() => {
    if (!product?._id) return false;
    return wishlistItems.some(item => {
      const prodId = typeof item.product === 'object' ? (item.product as any)?._id : item.product;
      return String(prodId) === String(product._id);
    });
  }, [wishlistItems, product?._id]);

  const reviews = useMemo(() => {
    return reviewsData?.pages.flatMap(page => page.reviews) || [];
  }, [reviewsData]);

  // Wishlist Toggle Handler
  const handleToggleWishlist = () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    if (!product?._id) return;

    toggleWishlist({
      productId: product._id,
      active: !isWishlisted,
      variantId: activeVariant?.variantId,
    });
  };

  // Add To Cart Handler
  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    if (!product?._id) return;
    if (product.stock <= 0) return;

    try {
      const res = await addCartItem({
        productId: product._id,
        quantity: 1,
        variantId: activeVariant?.variantId,
      });

      // Find the item added to the cart
      let addedItem = res?.cart?.items?.find((i: any) => {
        const id = typeof i.productId === 'object' ? i.productId._id : i.productId;
        return String(id) === String(product._id);
      });

      if (!addedItem && res?.cart?.items?.length) {
        addedItem = res.cart.items[res.cart.items.length - 1];
      }

      if (addedItem) {
        router.push({
          pathname: '/cart-drawer' as any,
          params: {
            cartItemId: addedItem._id,
            productId: product._id,
            quantity: addedItem.quantity,
          },
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not add product to cart';
      Alert.alert('Cart Error', msg);
    }
  };

  // Buy Now Handler (Add to cart & immediately navigate to Checkout)
  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    if (!product?._id) return;
    if (product.stock <= 0) return;

    setIsBuyingNow(true);
    try {
      await addCartItem({
        productId: product._id,
        quantity: 1,
        variantId: activeVariant?.variantId,
      });

      router.push('/checkout');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not initiate checkout';
      Alert.alert('Checkout Error', msg);
    } finally {
      setIsBuyingNow(false);
    }
  };

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
    const displayImages = activeVariant?.images && activeVariant.images.length > 0 
      ? activeVariant.images 
      : product.images;

    return (
      <View className="pb-4">
        {/* Top bar with back arrow */}
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
        
        {/* "Sold By" component */}
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

  const isOutOfStock = product.stock <= 0;

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
        
        {/* Fixed Bottom Action Bar */}
        <View 
          className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-950 pt-4 pb-4 px-4 border-t border-slate-200 dark:border-slate-800 flex-row items-center rounded-t-3xl shadow-lg shadow-black/10"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="absolute top-2 w-full items-center">
            <View className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </View>
          
          {/* Wishlist Button */}
          <Pressable 
            onPress={handleToggleWishlist}
            disabled={isWishlistLoading}
            className={`w-12 h-12 rounded-2xl border items-center justify-center mr-3 mt-2 active:scale-95 transition-all ${
              isWishlisted
                ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
            }`}
            accessibilityLabel="Wishlist"
          >
            {isWishlistLoading ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Heart 
                size={22} 
                color={isWishlisted ? '#ef4444' : '#64748b'} 
                fill={isWishlisted ? '#ef4444' : 'transparent'} 
              />
            )}
          </Pressable>

          {/* Add to Cart Button */}
          <Pressable 
            onPress={handleAddToCart}
            disabled={isAddingToCart || isBuyingNow || isOutOfStock}
            className={`flex-1 h-12 rounded-xl items-center justify-center mr-2 mt-2 active:opacity-90 ${
              isOutOfStock
                ? 'bg-slate-300 dark:bg-slate-800 opacity-60'
                : 'bg-[#0f172a] active:bg-[#1e293b]'
            }`}
            accessibilityLabel="Add to Cart"
          >
            {isAddingToCart ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-bold">
                {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </Text>
            )}
          </Pressable>

          {/* Buy Now Button */}
          <Pressable 
            onPress={handleBuyNow}
            disabled={isAddingToCart || isBuyingNow || isOutOfStock}
            className={`flex-1 h-12 rounded-xl items-center justify-center mt-2 active:opacity-90 ${
              isOutOfStock
                ? 'bg-slate-300 dark:bg-slate-800 opacity-60'
                : 'bg-[#f97316] active:bg-[#ea580c]'
            }`}
            accessibilityLabel="Buy Now"
          >
            {isBuyingNow ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-bold">Buy Now</Text>
            )}
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
