import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { X, Star, ImageIcon } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useSubmitReview } from '../../hooks/useProductReviews';

interface Props {
  productId: string;
  isVisible: boolean;
  onClose: () => void;
}

export const ReviewForm = ({ productId, isVisible, onClose }: Props) => {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [review, setReview] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<'yes' | 'no' | undefined>(undefined);
  const [images, setImages] = useState<any[]>([]);
  
  const { mutateAsync: submitReview, isPending } = useSubmitReview();

  const handlePickImage = async () => {
    Alert.alert('Coming Soon', 'Image uploads are temporarily disabled in this build environment. Please submit text-only reviews for now.');
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      Alert.alert('Error', 'Please select a rating between 1 and 5 stars.');
      return;
    }

    try {
      // Backend expects files as generic media[]
      const mediaFiles = images.map((img) => ({
        uri: img.uri,
        type: img.mimeType || 'image/jpeg',
        name: img.fileName || `review-${Date.now()}.jpg`,
      }));

      await submitReview({
        payload: {
          productId,
          rating,
          title: title.trim() || undefined,
          review: review.trim() || undefined,
          wouldRecommend,
        },
        files: mediaFiles,
      });

      Alert.alert('Success', 'Your review has been submitted successfully!');
      
      // Reset form
      setRating(5);
      setTitle('');
      setReview('');
      setWouldRecommend(undefined);
      setImages([]);
      
      onClose();
    } catch (error: any) {
      console.error('Submit review error:', error);
      Alert.alert('Submission Failed', error?.response?.data?.message || 'Could not submit your review. Ensure you have purchased this product.');
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-white dark:bg-slate-950">
        <View className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <Text className="text-xl font-bold text-slate-900 dark:text-white">Write a Review</Text>
          <Pressable onPress={onClose} className="p-2" disabled={isPending}>
            <X size={24} className="text-slate-900 dark:text-slate-100" />
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
          {/* Rating */}
          <View className="items-center mb-8">
            <Text className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Overall Rating
            </Text>
            <View className="flex-row">
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={`pick-star-${star}`} onPress={() => setRating(star)} className="px-1">
                  <Star size={40} fill={star <= rating ? "#fbbf24" : "transparent"} color={star <= rating ? "#fbbf24" : "#cbd5e1"} />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Title */}
          <Text className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Headline (Optional)</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What's most important to know?"
            placeholderTextColor="#94a3b8"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-4 text-slate-900 dark:text-white"
            maxLength={160}
            editable={!isPending}
          />

          {/* Review Text */}
          <Text className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Review (Optional)</Text>
          <TextInput
            value={review}
            onChangeText={setReview}
            placeholder="What did you like or dislike?"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-4 text-slate-900 dark:text-white text-top items-start justify-start"
            style={{ minHeight: 120 }}
            maxLength={2000}
            editable={!isPending}
          />

          {/* Recommendation */}
          <Text className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Would you recommend this item?</Text>
          <View className="flex-row mb-6 mt-1">
            <Pressable 
              onPress={() => setWouldRecommend('yes')} 
              className={`flex-1 flex-row justify-center items-center py-3 rounded-lg border mr-2 ${
                wouldRecommend === 'yes' ? 'bg-indigo-50 border-indigo-500' : 'bg-transparent border-slate-200 dark:border-slate-700'
              }`}
              disabled={isPending}
            >
              <Text className={`font-bold ${wouldRecommend === 'yes' ? 'text-indigo-600' : 'text-slate-500 dark:text-slate-400'}`}>Yes</Text>
            </Pressable>
            <Pressable 
              onPress={() => setWouldRecommend('no')} 
              className={`flex-1 flex-row justify-center items-center py-3 rounded-lg border ml-2 ${
                wouldRecommend === 'no' ? 'bg-indigo-50 border-indigo-500' : 'bg-transparent border-slate-200 dark:border-slate-700'
              }`}
              disabled={isPending}
            >
              <Text className={`font-bold ${wouldRecommend === 'no' ? 'text-indigo-600' : 'text-slate-500 dark:text-slate-400'}`}>No</Text>
            </Pressable>
          </View>

          {/* Media Upload */}
          <Text className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Add Photos (Optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 flex-row">
            {images.map((img, i) => (
              <View key={`img-${i}`} className="mr-3 relative">
                <View className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700">
                  <Image source={{ uri: img.uri }} className="w-full h-full" contentFit="cover" />
                </View>
                <Pressable 
                  onPress={() => handleRemoveImage(i)} 
                  className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                  disabled={isPending}
                >
                  <X size={12} color="white" />
                </Pressable>
              </View>
            ))}
            
            {images.length < 10 && (
              <Pressable 
                onPress={handlePickImage} 
                className="w-20 h-20 bg-slate-100 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg items-center justify-center"
                disabled={isPending}
              >
                <ImageIcon size={24} className="text-slate-400 mb-1" />
                <Text className="text-[10px] uppercase font-bold text-slate-400">Add</Text>
              </Pressable>
            )}
          </ScrollView>

          <View className="py-8">
            <Pressable 
              onPress={handleSubmit} 
              disabled={isPending}
              className={`w-full py-4 rounded-xl items-center disabled:opacity-70 ${isPending ? 'bg-slate-300 dark:bg-slate-700' : 'bg-indigo-600'}`}
            >
              {isPending ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#fff" />
                  <Text className="text-white font-bold text-lg ml-2">Submitting...</Text>
                </View>
              ) : (
                <Text className="text-white font-bold text-lg">Submit Review</Text>
              )}
            </Pressable>
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
};
