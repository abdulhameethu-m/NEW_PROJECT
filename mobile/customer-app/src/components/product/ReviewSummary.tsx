import React from 'react';
import { View, Text } from 'react-native';
import { Star } from 'lucide-react-native';
import { ProductRatings } from '../../types/catalog';

interface Props {
  ratings?: ProductRatings;
}

export const ReviewSummary = ({ ratings }: Props) => {
  if (!ratings || ratings.totalReviews === 0) {
    return (
      <View className="px-4 py-6 mt-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
        <Text className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Customer Reviews
        </Text>
        <Text className="text-slate-500">No reviews yet. Be the first to review!</Text>
      </View>
    );
  }

  const breakdown = ratings.ratingBreakdown || { five: 0, four: 0, three: 0, two: 0, one: 0 };
  const maxCount = Math.max(
    breakdown.five, breakdown.four, breakdown.three, breakdown.two, breakdown.one, 1
  );

  const getPercent = (count: number) => {
    return ratings.totalReviews > 0 ? (count / ratings.totalReviews) * 100 : 0;
  };

  const renderBar = (stars: number, count: number) => {
    const percent = getPercent(count);
    return (
      <View key={`star-bar-${stars}`} className="flex-row items-center mb-1.5">
        <Text className="text-slate-600 dark:text-slate-400 text-xs w-6">{stars} ★</Text>
        <View className="flex-1 max-w-[200px] h-2 bg-slate-100 dark:bg-slate-800 rounded-full mx-2 overflow-hidden">
          <View 
            className="h-full bg-amber-400 rounded-full" 
            style={{ width: `${percent}%` }} 
          />
        </View>
        <Text className="text-slate-400 text-xs w-10 text-right">{count}</Text>
      </View>
    );
  };

  return (
    <View className="px-4 py-6 mt-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
      <Text className="text-lg font-bold text-slate-900 dark:text-white mb-6">
        Customer Reviews
      </Text>
      
      <View className="flex-row items-center">
        <View className="items-center mr-8">
          <Text className="text-4xl font-black text-slate-900 dark:text-white mb-1">
            {ratings.averageRating.toFixed(1)}
          </Text>
          <View className="flex-row mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={`star-${star}`} 
                size={14} 
                fill={star <= Math.round(ratings.averageRating) ? "#fbbf24" : "transparent"} 
                color={star <= Math.round(ratings.averageRating) ? "#fbbf24" : "#cbd5e1"} 
              />
            ))}
          </View>
          <Text className="text-slate-500 text-xs font-medium">
            {ratings.totalReviews} Ratings
          </Text>
        </View>
        
        <View className="flex-1 justify-center">
          {renderBar(5, breakdown.five)}
          {renderBar(4, breakdown.four)}
          {renderBar(3, breakdown.three)}
          {renderBar(2, breakdown.two)}
          {renderBar(1, breakdown.one)}
        </View>
      </View>
    </View>
  );
};
