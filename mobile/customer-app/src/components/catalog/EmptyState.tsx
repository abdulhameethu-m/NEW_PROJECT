import React from 'react';
import { View, Text } from 'react-native';
import { PackageX } from 'lucide-react-native';

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export const EmptyState = ({ 
  title = "No products found", 
  description = "Try adjusting your search or filters to find what you're looking for." 
}: EmptyStateProps) => {
  return (
    <View className="flex-1 items-center justify-center p-8 mt-12">
      <View className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
        <PackageX size={48} className="text-slate-400" />
      </View>
      <Text className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">
        {title}
      </Text>
      <Text className="text-sm text-slate-500 dark:text-slate-400 text-center">
        {description}
      </Text>
    </View>
  );
};
