import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  description?: string;
}

export const ProductDescription = ({ description }: Props) => {
  if (!description) return null;

  return (
    <View className="px-4 py-4 mt-2 bg-white dark:bg-slate-950">
      <Text className="text-lg font-bold text-slate-900 dark:text-white mb-2">
        About this product
      </Text>
      <Text className="text-slate-600 dark:text-slate-400 text-sm leading-6">
        {description}
      </Text>
    </View>
  );
};
