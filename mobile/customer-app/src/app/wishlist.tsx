import React from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { SafeAreaScreen } from '../components/layout/SafeAreaScreen';
import { useWishlist } from '../hooks/useWishlist';
import { ProductCard } from '../components/catalog/ProductCard';
import { ChevronLeft, Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

export default function WishlistScreen() {
  const router = useRouter();
  const { status } = useAuthStore();
  const { data: wishlistItems = [], isLoading, error } = useWishlist();

  if (status !== 'AUTHENTICATED') {
    return (
      <SafeAreaScreen className="flex-1 bg-white dark:bg-slate-900">
        <View className="h-14 flex-row items-center px-4 border-b border-slate-100 dark:border-slate-800">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-slate-100 dark:active:bg-slate-800">
            <ChevronLeft size={24} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-xl font-bold text-slate-900 dark:text-white ml-2">Wishlist</Text>
        </View>
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-xl font-bold text-slate-900 dark:text-white mb-2">Login Required</Text>
          <Text className="text-slate-500 text-center mb-8">Please login to view your saved items.</Text>
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

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center p-8">
      <View className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-6">
        <Heart size={48} className="text-slate-300 dark:text-slate-600" />
      </View>
      <Text className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">
        Your wishlist is empty
      </Text>
      <Text className="text-slate-500 dark:text-slate-400 text-center mb-8 px-4 leading-5">
        Save items you like and they will appear here.
      </Text>
      <Pressable 
        onPress={() => router.push('/(tabs)/shop')}
        className="bg-primary w-full max-w-[240px] h-14 rounded-xl items-center justify-center active:opacity-90"
      >
        <Text className="text-white font-semibold text-base">Explore Products</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaScreen className="flex-1 bg-slate-50 dark:bg-black">
      <View className="h-14 flex-row items-center justify-between px-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-slate-100 dark:active:bg-slate-800">
            <ChevronLeft size={24} className="text-slate-900 dark:text-white" />
          </Pressable>
          <Text className="text-xl font-bold text-slate-900 dark:text-white ml-2">Wishlist</Text>
        </View>
        <Text className="text-slate-500 font-medium">
          {wishlistItems.length} items
        </Text>
      </View>

      <FlatList
        data={wishlistItems}
        numColumns={2}
        keyExtractor={(item) => item.product._id}
        contentContainerStyle={{ padding: 8, paddingBottom: 24, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!isLoading ? renderEmptyState : <View />} // Handled proper skeleton in Phase 7 if needed
        renderItem={({ item }) => (
          <ProductCard product={item.product as any} />
        )}
      />
    </SafeAreaScreen>
  );
}
