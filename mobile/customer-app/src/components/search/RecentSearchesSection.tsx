import React from 'react';
import { View, Text, Pressable, Alert, Platform } from 'react-native';
import { History, X, Clock, Trash2 } from 'lucide-react-native';

interface RecentSearchesSectionProps {
  recentSearches: string[];
  onSelectTerm: (term: string) => void;
  onRemoveTerm: (term: string) => void;
  onClearAll: () => void;
}

export const RecentSearchesSection: React.FC<RecentSearchesSectionProps> = ({
  recentSearches,
  onSelectTerm,
  onRemoveTerm,
  onClearAll,
}) => {
  if (recentSearches.length === 0) {
    return null;
  }

  const handleClearConfirm = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Clear all recent searches?')) {
        onClearAll();
      }
      return;
    }

    Alert.alert(
      'Clear Recent Searches',
      'Are you sure you want to remove your entire search history?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: onClearAll },
      ]
    );
  };

  return (
    <View className="mt-4 px-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <History size={18} className="text-slate-500 dark:text-slate-400 mr-2" />
          <Text className="text-base font-bold text-slate-900 dark:text-white">
            Recent Searches
          </Text>
        </View>

        <Pressable
          onPress={handleClearConfirm}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="flex-row items-center active:opacity-70"
        >
          <Text className="text-xs font-semibold text-rose-500 dark:text-rose-400">
            Clear All
          </Text>
        </Pressable>
      </View>

      {/* Recent Items List */}
      <View className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-2 border border-slate-100 dark:border-slate-800">
        {recentSearches.map((term, index) => (
          <View
            key={`${term}-${index}`}
            className={`flex-row items-center justify-between py-2.5 px-3 rounded-xl active:bg-slate-100 dark:active:bg-slate-800/80 ${
              index < recentSearches.length - 1 ? 'border-b border-slate-100 dark:border-slate-800/50' : ''
            }`}
          >
            <Pressable
              onPress={() => onSelectTerm(term)}
              className="flex-1 flex-row items-center mr-3"
            >
              <Clock size={16} className="text-slate-400 mr-3" />
              <Text
                className="text-sm text-slate-800 dark:text-slate-200 font-medium"
                numberOfLines={1}
              >
                {term}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onRemoveTerm(term)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="p-1 rounded-full active:bg-slate-200 dark:active:bg-slate-700"
            >
              <X size={15} className="text-slate-400 hover:text-slate-600" />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
};
