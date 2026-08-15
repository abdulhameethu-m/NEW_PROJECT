import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useCatalogStore } from '../../stores/catalogStore';
import { useCategories } from '../../hooks/useCategories';
import { useSubCategories } from '../../hooks/useSubCategories';
import { useCatalogFilters } from '../../hooks/useCatalogFilters';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { RangeSlider } from '../ui/RangeSlider';

// Inline dropdown to prevent nested Android Modal crashes
const InlineDropdown = ({ 
  options, 
  selectedValue, 
  onSelect, 
  placeholder 
}: { 
  options: { label: string; value: string }[], 
  selectedValue?: string, 
  onSelect: (v: string) => void, 
  placeholder: string 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === selectedValue);

  return (
    <View className="mb-5 z-10 w-full relative">
      <Pressable 
        onPress={() => setIsOpen(!isOpen)}
        className="flex-row items-center justify-between border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-[8px] px-3 py-2.5 w-full"
      >
        <Text className="text-slate-700 dark:text-slate-200 text-sm flex-1">{selectedOption ? selectedOption.label : placeholder}</Text>
        {isOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
      </Pressable>
      {isOpen && (
        <View className="mt-1 border border-slate-200 dark:border-slate-700 rounded-[8px] bg-white dark:bg-slate-800 shadow-sm overflow-hidden z-20 absolute top-full left-0 right-0 max-h-48">
          <ScrollView nestedScrollEnabled>
            {[{ label: placeholder, value: '' }, ...options].map((opt, idx) => (
              <Pressable 
                key={opt.value + idx} 
                onPress={() => {
                  onSelect(opt.value);
                  setIsOpen(false);
                }}
                className={`p-3 border-b border-slate-100 dark:border-slate-700 ${selectedValue === opt.value ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              >
                <Text className={`text-sm ${selectedValue === opt.value ? 'text-blue-600 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FilterModal = ({ visible, onClose }: FilterModalProps) => {
  const { categoryId, category, minPrice, maxPrice, setFilters, search, setSearch, ...dynamicFilters } = useCatalogStore();
  
  // Local state for drafting filters
  const [localSearch, setLocalSearch] = useState<string>(search || '');
  const [localCategoryId, setLocalCategoryId] = useState<string | undefined>(categoryId);
  const [localSubCategoryId, setLocalSubCategoryId] = useState<string | undefined>(undefined);
  const [localMinPrice, setLocalMinPrice] = useState<string>(minPrice ? minPrice.toString() : '');
  const [localMaxPrice, setLocalMaxPrice] = useState<string>(maxPrice ? maxPrice.toString() : '');
  const [localDynamic, setLocalDynamic] = useState<Record<string, string>>({}); // simplified to string for dropdowns

  const { data: categories = [] } = useCategories();
  const { data: subcategories = [] } = useSubCategories(localCategoryId);
  const { data: filtersData } = useCatalogFilters({ categoryId: localCategoryId }, visible);

  useEffect(() => {
    if (visible) {
      setLocalSearch(search || '');
      setLocalCategoryId(categoryId);
      setLocalMinPrice(minPrice ? minPrice.toString() : '');
      setLocalMaxPrice(maxPrice ? maxPrice.toString() : '');
      
      const parsedDynamic: Record<string, string> = {};
      Object.entries(dynamicFilters).forEach(([key, val]) => {
        if (typeof val === 'function') return;
        if (val) parsedDynamic[key] = Array.isArray(val) ? val[0] : val;
      });
      setLocalDynamic(parsedDynamic);
    }
  }, [visible, categoryId, minPrice, maxPrice, dynamicFilters, search]);

  const handleApplySearch = () => {
    setSearch(localSearch || undefined);
    onClose();
  };

  const handleApplyPrice = () => {
    setFilters({
      minPrice: localMinPrice ? parseFloat(localMinPrice) : undefined,
      maxPrice: localMaxPrice ? parseFloat(localMaxPrice) : undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/50">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="bg-slate-50 dark:bg-slate-950 rounded-t-[16px] max-h-[90%] min-h-[70%] shadow-2xl"
        >
          {/* Header area - matched to web "Filters" block */}
          <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-[16px] flex-1 mt-4 mx-4 mb-8 overflow-hidden z-0">
            <View className="flex-row items-center justify-between p-5 pb-3">
              <Text className="text-[17px] font-bold text-slate-900 dark:text-white">Filters</Text>
              <Pressable onPress={onClose} className="p-1 active:opacity-70">
                <ChevronDown size={20} className="text-slate-400" />
              </Pressable>
            </View>

            <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40}}>
              {/* Search Block */}
              <View className="mb-2 z-10 w-full relative">
                <Text className="text-sm text-slate-600 dark:text-slate-400 mb-2">Search</Text>
                <TextInput
                  className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-[8px] px-3 py-2 text-sm text-slate-900 dark:text-white mb-3 w-full"
                  placeholder="Search products..."
                  placeholderTextColor="#94a3b8"
                  value={localSearch}
                  onChangeText={setLocalSearch}
                />
                <Pressable onPress={handleApplySearch} className="bg-blue-600 rounded-[8px] py-2.5 items-center justify-center w-full">
                  <Text className="text-white font-medium text-sm">Apply search</Text>
                </Pressable>
              </View>

              {/* Category */}
              <View className="mt-5 w-full relative z-[50]">
                <Text className="text-sm text-slate-600 dark:text-slate-400 mb-2">Category</Text>
                <InlineDropdown 
                  options={categories.map(c => ({ label: c.name, value: c._id }))}
                  selectedValue={localCategoryId}
                  onSelect={(v) => {
                    setLocalCategoryId(v || undefined);
                    setLocalSubCategoryId(undefined);
                    // Automatically apply Category like web does when selected
                    setFilters({ categoryId: v || undefined, subCategoryId: undefined });
                  }}
                  placeholder="All Categories"
                />
              </View>

              {/* Subcategory */}
              <View className="w-full relative z-[40]">
                <Text className="text-sm text-slate-600 dark:text-slate-400 mb-2">Subcategory</Text>
                <InlineDropdown 
                  options={subcategories.map(c => ({ label: c.name, value: c._id }))}
                  selectedValue={localSubCategoryId}
                  onSelect={(v) => {
                    setLocalSubCategoryId(v || undefined);
                    setFilters({ subCategoryId: v || undefined });
                  }}
                  placeholder="All Subcategories"
                />
              </View>

              {/* Price Bounding Box */}
              <View className="border border-slate-200 dark:border-slate-700 rounded-[8px] p-4 mb-5 w-full relative z-0">
                <Text className="font-bold text-slate-800 dark:text-slate-200 text-base mb-4">Price</Text>
                
                <View className="flex-row items-center justify-between mb-6">
                  <TextInput
                    className="border border-slate-300 dark:border-slate-700 rounded-[8px] py-1.5 px-3 text-sm text-center flex-1 mr-2 text-slate-900 dark:text-white"
                    keyboardType="numeric"
                    value={localMinPrice}
                    onChangeText={setLocalMinPrice}
                    placeholder="400"
                    placeholderTextColor="#94a3b8"
                  />
                  <TextInput
                    className="border border-slate-300 dark:border-slate-700 rounded-[8px] py-1.5 px-3 text-sm text-center flex-1 ml-2 text-slate-900 dark:text-white"
                    keyboardType="numeric"
                    value={localMaxPrice}
                    onChangeText={setLocalMaxPrice}
                    placeholder="59000"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <RangeSlider 
                  min={0} 
                  max={100000} 
                  currentMin={parseFloat(localMinPrice || '400')} 
                  currentMax={parseFloat(localMaxPrice || '59000')}
                  onValuesChange={(newMin, newMax) => {
                    // Range slider values natively handled
                  }} 
                />

                <View className="flex-row justify-between mt-3 mb-5">
                  <Text className="text-slate-500 text-xs">400</Text>
                  <Text className="text-slate-500 text-xs">59000</Text>
                </View>

                <Pressable onPress={handleApplyPrice} className="bg-slate-100 dark:bg-slate-800 rounded-[8px] py-2 items-center justify-center">
                  <Text className="text-slate-700 dark:text-slate-300 text-sm font-medium">Apply</Text>
                </Pressable>
              </View>

              {/* Dynamic Facets (mapped cleanly to exactly match web style Dropdowns) */}
              {filtersData?.facets?.filter((f: any) => f.type !== 'range' && f.key !== 'price').map((facet: any, idx) => (
                <View key={facet.key} className={`w-full relative z-[${29 - idx}]`}>
                  <Text className="text-sm text-slate-600 dark:text-slate-400 mb-2">{facet.name}</Text>
                  <InlineDropdown 
                    options={facet.options?.map((opt: any) => ({ label: opt.label, value: opt.value })) || []}
                    selectedValue={localDynamic[facet.key]}
                    onSelect={(v) => {
                      setLocalDynamic(prev => ({ ...prev, [facet.key]: v }));
                      setFilters({ [facet.key]: v ? [v] : undefined });
                    }}
                    placeholder={`All ${facet.name}s`}
                  />
                </View>
              ))}
              
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
