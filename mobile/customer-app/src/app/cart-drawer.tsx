import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Check, ShoppingBag, ClipboardList, ShieldCheck, Heart, Minus, Plus, Trash2 } from 'lucide-react-native';
import Animated, { FadeIn, FadeInUp, FadeOutDown, SlideInDown, SlideOutDown, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useCart, useUpdateCartQuantity, useRemoveCartItem } from '../hooks/useCart';
import { useRelatedProducts } from '../hooks/useRelatedProducts';
import { ProductCard } from '../components/catalog/ProductCard';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CartDrawerScreen() {
  const router = useRouter();
  const { cartItemId, productId, quantity: stringQuantity } = useLocalSearchParams();
  const [isSuccessAnimated, setSuccessAnimated] = useState(true);

  // Use core Phase 6 hooks
  const { data: cart, isLoading } = useCart();
  const { mutate: updateQuantity, isPending: isUpdating } = useUpdateCartQuantity();
  const { mutate: removeCartItem, isPending: isRemoving } = useRemoveCartItem();
  
  // Recommendations
  const { data: recommendations = [], isLoading: isLoadingRecs } = useRelatedProducts(
    (productId as string) || ''
  );

  useEffect(() => {
    // Hide the success bubble cleanly after 2000 ms to give focus to the drawer content
    const timer = setTimeout(() => {
      setSuccessAnimated(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Determine active item locally synced to global TanStack state
  const activeItem = cart?.items?.find(item => item._id === cartItemId);

  // Image parsing strictly mapped identically to ProductCard mapping
  const resolveItemImage = () => {
    if (!activeItem) return '';
    const prod = typeof activeItem.productId === 'object' ? activeItem.productId : null;
    const rawImage = activeItem.image 
      || (prod?.images?.[0] as any)?.url 
      || (typeof prod?.images?.[0] === 'string' ? prod.images[0] : '');
    return rawImage || '';
  };

  const handleDecrease = () => {
    if (!activeItem) return;
    if (activeItem.quantity <= 1) return;
    updateQuantity({ 
      productId: (typeof activeItem.productId === 'object' ? activeItem.productId._id : activeItem.productId) as string, 
      variantId: activeItem.variantId, 
      quantity: activeItem.quantity - 1 
    });
  };

  const handleIncrease = () => {
    if (!activeItem) return;
    updateQuantity({ 
      productId: (typeof activeItem.productId === 'object' ? activeItem.productId._id : activeItem.productId) as string, 
      variantId: activeItem.variantId, 
      quantity: activeItem.quantity + 1 
    });
  };

  const handleRemove = () => {
    if (!activeItem) return;
    removeCartItem({ 
      productId: (typeof activeItem.productId === 'object' ? activeItem.productId._id : activeItem.productId) as string, 
      variantId: activeItem.variantId 
    });
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Background Overlay */}
      <Animated.View 
        entering={FadeIn.duration(200)}
        style={StyleSheet.absoluteFill}
      >
        <Pressable 
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} 
          onPress={() => router.back()} 
        />
      </Animated.View>

      {/* Drawer Container */}
      <Animated.View 
        entering={SlideInDown.springify().damping(20).stiffness(90)}
        className="absolute bottom-0 w-full h-[85%] bg-slate-50 dark:bg-slate-950 rounded-t-3xl overflow-hidden"
      >
        {/* Header Block */}
        <View className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-5 pt-6 pb-4 flex-row justify-between items-start shrink-0">
          <View>
            <Text className="text-[22px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              Added to Cart
            </Text>
            {activeItem?.variantTitle && (
              <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                Selected variant: <Text className="text-pink-500 font-semibold">{activeItem.variantTitle}</Text>
              </Text>
            )}
          </View>
          <Pressable 
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center active:scale-95"
          >
            <X size={20} className="text-slate-900 dark:text-white" strokeWidth={2.5} />
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-5 pt-2" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
          
          {/* Animated Success Checkmark bubble */}
          {isSuccessAnimated && (
            <Animated.View 
              entering={ZoomIn.duration(400).springify()}
              className="flex-row items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl mb-6 border border-emerald-100 dark:border-emerald-900/50"
            >
              <View className="w-8 h-8 rounded-full bg-emerald-600 items-center justify-center">
                <Check size={18} color="white" strokeWidth={3} />
              </View>
              <Text className="text-[15px] font-bold text-emerald-700 dark:text-emerald-400">
                Successfully added to cart!
              </Text>
            </Animated.View>
          )}

          {/* Empty Cart Block */}
          {(!cart?.items || cart.items.length === 0) && !isLoading && (
            <View className="items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-[16px] mb-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <Text className="text-slate-500 font-medium">Your cart is empty.</Text>
            </View>
          )}

          {/* Active Cart Items Block */}
          {cart?.items && cart.items.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center gap-3 mb-4">
                <View className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center">
                  <ShoppingBag size={20} className="text-purple-600 dark:text-purple-400" />
                </View>
                <Text className="text-[17px] font-extrabold text-indigo-950 dark:text-slate-100">
                  Cart Items ({cart.items.reduce((acc, item) => acc + item.quantity, 0)})
                </Text>
              </View>

              <View className="space-y-4">
                {cart.items.map((item, index) => {
                  const prod = typeof item.productId === 'object' ? item.productId : null;
                  const rawImage = item.image 
                    || (prod?.images?.[0] as any)?.url 
                    || (typeof prod?.images?.[0] === 'string' ? prod.images[0] : '');

                  // Ensure deterministic distinct keys to prevent React Fiber corruption
                  const rowKey = item._id ? `cart-item-${item._id}` : `cart-item-idx-${index}-${prod?._id || 'unknown'}`;

                  return (
                    <View key={rowKey} style={{ marginBottom: 16 }} className="flex-row items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-[16px] border border-slate-100 dark:border-slate-800 shadow-sm">
                      <View className="w-[84px] h-[84px] rounded-[12px] bg-slate-50 dark:bg-slate-800 overflow-hidden">
                        {rawImage ? (
                          <Image source={rawImage} style={StyleSheet.absoluteFill} contentFit="cover" />
                        ) : (
                          <View className="flex-1 items-center justify-center"><ShoppingBag size={24} className="text-slate-300" /></View>
                        )}
                      </View>
                      
                      <View className="flex-1 py-0.5 justify-between h-[84px]">
                        <View className="flex-row justify-between items-start">
                          <Text className="flex-1 font-bold text-slate-900 dark:text-white text-[14px]" numberOfLines={2}>
                            {prod ? prod.name : 'Product'}
                          </Text>
                        </View>
                        
                        <View className="flex-row justify-between items-center bg-transparent mt-auto pt-2">
                          <Text className="text-[15px] font-black text-slate-900 dark:text-white truncate" numberOfLines={1}>
                            {cart.currency || '₹'} {(item.price * item.quantity).toLocaleString()}
                          </Text>
                          
                          {/* Quantity Sequencer */}
                          <View className="flex-row items-center gap-1.5 shrink-0">
                            <View className="flex-row items-center bg-pink-50 dark:bg-pink-950/30 px-1 py-1 rounded-lg border border-pink-100 dark:border-pink-900/50">
                              <Pressable 
                                onPress={() => updateQuantity({ 
                                  productId: (prod ? prod._id : item.productId) as string, 
                                  variantId: item.variantId, 
                                  quantity: item.quantity - 1 
                                })}
                                disabled={item.quantity <= 1 || isUpdating}
                                className="w-7 h-7 items-center justify-center rounded-md active:bg-pink-100 dark:active:bg-pink-900"
                              >
                                <Minus size={14} className="text-rose-600 dark:text-rose-400" strokeWidth={3} />
                              </Pressable>
                              <View className="min-w-[20px] items-center justify-center">
                                <Text className="text-[13px] font-bold text-rose-900 dark:text-rose-300">{item.quantity}</Text>
                              </View>
                              <Pressable 
                                onPress={() => updateQuantity({ 
                                  productId: (prod ? prod._id : item.productId) as string, 
                                  variantId: item.variantId, 
                                  quantity: item.quantity + 1 
                                })}
                                disabled={isUpdating}
                                className="w-7 h-7 items-center justify-center rounded-md active:bg-pink-100 dark:active:bg-pink-900"
                              >
                                <Plus size={14} className="text-rose-600 dark:text-rose-400" strokeWidth={3} />
                              </Pressable>
                            </View>
                            <Pressable 
                              onPress={() => removeCartItem({ 
                                productId: (prod ? prod._id : item.productId) as string, 
                                variantId: item.variantId 
                              })}
                              disabled={isRemoving}
                              className="p-2 border border-rose-100 dark:border-rose-900/50 bg-white dark:bg-transparent rounded-lg active:bg-rose-50 dark:active:bg-rose-950"
                            >
                              <Trash2 size={14} className="text-rose-600 dark:text-rose-400" />
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Cart Summary */}
          {cart && (
            <Animated.View entering={FadeInUp.delay(100)} className="bg-blue-50/50 dark:bg-blue-950/20 p-5 rounded-[16px] mb-8 border border-blue-100 dark:border-blue-900/30 overflow-hidden relative">
              <View className="absolute right-0 top-0 opacity-10 translate-x-4 -translate-y-4">
                 <ShoppingBag size={120} color="#3b82f6" />
              </View>
              <View className="flex-row items-center gap-2 mb-4">
                <ClipboardList size={20} className="text-blue-600 dark:text-blue-400" />
                <Text className="text-[17px] font-extrabold text-slate-900 dark:text-slate-200">Cart Summary</Text>
              </View>
              
              <View className="flex-row justify-between mb-4 border-b border-dashed border-blue-200 dark:border-blue-800 pb-4">
                <Text className="font-medium text-slate-600 dark:text-slate-400">Total Items in Cart</Text>
                <Text className="font-bold text-slate-900 dark:text-white">
                  {cart.items.reduce((acc, item) => acc + item.quantity, 0)}
                </Text>
              </View>

              <View className="flex-row justify-between items-center">
                <Text className="text-[17px] font-extrabold text-slate-900 dark:text-white">Total Amount</Text>
                <Text className="text-[22px] font-black text-emerald-600 dark:text-emerald-400">
                  {cart.currency} {cart.totalAmount.toLocaleString()}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Recommendations Block */}
          {recommendations.length > 0 && !isLoadingRecs && (
            <Animated.View entering={FadeInUp.delay(200)}>
              <View className="flex-row items-center gap-2 bg-pink-50 dark:bg-pink-950 p-4 rounded-[16px] mb-4">
                <Heart size={16} className="text-rose-600 dark:text-rose-400" fill="currentColor" />
                <Text className="text-[15px] font-bold text-rose-800 dark:text-rose-300">You may also like</Text>
              </View>
              <View className="flex-row flex-wrap -m-1">
                {recommendations.map((recItem) => (
                  <View key={recItem._id} className="w-1/2 p-1 aspect-[0.7]">
                    <ProductCard product={recItem} />
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

        </ScrollView>

        {/* Sticky Action Footer */}
        <View className="absolute bottom-0 w-full bg-white dark:bg-slate-900 px-5 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] border-t border-slate-100 dark:border-slate-800 shadow-xl">
          <View className="flex-row gap-3 mb-3">
             <Pressable 
               onPress={() => { router.back(); router.push('/(tabs)/cart'); }}
               className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-[12px] py-4 items-center flex-row justify-center gap-2"
             >
               <ShoppingBag size={16} color="white" />
               <Text className="text-white font-bold text-[14px]">View Cart</Text>
             </Pressable>
             <Pressable 
               onPress={() => router.back()}
               className="flex-1 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 rounded-[12px] py-4 items-center flex-row justify-center gap-2"
             >
               <ShoppingBag size={16} className="text-indigo-800 dark:text-indigo-200" />
               <Text className="text-indigo-800 dark:text-indigo-200 font-bold text-[14px]">Continue Shop</Text>
             </Pressable>
          </View>
          
          <Pressable 
            onPress={() => {
              // Placeholder for Phase 8 integration
              console.log("Routing to non-existent checkout boundary");
              router.back();
            }}
            className="w-full bg-emerald-500 items-center justify-center flex-row gap-2 rounded-[14px] py-4"
          >
            <ShieldCheck size={18} color="white" />
            <Text className="text-white font-extrabold text-[16px]">Checkout Available Soon</Text>
          </Pressable>
        </View>

      </Animated.View>
    </View>
  );
}
