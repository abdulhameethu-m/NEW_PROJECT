import React from 'react';
import { View, StyleSheet } from 'react-native';

export const ProductSkeleton = () => {
  return (
    <View className="flex-1 m-1 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
      <View className="aspect-square w-full bg-slate-200 dark:bg-slate-800" />
      <View className="p-3">
        <View className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2" />
        <View className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-4" />
        <View className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
      </View>
    </View>
  );
};
