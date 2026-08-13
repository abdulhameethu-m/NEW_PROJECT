import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView, TextInput } from 'react-native';
import { useCatalogStore } from '../../stores/catalogStore';
import { useCategories } from '../../hooks/useCategories';
import { X, Check } from 'lucide-react-native';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FilterModal = ({ visible, onClose }: FilterModalProps) => {
  const { categoryId, minPrice, maxPrice, setFilters } = useCatalogStore();
  const { data: categories = [] } = useCategories();

  // Local state for applying filters only when 'Apply' is pressed
  const [localCategoryId, setLocalCategoryId] = useState<string | undefined>(categoryId);
  const [localMinPrice, setLocalMinPrice] = useState<string>(minPrice ? minPrice.toString() : '');
  const [localMaxPrice, setLocalMaxPrice] = useState<string>(maxPrice ? maxPrice.toString() : '');

  // Reset local state when modal opens
  useEffect(() => {
    if (visible) {
      setLocalCategoryId(categoryId);
      setLocalMinPrice(minPrice ? minPrice.toString() : '');
      setLocalMaxPrice(maxPrice ? maxPrice.toString() : '');
    }
  }, [visible, categoryId, minPrice, maxPrice]);

  const handleApply = () => {
    setFilters({
      categoryId: localCategoryId,
      category: undefined,
      minPrice: localMinPrice ? parseFloat(localMinPrice) : undefined,
      maxPrice: localMaxPrice ? parseFloat(localMaxPrice) : undefined,
    });
    onClose();
  };

  const handleClear = () => {
    setLocalCategoryId(undefined);
    setLocalMinPrice('');
    setLocalMaxPrice('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white dark:bg-slate-900 rounded-t-3xl h-[80%]">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
            <Text className="text-lg font-bold text-slate-900 dark:text-white">Filters</Text>
            <Pressable onPress={onClose} className="p-2">
              <X size={24} className="text-slate-500" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 p-4">
            {/* Price Range */}
            <View className="mb-6">
              <Text className="text-base font-bold text-slate-900 dark:text-white mb-3">Price Range</Text>
              <View className="flex-row items-center space-x-4">
                <View className="flex-1">
                  <Text className="text-xs text-slate-500 mb-1">Min (₹)</Text>
                  <TextInput
                    className="bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={localMinPrice}
                    onChangeText={setLocalMinPrice}
                  />
                </View>
                <Text className="text-slate-400 mt-5">-</Text>
                <View className="flex-1">
                  <Text className="text-xs text-slate-500 mb-1">Max (₹)</Text>
                  <TextInput
                    className="bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
                    placeholder="Any"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={localMaxPrice}
                    onChangeText={setLocalMaxPrice}
                  />
                </View>
              </View>
            </View>

            {/* Categories */}
            <View className="mb-6">
              <Text className="text-base font-bold text-slate-900 dark:text-white mb-3">Categories</Text>
              <View className="flex-row flex-wrap gap-2">
                <Pressable
                  onPress={() => setLocalCategoryId(undefined)}
                  className={`px-4 py-2 rounded-full border ${
                    !localCategoryId 
                      ? 'bg-amber-500 border-amber-500' 
                      : 'bg-transparent border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Text className={!localCategoryId ? 'text-white font-bold' : 'text-slate-700 dark:text-slate-300'}>
                    All Categories
                  </Text>
                </Pressable>
                
                {categories.map((cat) => (
                  <Pressable
                    key={cat._id}
                    onPress={() => setLocalCategoryId(cat._id)}
                    className={`px-4 py-2 rounded-full border ${
                      localCategoryId === cat._id 
                        ? 'bg-amber-500 border-amber-500' 
                        : 'bg-transparent border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Text className={localCategoryId === cat._id ? 'text-white font-bold' : 'text-slate-700 dark:text-slate-300'}>
                      {cat.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="flex-row items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Pressable onPress={handleClear} className="py-3 px-6">
              <Text className="text-slate-500 dark:text-slate-400 font-semibold">Clear All</Text>
            </Pressable>
            <Pressable onPress={handleApply} className="bg-amber-500 py-3 px-8 rounded-full">
              <Text className="text-white font-bold">Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
