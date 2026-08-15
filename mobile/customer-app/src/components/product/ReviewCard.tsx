import React from 'react';
import { View, Text } from 'react-native';
import { Star } from 'lucide-react-native';
import { Image } from 'expo-image';
import { ProductReview } from '../../api/reviews';

const AVATAR_FALLBACK = 'https://ui-avatars.com/api/?name=User&background=random';

interface Props {
  review: ProductReview;
}

export const ReviewCard = ({ review }: Props) => {
  const author = typeof review.customerId === 'object' ? review.customerId : null;
  const authorName = author?.name || 'Verified User';
  const avatar = author?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=random`;

  const date = new Date(review.createdAt).toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <View className="px-4 py-5 border-t border-slate-100 dark:border-slate-800/50 bg-white dark:bg-slate-950">
      <View className="flex-row items-center mb-3">
        <Image 
          source={avatar} 
          style={{ width: 40, height: 40, borderRadius: 20 }}
          className="bg-slate-100 dark:bg-slate-800 mr-3"
        />
        <View className="flex-1">
          <Text className="text-sm font-bold text-slate-900 dark:text-white">
            {authorName}
          </Text>
          <View className="flex-row items-center mt-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={`review-star-${review._id}-${star}`} 
                size={12} 
                fill={star <= review.rating ? "#fbbf24" : "transparent"} 
                color={star <= review.rating ? "#fbbf24" : "#cbd5e1"} 
              />
            ))}
            <Text className="text-slate-400 text-xs ml-2">{date}</Text>
          </View>
        </View>
        
        {review.verifiedPurchase && (
          <View className="bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
            <Text className="text-green-600 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider">
              Verified
            </Text>
          </View>
        )}
      </View>

      {review.title ? (
        <Text className="text-sm font-bold text-slate-900 dark:text-white mb-2">
          {review.title}
        </Text>
      ) : null}

      {review.review ? (
        <Text className="text-slate-600 dark:text-slate-300 text-sm leading-6 mb-3">
          {review.review}
        </Text>
      ) : null}

      {review.images && review.images.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mt-1">
          {review.images.map((img, i) => (
            <Image 
              key={`review-img-${review._id}-${i}`} 
              source={img.url}
              style={{ width: 70, height: 70, borderRadius: 8 }}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800"
              contentFit="cover"
            />
          ))}
        </View>
      )}

      {review.vendorReply && (
        <View className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-l-2 border-indigo-500">
          <View className="flex-row items-center mb-1">
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Response from Store
            </Text>
          </View>
          <Text className="text-sm text-slate-600 dark:text-slate-400">
            {review.vendorReply}
          </Text>
        </View>
      )}
    </View>
  );
};
