import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Category } from '../../types/catalog';
import { useCatalogStore } from '../../stores/catalogStore';
import { useRouter } from 'expo-router';
import { Store } from 'lucide-react-native';

interface HomeCategoriesProps {
  categories: Category[];
  isLoading?: boolean;
}

export const HomeCategories = ({ categories, isLoading }: HomeCategoriesProps) => {
  const setCategory = useCatalogStore((state) => state.setCategory);
  const router = useRouter();

  if (isLoading) {
    return (
      <View className="py-4 px-4 flex-row">
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} className="items-center mr-6">
            <View className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 mb-3" />
            <View className="w-14 h-3 bg-slate-200 dark:bg-slate-800 rounded-full" />
          </View>
        ))}
      </View>
    );
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  const handleCategoryPress = (categoryId: string) => {
    setCategory(categoryId);
    router.push('/(tabs)/shop');
  };

  return (
    <View className="py-4">
      <View className="px-4 mb-3 flex-row justify-between items-end">
        <Text className="text-lg font-bold text-slate-900 dark:text-white">Categories</Text>
        <Pressable onPress={() => { setCategory(undefined); router.push('/(tabs)/shop'); }}>
          <Text className="text-amber-600 dark:text-amber-500 font-semibold text-sm">See All</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {categories.map((category) => (
          <Pressable
            key={category._id}
            onPress={() => handleCategoryPress(category._id)}
            className="items-center mr-6 w-16"
          >
            <View className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden items-center justify-center mb-3">
              {category.image || category.icon ? (
                <Image 
                  source={category.image || category.icon} 
                  className="w-full h-full" 
                  contentFit="cover" 
                />
              ) : (
                <Store size={24} className="text-slate-400" />
              )}
            </View>
            <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200 text-center leading-tight" numberOfLines={2}>
              {category.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};
