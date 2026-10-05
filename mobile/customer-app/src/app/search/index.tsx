import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Search,
  X,
  ArrowRight,
  SearchX,
  Sparkles,
} from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { safeGoBack } from '../../utils/safeNavigation';
import { useCatalogStore } from '../../stores/catalogStore';
import { useCategories } from '../../hooks/useCategories';
import { useSearchAutocomplete } from '../../hooks/useSearchAutocomplete';
import {
  getRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '../../utils/recentSearches';
import { SearchAutocompleteItem } from '../../components/search/SearchAutocompleteItem';
import { RecentSearchesSection } from '../../components/search/RecentSearchesSection';
import { TrendingSearchesSection } from '../../components/search/TrendingSearchesSection';
import { Product, Category } from '../../types/catalog';

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ initialQuery?: string }>();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState(params.initialQuery || '');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Autocomplete query hook with debouncing
  const {
    suggestions,
    totalCount,
    isSearching,
    debouncedQuery,
  } = useSearchAutocomplete(query, 300);

  // Categories for discovery section
  const { data: categories = [] } = useCategories();

  // Load recent searches on mount
  useEffect(() => {
    let isMounted = true;
    getRecentSearches().then((searches) => {
      if (isMounted) {
        setRecentSearches(searches);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle term selection (from recent, trending, or keyboard enter)
  const handleSelectTerm = useCallback(
    async (term: string) => {
      const cleanTerm = term.trim();
      if (!cleanTerm) return;

      Keyboard.dismiss();
      const updated = await saveRecentSearch(cleanTerm);
      setRecentSearches(updated);

      // Set catalog store search term
      useCatalogStore.getState().setSearch(cleanTerm);

      // Navigate to shop catalog screen
      router.push('/(tabs)/shop' as any);
    },
    [router]
  );

  // Handle single product selection
  const handleSelectProduct = useCallback(
    async (product: Product) => {
      Keyboard.dismiss();
      if (query.trim()) {
        const updated = await saveRecentSearch(query.trim());
        setRecentSearches(updated);
      }
      const targetParam = product.slug || product._id;
      router.push(`/product/${targetParam}` as any);
    },
    [query, router]
  );

  // Handle category selection
  const handleSelectCategory = useCallback(
    (category: Category) => {
      Keyboard.dismiss();
      useCatalogStore.getState().setCategory(category._id);
      router.push('/(tabs)/shop' as any);
    },
    [router]
  );

  // Handle individual recent search removal
  const handleRemoveRecent = useCallback(async (term: string) => {
    const updated = await removeRecentSearch(term);
    setRecentSearches(updated);
  }, []);

  // Handle clearing all recent searches
  const handleClearAllRecent = useCallback(async () => {
    await clearRecentSearches();
    setRecentSearches([]);
  }, []);

  // Handle clearing input
  const handleClearInput = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const hasQuery = query.trim().length >= 2;

  return (
    <SafeAreaScreen className="flex-1 bg-white dark:bg-slate-950" edges={['top']}>
      {/* Top Search Header Bar */}
      <View className="flex-row items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        {/* Back Button */}
        <Pressable
          onPress={() => safeGoBack(router, '/(tabs)')}
          className="p-2 -ml-2 rounded-full active:bg-slate-100 dark:active:bg-slate-800 mr-2"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={24} className="text-slate-800 dark:text-white" />
        </Pressable>

        {/* Input Pill Container */}
        <View className="flex-1 flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-full px-3.5 py-1.5 border border-slate-200/80 dark:border-slate-700/80">
          <Search size={18} color="#f59e0b" />

          <TextInput
            ref={inputRef}
            className="flex-1 ml-2.5 text-base text-slate-900 dark:text-slate-100 py-1"
            placeholder="Search sarees, kurtas, decor..."
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            autoFocus={true}
            returnKeyType="search"
            onSubmitEditing={() => handleSelectTerm(query)}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {query.length > 0 && (
            <Pressable
              onPress={handleClearInput}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="p-1 rounded-full active:bg-slate-200 dark:active:bg-slate-700"
            >
              <X size={16} className="text-slate-400" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Main Body */}
      {!hasQuery ? (
        /* State 1: Discovery & Recent History */
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Recent Searches */}
          <RecentSearchesSection
            recentSearches={recentSearches}
            onSelectTerm={handleSelectTerm}
            onRemoveTerm={handleRemoveRecent}
            onClearAll={handleClearAllRecent}
          />

          {/* Trending Searches & Discovery */}
          <TrendingSearchesSection
            categories={categories}
            onSelectTerm={handleSelectTerm}
            onSelectCategory={handleSelectCategory}
          />
        </ScrollView>
      ) : (
        /* State 2: Live Autocomplete Results */
        <View className="flex-1">
          {/* Top Quick Search Prompt */}
          <Pressable
            onPress={() => handleSelectTerm(query)}
            className="flex-row items-center justify-between px-4 py-3 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/30 active:bg-amber-100/60"
          >
            <View className="flex-row items-center flex-1 mr-2">
              <Search size={16} color="#d97706" className="mr-2" />
              <Text
                className="text-sm text-slate-800 dark:text-slate-200"
                numberOfLines={1}
              >
                Search for "<Text className="font-bold text-amber-600 dark:text-amber-400">{query.trim()}</Text>"
              </Text>
            </View>

            <View className="flex-row items-center">
              {totalCount > 0 && (
                <View className="bg-amber-200/60 dark:bg-amber-900/60 px-2 py-0.5 rounded-full mr-2">
                  <Text className="text-[11px] font-bold text-amber-800 dark:text-amber-200">
                    {totalCount} {totalCount === 1 ? 'item' : 'items'}
                  </Text>
                </View>
              )}
              <ArrowRight size={16} color="#d97706" />
            </View>
          </Pressable>

          {/* Autocomplete List or State Handlers */}
          {isSearching && suggestions.length === 0 ? (
            <View className="flex-1 items-center justify-center p-8">
              <ActivityIndicator size="small" color="#f59e0b" />
              <Text className="text-xs text-slate-400 dark:text-slate-500 mt-3 font-medium">
                Searching suggestions...
              </Text>
            </View>
          ) : !isSearching && suggestions.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6 py-12">
              <View className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mb-4">
                <SearchX size={32} className="text-slate-400 dark:text-slate-500" />
              </View>

              <Text className="text-base font-bold text-slate-900 dark:text-white text-center mb-1">
                No products found
              </Text>

              <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6 max-w-[260px] leading-4">
                We couldn't find matching items for "{debouncedQuery || query}". Check your spelling or try broader keywords.
              </Text>

              <Pressable
                onPress={() => handleSelectTerm(query)}
                className="bg-amber-500 active:bg-amber-600 px-5 py-2.5 rounded-full flex-row items-center shadow-sm"
              >
                <Text className="text-white text-xs font-semibold mr-1.5">
                  Search in Full Catalog
                </Text>
                <ArrowRight size={14} color="#ffffff" />
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item._id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <SearchAutocompleteItem
                  product={item}
                  searchQuery={query}
                  onPress={handleSelectProduct}
                />
              )}
              ListFooterComponent={
                <Pressable
                  onPress={() => handleSelectTerm(query)}
                  className="py-4 items-center justify-center border-t border-slate-100 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-900"
                >
                  <Text className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    View all results in Shop →
                  </Text>
                </Pressable>
              }
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          )}
        </View>
      )}
    </SafeAreaScreen>
  );
}
