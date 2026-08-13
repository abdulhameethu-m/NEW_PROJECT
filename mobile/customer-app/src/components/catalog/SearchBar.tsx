import React, { useState, useEffect } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useCatalogStore } from '../../stores/catalogStore';

export const SearchBar = ({ 
  onPress,
  editable = true,
}: { 
  onPress?: () => void;
  editable?: boolean;
} = {}) => {
  const setSearch = useCatalogStore((state) => state.setSearch);
  const currentSearch = useCatalogStore((state) => state.search);
  
  const [localValue, setLocalValue] = useState(currentSearch || '');

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only trigger API if the trimmed value actually changed
      const trimmed = localValue.trim();
      const currentTrimmed = (currentSearch || '').trim();
      if (trimmed !== currentTrimmed) {
        setSearch(trimmed || undefined);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localValue, setSearch, currentSearch]);

  // Sync local value when external state changes (e.g., cleared from filters)
  useEffect(() => {
    if (currentSearch !== localValue.trim()) {
      setLocalValue(currentSearch || '');
    }
  }, [currentSearch]);

  const Content = (
    <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 mx-4 my-2 border border-slate-200 dark:border-slate-700">
      <Search size={20} className="text-slate-400" />
      <TextInput
        className="flex-1 ml-2 text-base text-slate-900 dark:text-slate-100 py-1"
        placeholder="Search products..."
        placeholderTextColor="#94a3b8"
        value={localValue}
        onChangeText={setLocalValue}
        returnKeyType="search"
        editable={editable}
        pointerEvents={editable ? 'auto' : 'none'}
      />
      {localValue.length > 0 && editable && (
        <Pressable onPress={() => setLocalValue('')} className="p-1">
          <X size={18} className="text-slate-400" />
        </Pressable>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        {Content}
      </Pressable>
    );
  }

  return Content;
};
