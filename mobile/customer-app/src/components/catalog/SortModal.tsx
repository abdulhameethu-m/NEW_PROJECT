import React from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { useCatalogStore } from '../../stores/catalogStore';
import { X, Check } from 'lucide-react-native';

interface SortModalProps {
  visible: boolean;
  onClose: () => void;
}

const SORT_OPTIONS = [
  { label: 'Newest Arrivals', sortBy: 'createdAt', sortOrder: 'desc' },
  { label: 'Price: Low to High', sortBy: 'price', sortOrder: 'asc' },
  { label: 'Price: High to Low', sortBy: 'price', sortOrder: 'desc' },
  { label: 'Name: A to Z', sortBy: 'name', sortOrder: 'asc' },
  { label: 'Name: Z to A', sortBy: 'name', sortOrder: 'desc' },
];

export const SortModal = ({ visible, onClose }: SortModalProps) => {
  const { sortBy, sortOrder, setSort } = useCatalogStore();

  const handleSelect = (selectedSortBy: string, selectedSortOrder: 'asc' | 'desc') => {
    setSort(selectedSortBy, selectedSortOrder);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white dark:bg-slate-900 rounded-t-3xl min-h-[40%]">
          <View className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
            <Text className="text-lg font-bold text-slate-900 dark:text-white">Sort By</Text>
            <Pressable onPress={onClose} className="p-2">
              <X size={24} className="text-slate-500" />
            </Pressable>
          </View>

          <ScrollView className="p-4">
            {SORT_OPTIONS.map((option) => {
              const isActive = option.sortBy === sortBy && option.sortOrder === sortOrder;
              return (
                <Pressable
                  key={`${option.sortBy}-${option.sortOrder}`}
                  onPress={() => handleSelect(option.sortBy, option.sortOrder as 'asc' | 'desc')}
                  className={`flex-row items-center justify-between p-4 mb-2 rounded-xl border ${
                    isActive 
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' 
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Text className={`text-base ${isActive ? 'font-bold text-amber-600 dark:text-amber-500' : 'text-slate-700 dark:text-slate-300'}`}>
                    {option.label}
                  </Text>
                  {isActive && <Check size={20} className="text-amber-500" />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
