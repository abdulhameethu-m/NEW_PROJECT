import React from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { Trash2 } from 'lucide-react-native';
import { useCart, useUpdateCartQuantity, useRemoveCartItem, useClearCart } from '../../hooks/useCart';
import { CartItem as CartItemType } from '../../types/cart';
import { CartItem } from '../../components/cart/CartItem';
import { CartSkeleton } from '../../components/cart/CartSkeleton';
import { CartEmptyState } from '../../components/cart/CartEmptyState';
import { CartSummary } from '../../components/cart/CartSummary';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

export default function CartScreen() {
  const router = useRouter();
  const { status } = useAuthStore();
  const { data: cart, isLoading, error } = useCart();
  const { mutate: updateQuantity } = useUpdateCartQuantity();
  const { mutate: removeCartItem } = useRemoveCartItem();
  const { mutate: clearCart, isPending: isClearing } = useClearCart();

  if (status !== 'AUTHENTICATED') {
    return (
      <SafeAreaScreen className="flex-1 bg-white dark:bg-slate-900">
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-xl font-bold text-slate-900 dark:text-white mb-2">Login Required</Text>
          <Text className="text-slate-500 text-center mb-8">Please login to view and manage your cart.</Text>
          <Pressable 
            onPress={() => router.push('/(tabs)/profile')}
            className="bg-primary w-full h-12 rounded-xl items-center justify-center"
          >
            <Text className="text-white font-semibold">Go to Login</Text>
          </Pressable>
        </View>
      </SafeAreaScreen>
    );
  }

  if (isLoading) {
    return <CartSkeleton />;
  }

  if (error) {
    return (
      <SafeAreaScreen className="flex-1 bg-white dark:bg-slate-900">
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-red-500 font-medium mb-4">{error.message || 'Failed to load cart'}</Text>
        </View>
      </SafeAreaScreen>
    );
  }

  const handleIncrease = (item: CartItemType) => {
    updateQuantity({ productId: item.productId._id, quantity: item.quantity + 1, variantId: item.variantId });
  };

  const handleDecrease = (item: CartItemType) => {
    if (item.quantity === 1) {
      removeCartItem({ productId: item.productId._id, variantId: item.variantId });
    } else {
      updateQuantity({ productId: item.productId._id, quantity: item.quantity - 1, variantId: item.variantId });
    }
  };

  if (!cart?.items?.length) {
    return (
      <SafeAreaScreen className="flex-1 bg-white dark:bg-slate-900">
        <View className="h-14 justify-center px-4 border-b border-slate-100 dark:border-slate-800">
          <Text className="text-xl font-bold text-slate-900 dark:text-white">Shopping Cart</Text>
        </View>
        <CartEmptyState />
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen className="flex-1 bg-slate-50 dark:bg-black">
      <View className="h-14 flex-row items-center justify-between px-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <Text className="text-xl font-bold text-slate-900 dark:text-white">
          Shopping Cart ({cart.items.reduce((acc, item) => acc + item.quantity, 0)})
        </Text>
        <Pressable 
          className="w-10 h-10 items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800"
          onPress={() => clearCart()}
          disabled={isClearing}
        >
          {isClearing ? <ActivityIndicator size="small" /> : <Trash2 size={20} className="text-red-500" />}
        </Pressable>
      </View>

      <FlatList
        data={cart.items}
        keyExtractor={(item) => `${item.productId._id}::${item.variantId}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <CartItem
            item={item}
            onIncrease={() => handleIncrease(item)}
            onDecrease={() => handleDecrease(item)}
          />
        )}
        ListFooterComponent={
           <View className="mt-4">
             <CartSummary 
               subtotal={cart.totalAmount}
               totalAmount={cart.totalAmount}
               currency={cart.currency}
             />
             <View className="px-4 pb-8 bg-white dark:bg-slate-900">
               <Pressable className="w-full h-14 bg-primary rounded-xl items-center justify-center active:bg-primary/90">
                 <Text className="text-white font-bold text-lg">Checkout</Text>
               </Pressable>
             </View>
           </View>
        }
      />
    </SafeAreaScreen>
  );
}
