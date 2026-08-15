import React from 'react';
import { View, Text } from 'react-native';
import { ProductAttributes as IProductAttributes } from '../../types/catalog';

interface Props {
  attributes?: IProductAttributes;
}

export const ProductAttributes = ({ attributes }: Props) => {
  if (!attributes || Object.keys(attributes).length === 0) return null;

  return (
    <View className="px-4 py-4 mt-2 bg-white dark:bg-slate-950">
      <Text className="text-lg font-bold text-slate-900 dark:text-white mb-4">
        Specifications
      </Text>
      
      <View className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
        {Object.entries(attributes).map(([key, value], index) => {
          const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
          const isLast = index === Object.keys(attributes).length - 1;
          
          return (
            <View 
              key={key} 
              className={`flex-row px-4 py-3 bg-slate-50 dark:bg-slate-900/50 ${
                !isLast ? 'border-b border-slate-100 dark:border-slate-800' : ''
              }`}
            >
              <Text className="flex-1 text-slate-500 font-medium capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </Text>
              <Text className="flex-1 text-slate-900 dark:text-white text-right font-medium">
                {displayValue}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};
