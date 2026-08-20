import React from 'react';
import { View, ScrollView } from 'react-native';

export const CartSkeleton = () => {
  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-black" showsVerticalScrollIndicator={false}>
      {/* Header padding space */}
      <View className="h-4" />
      
      {[1, 2, 3].map((key) => (
        <View key={key} className="bg-white dark:bg-slate-900 mx-4 mb-4 rounded-2xl p-4 flex-row border border-slate-100 dark:border-slate-800">
           {/* Image Skeleton */}
           <View className="w-24 h-24 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
           
           {/* Content Skeleton */}
           <View className="flex-1 ml-4 justify-between py-1">
             <View>
               <View className="w-3/4 h-5 bg-slate-200 dark:bg-slate-800 rounded mb-2 animate-pulse" />
               <View className="w-1/2 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
             </View>
             
             <View className="flex-row items-end justify-between mt-4">
               <View className="w-20 h-6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
               <View className="w-24 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
             </View>
           </View>
        </View>
      ))}
      
      <View className="mt-8 mx-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
        <View className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded mb-4 animate-pulse" />
        <View className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded mb-6 animate-pulse" />
        <View className="w-full h-14 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
      </View>
    </ScrollView>
  );
};
