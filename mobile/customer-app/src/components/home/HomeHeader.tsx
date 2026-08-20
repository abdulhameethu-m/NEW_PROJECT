import React from 'react';
import { View, Pressable, Image, Text } from 'react-native';
import { Heart, ShoppingBag } from 'lucide-react-native';
import { ResponsiveContainer } from '../layout/ResponsiveContainer';
import { useRouter } from 'expo-router';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';

export function HomeHeader() {
  const router = useRouter();
  const { data: cart } = useCart();
  const { data: wishlist = [] } = useWishlist();
  
  const cartCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const wishlistCount = wishlist.length;

  return (
    <ResponsiveContainer className="flex-row items-center justify-between py-3 bg-white dark:bg-slate-950">
      <View className="flex-row items-center">
        <Image 
          source={require('../../../assets/images/logo.png')} 
          className="rounded-full bg-slate-100" 
          style={{ width: 32, height: 32 }}
          resizeMode="cover"
        />
        <Text className="ml-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          UCHOOSEME
        </Text>
      </View>

      <View className="flex-row items-center gap-4">
        <Pressable 
          className="relative p-2"
          onPress={() => router.push('/wishlist')}
        >
          <Heart size={24} className="text-slate-700 dark:text-slate-300" strokeWidth={1.5} />
          {wishlistCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-rose-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border border-white dark:border-slate-950">
              <Text className="text-[10px] font-bold text-white">
                {wishlistCount > 99 ? '99+' : wishlistCount}
              </Text>
            </View>
          )}
        </Pressable>
        <Pressable 
          className="relative p-2"
          onPress={() => router.push('/(tabs)/cart')}
        >
          <ShoppingBag size={24} className="text-slate-700 dark:text-slate-300" strokeWidth={1.5} />
          {cartCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-amber-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border border-white dark:border-slate-950">
              <Text className="text-[10px] font-bold text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </ResponsiveContainer>
  );
}
