import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProducts } from '../../hooks/useProducts';
import { useCatalogStore } from '../../stores/catalogStore';
import { ProductCard } from '../../components/catalog/ProductCard';
import { SearchBar } from '../../components/catalog/SearchBar';
import { FilterModal } from '../../components/catalog/FilterModal';
import { SortModal } from '../../components/catalog/SortModal';
import { EmptyState } from '../../components/catalog/EmptyState';
import { ProductSkeleton } from '../../components/catalog/ProductSkeleton';
import { Filter, ArrowUpDown } from 'lucide-react-native';

export default function ShopScreen() {
  const queryState = useCatalogStore();
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading,
    isError,
    refetch
  } = useProducts(queryState);

  const [isFilterVisible, setFilterVisible] = useState(false);
  const [isSortVisible, setSortVisible] = useState(false);

  // Flatten pages into a single array of products
  const products = data?.pages?.flatMap(page => page?.items || [])?.filter(Boolean) || [];
  const totalProducts = data?.pages?.[0]?.pagination?.total || 0;

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#f59e0b" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View className="flex-1 px-3">
          <View className="flex-row mb-2">
            <View className="w-1/2 p-1"><ProductSkeleton /></View>
            <View className="w-1/2 p-1"><ProductSkeleton /></View>
          </View>
          <View className="flex-row">
            <View className="w-1/2 p-1"><ProductSkeleton /></View>
            <View className="w-1/2 p-1"><ProductSkeleton /></View>
          </View>
        </View>
      );
    }
    
    if (isError) {
      return <EmptyState title="Error loading products" description="Please pull to refresh and try again." />;
    }

    return <EmptyState />;
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950" edges={['top']}>
      <SearchBar />
      
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-800">
        <Text className="text-sm text-slate-500 dark:text-slate-400">
          {totalProducts} Products Found
        </Text>
        
        <View className="flex-row space-x-4">
          <Pressable 
            onPress={() => setSortVisible(true)}
            className="flex-row items-center space-x-1"
          >
            <ArrowUpDown size={16} className="text-slate-700 dark:text-slate-300" />
            <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Sort</Text>
          </Pressable>
          
          <Pressable 
            onPress={() => setFilterVisible(true)}
            className="flex-row items-center space-x-1 ml-4"
          >
            <Filter size={16} className="text-slate-700 dark:text-slate-300" />
            <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Filter</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item, index) => `${item._id}-${index}`}
        numColumns={2}
        contentContainerStyle={{ padding: 12, flexGrow: 1 }}
        renderItem={({ item }) => (
          <View className="w-1/2">
            <ProductCard product={item} />
          </View>
        )}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshing={isLoading}
        onRefresh={refetch}
      />

      <FilterModal visible={isFilterVisible} onClose={() => setFilterVisible(false)} />
      <SortModal visible={isSortVisible} onClose={() => setSortVisible(false)} />
    </SafeAreaView>
  );
}
