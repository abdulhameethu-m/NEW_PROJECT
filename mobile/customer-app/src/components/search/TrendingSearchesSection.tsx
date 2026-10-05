import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Flame, Sparkles, Layers, ArrowUpRight } from 'lucide-react-native';
import { Category } from '../../types/catalog';
import { TRENDING_SEARCH_TAGS } from '../../api/search';

interface TrendingSearchesSectionProps {
  categories?: Category[];
  onSelectTerm: (term: string) => void;
  onSelectCategory: (category: Category) => void;
}

export const TrendingSearchesSection: React.FC<TrendingSearchesSectionProps> = ({
  categories = [],
  onSelectTerm,
  onSelectCategory,
}) => {
  return (
    <View className="mt-5 px-4">
      {/* Trending Header */}
      <View className="flex-row items-center mb-3">
        <View className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/60 items-center justify-center mr-2">
          <Flame size={15} color="#f59e0b" />
        </View>
        <Text className="text-base font-bold text-slate-900 dark:text-white">
          Trending Searches
        </Text>
      </View>

      {/* Trending Tags Pills */}
      <View className="flex-row flex-wrap gap-2 mb-6">
        {TRENDING_SEARCH_TAGS.map((tag) => (
          <Pressable
            key={tag}
            onPress={() => onSelectTerm(tag)}
            className="flex-row items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-3.5 py-2 active:bg-amber-50 dark:active:bg-amber-950/30 active:border-amber-400"
          >
            <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {tag}
            </Text>
            <ArrowUpRight size={13} className="text-slate-400 ml-1.5" />
          </Pressable>
        ))}
      </View>

      {/* Explore Popular Categories */}
      {categories.length > 0 && (
        <View className="mt-2 mb-6">
          <View className="flex-row items-center mb-3">
            <View className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/60 items-center justify-center mr-2">
              <Sparkles size={14} color="#6366f1" />
            </View>
            <Text className="text-base font-bold text-slate-900 dark:text-white">
              Explore Categories
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2.5">
            {categories.map((category) => (
              <Pressable
                key={category._id}
                onPress={() => onSelectCategory(category)}
                className="flex-row items-center bg-slate-100 dark:bg-slate-800/80 rounded-xl px-3.5 py-2.5 active:bg-indigo-50 dark:active:bg-indigo-950/40 border border-transparent active:border-indigo-300"
              >
                <Layers size={14} className="text-indigo-500 mr-2" />
                <Text className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};
