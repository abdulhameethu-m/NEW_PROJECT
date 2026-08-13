import React from 'react';
import { View, Pressable, Image, Text } from 'react-native';
import { Heart, ShoppingBag } from 'lucide-react-native';

export function HomeHeader() {
  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-slate-950">
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
          onPress={() => console.log("Navigate to Wishlist")}
        >
          <Heart size={24} className="text-slate-700 dark:text-slate-300" strokeWidth={1.5} />
        </Pressable>
        <Pressable 
          className="relative p-2"
          onPress={() => console.log("Navigate to Cart")}
        >
          <ShoppingBag size={24} className="text-slate-700 dark:text-slate-300" strokeWidth={1.5} />
          {/* Static badge indicator for premium feel */}
          <View className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-white dark:border-slate-950" />
        </Pressable>
      </View>
    </View>
  );
}
