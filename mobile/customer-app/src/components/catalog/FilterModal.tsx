import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useCatalogStore } from '../../stores/catalogStore';
import { useCategories } from '../../hooks/useCategories';
import { useSubCategories } from '../../hooks/useSubCategories';
import { useCatalogFilters } from '../../hooks/useCatalogFilters';
import { ChevronDown, ChevronUp, SlidersHorizontal, Search, LayoutGrid, Layers } from 'lucide-react-native';
import { RangeSlider } from '../ui/RangeSlider';

// Inline dropdown to prevent nested Android Modal crashes
const InlineDropdown = ({ 
  options, 
  selectedValue, 
  onSelect, 
  placeholder,
  prefixIcon,
  disabled
}: { 
  options: { label: string; value: string }[], 
  selectedValue?: string, 
  onSelect: (v: string) => void, 
  placeholder: string,
  prefixIcon?: React.ReactNode,
  disabled?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === selectedValue);

  return (
    <View className="mb-5 z-10 w-full relative">
      <Pressable 
        onPress={() => !disabled && setIsOpen(!isOpen)}
        className={`flex-row items-center justify-between border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-3 py-2.5 w-full ${disabled ? 'opacity-50' : ''}`}
      >
        <View className="flex-row items-center flex-1">
          {prefixIcon && <View className="mr-3">{prefixIcon}</View>}
          <Text className="text-slate-700 dark:text-slate-200 text-sm flex-1">{selectedOption ? selectedOption.label : placeholder}</Text>
        </View>
        {isOpen ? <ChevronUp size={16} className="text-slate-900 dark:text-slate-100" /> : <ChevronDown size={16} className="text-slate-900 dark:text-slate-100" />}
      </Pressable>
      {isOpen && !disabled && (
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
  const [localDynamic, setLocalDynamic] = useState<Record<string, string | string[]>>({});

  const { data: categories = [] } = useCategories();
  const { data: subcategories = [] } = useSubCategories(localCategoryId);
  const { data: filtersData } = useCatalogFilters({ categoryId: localCategoryId }, visible);

  useEffect(() => {
    if (visible) {
      setLocalSearch(search || '');
      setLocalCategoryId(categoryId);
      setLocalMinPrice(minPrice ? minPrice.toString() : '');
      setLocalMaxPrice(maxPrice ? maxPrice.toString() : '');
      
      const parsedDynamic: Record<string, string | string[]> = {};
      Object.entries(dynamicFilters).forEach(([key, val]) => {
        if (typeof val === 'function') return;
        if (val) parsedDynamic[key] = val;
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
              <View className="flex-row items-center">
                <SlidersHorizontal size={20} className="text-blue-600 mr-2" />
                <Text className="text-[17px] font-bold text-slate-900 dark:text-white">Filters</Text>
              </View>
              <Pressable onPress={onClose} className="p-1 active:opacity-70">
                <ChevronUp size={20} className="text-slate-900 dark:text-slate-100" />
              </Pressable>
            </View>

            <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40}}>
              {/* Search Block */}
              <View className="mb-2 z-10 w-full relative">
                <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 mt-2">Search</Text>
                <View className="relative mb-3 flex-row items-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl py-2 px-3">
                  <Search size={16} className="text-slate-400 mr-2" />
                  <TextInput
                    className="flex-1 text-sm text-slate-900 dark:text-white p-0"
                    placeholder="Search products..."
                    placeholderTextColor="#94a3b8"
                    value={localSearch}
                    onChangeText={setLocalSearch}
                  />
                </View>
                <Pressable onPress={handleApplySearch} className="bg-[#0052FF] rounded-xl py-3 items-center justify-center w-full">
                  <Text className="text-white font-semibold text-sm">Apply search</Text>
                </Pressable>
              </View>

              {/* Category */}
              <View className="mt-5 w-full relative z-[50]">
                <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Category</Text>
                <InlineDropdown 
                  options={categories.map(c => ({ label: c.name, value: c._id }))}
                  selectedValue={localCategoryId}
                  prefixIcon={<View className="p-1 rounded-md bg-blue-50"><LayoutGrid size={16} className="text-blue-600" /></View>}
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
                <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Subcategory</Text>
                <InlineDropdown 
                  options={subcategories.map(c => ({ label: c.name, value: c._id }))}
                  selectedValue={localSubCategoryId}
                  disabled={!localCategoryId}
                  prefixIcon={<View className="p-1 rounded-md bg-blue-50"><Layers size={16} className="text-blue-600" /></View>}
                  onSelect={(v) => {
                    setLocalSubCategoryId(v || undefined);
                    setFilters({ subCategoryId: v || undefined });
                  }}
                  placeholder="All Subcategories"
                />
              </View>

              {/* Price Bounding Box */}
              <View className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 mb-5 w-full relative z-0">
                <Text className="font-bold text-slate-900 dark:text-slate-100 text-[15px] mb-4">Price</Text>
                
                <View className="flex-row items-center justify-between mb-3">
                  <View className="relative flex-1 mr-2 flex-row items-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl pl-3 pr-2 py-2.5">
                    <Text className="text-slate-500 text-sm mr-1">₹</Text>
                    <TextInput
                      className="flex-1 text-sm text-slate-900 dark:text-white p-0 h-[20px]"
                      keyboardType="numeric"
                      value={localMinPrice}
                      onChangeText={setLocalMinPrice}
                      placeholder="250"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View className="relative flex-1 ml-2 flex-row items-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl pl-3 pr-2 py-2.5">
                    <Text className="text-slate-500 text-sm mr-1">₹</Text>
                    <TextInput
                      className="flex-1 text-sm text-slate-900 dark:text-white p-0 h-[20px]"
                      keyboardType="numeric"
                      value={localMaxPrice}
                      onChangeText={setLocalMaxPrice}
                      placeholder="49999"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                <View className="mt-3 mb-4">
                  <RangeSlider 
                    min={0} 
                    max={100000} 
                    currentMin={parseFloat(localMinPrice || '250')} 
                    currentMax={parseFloat(localMaxPrice || '49999')}
                    onValuesChange={(newMin, newMax) => {
                      setLocalMinPrice(newMin.toString());
                      setLocalMaxPrice(newMax.toString());
                    }} 
                  />
                </View>

                <Pressable onPress={handleApplyPrice} className="w-full rounded-xl border border-blue-200 bg-[#eff6ff] py-3 items-center justify-center dark:border-blue-900/50 dark:bg-blue-900/20 mt-2">
                  <Text className="text-blue-600 dark:text-blue-400 text-[15px] font-semibold">Apply</Text>
                </Pressable>
              </View>

              {/* Dynamic Facets (identical to web mobile view) */}
              {filtersData?.facets?.filter((f: any) => f.key !== 'price').map((facet: any, idx) => {
                const options = facet.options || [];
                
                if (facet.type === 'range') {
                  return (
                    <View key={facet.key} className="rounded-2xl border border-blue-100 bg-[#eff6ff] dark:border-slate-800 dark:bg-slate-800 p-4 mb-5 w-full">
                      <Text className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-4">{facet.name}</Text>
                      <Text className="text-sm text-slate-500">Range slider coming soon...</Text>
                    </View>
                  );
                }

                if (facet.type === 'checkbox') {
                  const values = Array.isArray(localDynamic[facet.key]) 
                    ? localDynamic[facet.key] as string[] 
                    : (localDynamic[facet.key] ? [localDynamic[facet.key] as string] : []);

                  return (
                    <View key={facet.key} className={`w-full mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900 z-[${29 - idx}]`}>
                      <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">{facet.name}</Text>
                      <View className="flex flex-col gap-2">
                        {options.map((option: any) => {
                          const isSelected = values.includes(option.value);
                          return (
                            <Pressable
                              key={option.value}
                              onPress={() => {
                                const nextSelected = isSelected
                                  ? values.filter(v => v !== option.value)
                                  : [...values, option.value];
                                
                                setLocalDynamic(prev => ({ ...prev, [facet.key]: nextSelected.length ? nextSelected : [] }));
                                setFilters({ [facet.key]: nextSelected.length ? nextSelected : undefined });
                              }}
                              className={`rounded-2xl border px-3 py-3 w-full flex-row items-center justify-between ${
                                isSelected
                                  ? "border-blue-600 bg-blue-600"
                                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                              }`}
                            >
                              <Text className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-slate-700 dark:text-slate-200'}`}>
                                {option.value}
                              </Text>
                              <Text className={`text-[11px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                {option.count}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                }

                // Default (Single Select)
                const selectedValue = localDynamic[facet.key] as string | undefined;
                return (
                  <View key={facet.key} className={`w-full mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900 z-[${29 - idx}]`}>
                    <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">{facet.name}</Text>
                    <View className="flex flex-col gap-2">
                      <Pressable
                        onPress={() => {
                          setLocalDynamic(prev => {
                            const newDynamic = { ...prev };
                            delete newDynamic[facet.key];
                            return newDynamic;
                          });
                          setFilters({ [facet.key]: undefined });
                        }}
                        className={`rounded-2xl border px-3 py-3 w-full flex-row items-center justify-between ${
                          !selectedValue
                            ? "border-slate-900 bg-slate-900"
                            : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                        }`}
                      >
                        <Text className={`text-sm ${!selectedValue ? 'text-white font-medium' : 'text-slate-700 dark:text-slate-200'}`}>
                          All
                        </Text>
                      </Pressable>
                      {options.map((option: any) => {
                        const isSelected = selectedValue === option.value;
                        return (
                          <Pressable
                            key={option.value}
                            onPress={() => {
                              setLocalDynamic(prev => ({ ...prev, [facet.key]: option.value }));
                              setFilters({ [facet.key]: option.value });
                            }}
                            className={`rounded-2xl border px-3 py-3 w-full flex-row items-center justify-between ${
                              isSelected
                                ? "border-slate-900 bg-slate-900"
                                : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                            }`}
                          >
                            <Text className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-slate-700 dark:text-slate-200'}`}>
                              {option.value}
                            </Text>
                            <Text className={`text-[11px] ${isSelected ? 'text-blue-100 opacity-70' : 'text-slate-400'}`}>
                              {option.count}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
              
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
