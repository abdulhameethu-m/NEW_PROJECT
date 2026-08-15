import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { useCatalogStore } from '../../stores/catalogStore';
import { useCategories } from '../../hooks/useCategories';

export const FilterChips = () => {
  const queryState = useCatalogStore();
  const { data: categories = [] } = useCategories();
  const { setFilters, category, categoryId, minPrice, maxPrice, sortBy, sortOrder, search, ...dynamicFilters } = queryState;

  // We do not want to remove search or sort as 'filter chips', so we focus on category, price, and dynamic filters
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (categoryId) {
    const cat = categories.find(c => c._id === categoryId);
    chips.push({
      key: 'categoryId',
      label: cat ? cat.name : 'Category Applied',
      onRemove: () => setFilters({ categoryId: undefined }),
    });
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    let label = 'Price: ';
    if (minPrice !== undefined && maxPrice !== undefined) label += `₹${minPrice} - ₹${maxPrice}`;
    else if (minPrice !== undefined) label += `> ₹${minPrice}`;
    else if (maxPrice !== undefined) label += `< ₹${maxPrice}`;
    
    chips.push({
      key: 'price',
      label,
      onRemove: () => setFilters({ minPrice: undefined, maxPrice: undefined }),
    });
  }

  Object.entries(dynamicFilters).forEach(([key, value]) => {
    if (typeof value === 'function') return;
    
    if (value !== undefined && value !== null) {
      // It might be an array or string
      const values = Array.isArray(value) ? value : [value];
      values.forEach(v => {
        chips.push({
          key: `${key}-${v}`,
          label: `${v}`, // Backend gives value directly. Ideally we prepend category facet label but this is close enough
          onRemove: () => {
            // Check if it's an array to pop the specific value or just erase the key
            const current = queryState[key];
            if (Array.isArray(current)) {
              const updated = current.filter(item => item !== v);
              setFilters({ [key]: updated.length > 0 ? updated : undefined });
            } else {
              setFilters({ [key]: undefined });
            }
          }
        });
      });
    }
  });

  if (chips.length === 0) return null;

  return (
    <View className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
        {chips.map(chip => (
          <Pressable 
            key={chip.key}
            onPress={chip.onRemove}
            className="flex-row items-center bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full mr-2 border border-slate-200 dark:border-slate-700"
          >
            <Text className="text-sm text-slate-700 dark:text-slate-300 mr-1">{chip.label}</Text>
            <X size={14} className="text-slate-500" />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};
