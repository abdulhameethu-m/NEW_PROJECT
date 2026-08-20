import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Star, Heart, ShoppingBag, Plus } from 'lucide-react-native';
import { Product } from '../../types/catalog';
import { useRouter } from 'expo-router';
import { useWishlist, useToggleWishlist } from '../../hooks/useWishlist';
import { useAddCartItem } from '../../hooks/useCart';
import { ActivityIndicator } from 'react-native';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = memo(({ product }: ProductCardProps) => {
  const router = useRouter();
  
  const { data: wishlistItems = [] } = useWishlist();
  const { mutate: toggleWishlist, isPending: isWishlistLoading } = useToggleWishlist();
  const { mutate: addCartItem, isPending: isAddingToCart } = useAddCartItem();
  
  const isWishlisted = wishlistItems.some(item => item.product._id === product._id);

  const handlePress = () => {
    router.push(`/product/${product.slug}` as any);
  };
  
  const handleQuickAdd = () => {
    // Capture the primary variation ID safely if the API bundles a single default dimension
    const defaultVariant = product.variants?.[0];
    const variantId = defaultVariant?.variantId || (defaultVariant as any)?._id;

    addCartItem(
      { productId: product._id, quantity: 1, ...(variantId ? { variantId } : {}) },
      {
        onSuccess: (data) => {
          // Identify the exact matching payload to launch the drawer deterministically
          let addedItem = data.cart.items.find((i: any) => {
              const id = typeof i.productId === 'object' ? i.productId._id : i.productId;
              return String(id) === String(product._id);
          });
          
          if (!addedItem && data.cart.items.length > 0) {
             // Fallback: If exact match fails, use the last item in the array or explicitly 
             // we can still just route with the raw product ID so the drawer can show fallback state!
             addedItem = data.cart.items[data.cart.items.length - 1];
          }

          if (addedItem) {
            router.push({
              pathname: '/cart-drawer' as any,
              params: { 
                cartItemId: addedItem._id, 
                productId: product._id,
                quantity: addedItem.quantity
              }
            });
          }
        }
      }
    );
  };
  
  const handleWishlistPress = () => {
    toggleWishlist({ productId: product._id, active: !isWishlisted });
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
    <View 
      className="flex-1 m-1 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
    >
      {/* Visual Image Banner - acts as hit target for Product Detail Route */}
      <Pressable onPress={handlePress} className="aspect-square w-full bg-slate-50 dark:bg-slate-800 relative">
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
          <View className="absolute top-2 right-2 bg-slate-900/80 px-2 py-1 rounded-md pointer-events-none">
            <Text className="text-white text-[10px] font-bold">Out of Stock</Text>
          </View>
        )}
      </Pressable>

      {/* Floating Actions Overlay - Independent of Product Details router hit targets */}
      <View className="absolute top-0 left-0 w-full aspect-square" pointerEvents="box-none">
        {/* Add to Cart Floating Button */}
        <Pressable 
          onPress={handleQuickAdd}
          disabled={isAddingToCart || product.stock <= 0}
          className="absolute bottom-[3.25rem] right-2 w-[34px] h-[34px] rounded-full bg-white/95 dark:bg-black/60 items-center justify-center shadow-sm"
          accessibilityLabel="Add to Cart"
        >
          {isAddingToCart ? (
            <ActivityIndicator size={14} color="#0f172a" className="dark:text-white" />
          ) : (
            <ShoppingBag 
              size={17} 
              color={product.stock <= 0 ? '#94a3b8' : '#1e293b'} 
              className={product.stock <= 0 ? '' : 'dark:text-slate-100'}
              strokeWidth={2}
            />
          )}
        </Pressable>

        <Pressable 
          onPress={handleWishlistPress}
          className="absolute bottom-2 right-2 w-[34px] h-[34px] rounded-full bg-white/95 dark:bg-black/60 items-center justify-center shadow-sm"
          disabled={isWishlistLoading}
          accessibilityLabel="Toggle Wishlist"
        >
          <Heart 
            size={17} 
            color={isWishlisted ? '#ef4444' : '#64748b'} 
            fill={isWishlisted ? '#ef4444' : 'transparent'}
            strokeWidth={isWishlisted ? 0 : 2}
          />
        </Pressable>
      </View>

      {/* Text Context - also routes to details */}
      <Pressable onPress={handlePress} className="p-3">
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

        <View className="flex-row items-center mt-2 flex-wrap justify-between">
          <View className="flex-row items-center flex-wrap flex-1">
            <Text className="text-sm font-bold text-slate-900 dark:text-white mr-1.5" numberOfLines={1}>
              {product.currency || 'INR'} {displayPrice ? displayPrice.toLocaleString() : '0'}
            </Text>
            {hasDiscount && (
              <Text className="text-[11px] text-slate-400 line-through" numberOfLines={1}>
                {price ? price.toLocaleString() : ''}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    </View>
  );
});
