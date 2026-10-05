import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import {
  X,
  Star,
  Camera,
  Image as ImageIcon,
  Video,
  Play,
  Plus,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSubmitReview } from '../../hooks/useProductReviews';
import { ReviewMediaModal, ReviewMediaItem } from './ReviewMediaModal';

interface Props {
  productId: string;
  orderId?: string;
  isVisible: boolean;
  onClose: () => void;
}

interface AttachedMedia {
  id: string;
  uri: string;
  name: string;
  mimeType: string;
  isVideo: boolean;
  size?: number;
}

const MAX_IMAGES = 10;
const MAX_VIDEOS = 1;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

const VideoPreviewThumb: React.FC<{ uri: string }> = ({ uri }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = true;
  });

  return (
    <View style={styles.thumbnailBox}>
      <VideoView
        player={player}
        style={styles.thumbnailMedia}
        contentFit="cover"
        nativeControls={false}
      />
      <View style={styles.videoOverlay} pointerEvents="none">
        <View style={styles.playBadge}>
          <Play size={12} color="#ffffff" fill="#ffffff" style={{ marginLeft: 2 }} />
        </View>
        <Text style={styles.videoBadgeText}>Video</Text>
      </View>
    </View>
  );
};

const ImagePreviewThumb: React.FC<{ uri: string }> = ({ uri }) => {
  return (
    <View style={styles.thumbnailBox}>
      <Image
        source={{ uri }}
        style={styles.thumbnailMedia}
        contentFit="cover"
        transition={150}
      />
    </View>
  );
};

export const ReviewForm = ({ productId, orderId, isVisible, onClose }: Props) => {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [review, setReview] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<'yes' | 'no' | undefined>(undefined);
  const [mediaList, setMediaList] = useState<AttachedMedia[]>([]);
  const [showPickerMenu, setShowPickerMenu] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const { mutateAsync: submitReview, isPending } = useSubmitReview();

  const imageCount = mediaList.filter((m) => !m.isVideo).length;
  const videoCount = mediaList.filter((m) => m.isVideo).length;

  const previewMediaItems: ReviewMediaItem[] = useMemo(() => {
    return mediaList.map((m) => ({
      url: m.uri,
      isVideo: m.isVideo,
      mimeType: m.mimeType,
    }));
  }, [mediaList]);

  const handleOpenPreview = (index: number) => {
    setPreviewIndex(index);
    setPreviewModalVisible(true);
  };

  // 1. Take photo via camera
  const handleTakePhoto = async () => {
    setShowPickerMenu(false);
    if (imageCount >= MAX_IMAGES) {
      Alert.alert('Limit Reached', `You can attach up to ${MAX_IMAGES} photos.`);
      return;
    }

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos for your review.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: Platform.OS === 'ios',
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const filename = asset.fileName || `photo_${Date.now()}.jpg`;
        const newMedia: AttachedMedia = {
          id: `img-${Date.now()}-${Math.random()}`,
          uri: asset.uri,
          name: filename,
          mimeType: asset.mimeType || 'image/jpeg',
          isVideo: false,
          size: asset.fileSize,
        };
        setMediaList((prev) => [...prev, newMedia]);
      }
    } catch (err: any) {
      console.warn('[ReviewForm] Error taking photo:', err);
      Alert.alert('Camera Error', err?.message || 'Could not open camera.');
    }
  };

  // 2. Pick photos from gallery (supports multi-selection)
  const handlePickPhotos = async () => {
    setShowPickerMenu(false);
    const remainingSlots = MAX_IMAGES - imageCount;
    if (remainingSlots <= 0) {
      Alert.alert('Limit Reached', `You can attach up to ${MAX_IMAGES} photos.`);
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Photo library access is needed to select review images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newItems: AttachedMedia[] = result.assets.map((asset, idx) => ({
          id: `img-${Date.now()}-${idx}-${Math.random()}`,
          uri: asset.uri,
          name: asset.fileName || `review_img_${Date.now()}_${idx}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
          isVideo: false,
          size: asset.fileSize,
        }));
        setMediaList((prev) => [...prev, ...newItems].slice(0, MAX_IMAGES + (videoCount ? 1 : 0)));
      }
    } catch (err: any) {
      console.warn('[ReviewForm] Error selecting photos:', err);
      Alert.alert('Gallery Error', err?.message || 'Could not access photo library.');
    }
  };

  // 3. Pick video
  const handlePickVideo = async () => {
    setShowPickerMenu(false);
    if (videoCount >= MAX_VIDEOS) {
      Alert.alert('Limit Reached', 'You can attach up to 1 video review.');
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Photo library access is needed to select a video.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > MAX_VIDEO_SIZE_BYTES) {
          Alert.alert('Video Too Large', 'Please select a video under 50 MB.');
          return;
        }

        const filename = asset.fileName || `review_video_${Date.now()}.mp4`;
        const newMedia: AttachedMedia = {
          id: `vid-${Date.now()}-${Math.random()}`,
          uri: asset.uri,
          name: filename,
          mimeType: asset.mimeType || 'video/mp4',
          isVideo: true,
          size: asset.fileSize,
        };
        setMediaList((prev) => [...prev, newMedia]);
      }
    } catch (err: any) {
      console.warn('[ReviewForm] Error picking video:', err);
      Alert.alert('Video Error', err?.message || 'Could not select video.');
    }
  };

  const handleRemoveMedia = (id: string) => {
    setMediaList((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      Alert.alert('Rating Required', 'Please select an overall rating between 1 and 5 stars.');
      return;
    }

    try {
      const mediaFiles = mediaList.map((m) => ({
        uri: m.uri,
        name: m.name,
        mimeType: m.mimeType,
        type: m.mimeType,
      }));

      await submitReview({
        payload: {
          productId,
          orderId,
          rating,
          title: title.trim() || undefined,
          review: review.trim() || undefined,
          wouldRecommend,
        },
        files: mediaFiles,
      });

      Alert.alert('Thank You!', 'Your review and media have been submitted successfully.');

      // Reset form
      setRating(5);
      setTitle('');
      setReview('');
      setWouldRecommend(undefined);
      setMediaList([]);
      onClose();
    } catch (error: any) {
      console.error('Submit review error:', error);
      const msg = error?.response?.data?.message || 'Could not submit your review. Ensure you have purchased and received this product.';
      Alert.alert('Submission Failed', msg);
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={isPending ? () => {} : onClose}
    >
      <View className="flex-1 bg-white dark:bg-slate-950">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <Text className="text-xl font-bold text-slate-900 dark:text-white">
            Write a Review
          </Text>
          <Pressable
            onPress={onClose}
            className="p-2 -mr-2"
            disabled={isPending}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={22} className="text-slate-800 dark:text-slate-200" />
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
          {/* Star Rating */}
          <View className="items-center mb-6">
            <Text className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Overall Rating
            </Text>
            <View className="flex-row">
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={`pick-star-${star}`}
                  onPress={() => setRating(star)}
                  className="px-1.5 py-1"
                  disabled={isPending}
                >
                  <Star
                    size={38}
                    fill={star <= rating ? '#fbbf24' : 'transparent'}
                    color={star <= rating ? '#fbbf24' : '#cbd5e1'}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Headline */}
          <Text className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
            Review Title (Optional)
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Great fabric quality, fits perfectly!"
            placeholderTextColor="#94a3b8"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-4 text-slate-900 dark:text-white"
            maxLength={160}
            editable={!isPending}
          />

          {/* Review Body */}
          <Text className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
            Detailed Review (Optional)
          </Text>
          <TextInput
            value={review}
            onChangeText={setReview}
            placeholder="Share your thoughts about product fit, material, comfort, and delivery experience..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-4 text-slate-900 dark:text-white text-top"
            style={{ minHeight: 110, textAlignVertical: 'top' }}
            maxLength={2000}
            editable={!isPending}
          />

          {/* Recommendation */}
          <Text className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            Would you recommend this item?
          </Text>
          <View className="flex-row mb-6">
            <Pressable
              onPress={() => setWouldRecommend('yes')}
              className={`flex-1 flex-row justify-center items-center py-2.5 rounded-xl border mr-2 ${
                wouldRecommend === 'yes'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500'
                  : 'bg-transparent border-slate-200 dark:border-slate-700'
              }`}
              disabled={isPending}
            >
              <Text
                className={`font-bold ${
                  wouldRecommend === 'yes' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Yes, recommend
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setWouldRecommend('no')}
              className={`flex-1 flex-row justify-center items-center py-2.5 rounded-xl border ml-2 ${
                wouldRecommend === 'no'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500'
                  : 'bg-transparent border-slate-200 dark:border-slate-700'
              }`}
              disabled={isPending}
            >
              <Text
                className={`font-bold ${
                  wouldRecommend === 'no' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                No, wouldn't
              </Text>
            </Pressable>
          </View>

          {/* Photos & Video Upload Section */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Photos & Video (Optional)
              </Text>
              <Text className="text-xs text-slate-400">
                {imageCount}/{MAX_IMAGES} Photos • {videoCount}/{MAX_VIDEOS} Video
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
              {/* Add Media Trigger Button */}
              {(imageCount < MAX_IMAGES || videoCount < MAX_VIDEOS) && (
                <Pressable
                  onPress={() => setShowPickerMenu(true)}
                  className="w-20 h-20 bg-amber-50/60 dark:bg-slate-900 border border-dashed border-amber-400 dark:border-slate-700 rounded-xl items-center justify-center mr-3 active:bg-amber-100"
                  disabled={isPending}
                >
                  <Plus size={22} color="#d97706" />
                  <Text className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-1">
                    Add Media
                  </Text>
                </Pressable>
              )}

              {/* Render Media Thumbnails */}
              {mediaList.map((item, index) => (
                <View key={item.id} className="mr-3 relative">
                  <Pressable onPress={() => handleOpenPreview(index)} className="active:opacity-80">
                    {item.isVideo ? (
                      <VideoPreviewThumb uri={item.uri} />
                    ) : (
                      <ImagePreviewThumb uri={item.uri} />
                    )}
                  </Pressable>

                  {/* Remove Button */}
                  <Pressable
                    onPress={() => handleRemoveMedia(item.id)}
                    className="absolute -top-1.5 -right-1.5 bg-rose-500 rounded-full p-1 border border-white dark:border-slate-950 shadow-sm z-10"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    disabled={isPending}
                  >
                    <X size={11} color="#ffffff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <Text className="text-[11px] text-slate-400 mt-1.5">
              Upload up to 10 photos (JPEG, PNG, WEBP) and 1 short video clip (max 50 MB). Tap thumbnail to preview.
            </Text>
          </View>

          {/* Submit Action */}
          <View className="py-4">
            <Pressable
              onPress={handleSubmit}
              disabled={isPending}
              className={`w-full py-3.5 rounded-xl items-center shadow-sm ${
                isPending ? 'bg-amber-400/80' : 'bg-amber-500 active:bg-amber-600'
              }`}
            >
              {isPending ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text className="text-white font-bold text-base ml-2">
                    Submitting Review & Media...
                  </Text>
                </View>
              ) : (
                <Text className="text-white font-bold text-base">
                  Submit Review
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>

        {/* Media Picker Options Modal Sheet */}
        <Modal
          visible={showPickerMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPickerMenu(false)}
        >
          <Pressable
            className="flex-1 bg-black/50 justify-end"
            onPress={() => setShowPickerMenu(false)}
          >
            <Pressable
              className="bg-white dark:bg-slate-900 rounded-t-3xl px-6 pt-5 pb-8 border-t border-slate-100 dark:border-slate-800"
              onPress={(e) => e.stopPropagation()}
            >
              <View className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full self-center mb-5" />

              <Text className="text-base font-bold text-slate-900 dark:text-white mb-4">
                Add Review Media
              </Text>

              {/* Take Photo */}
              {imageCount < MAX_IMAGES && (
                <Pressable
                  onPress={handleTakePhoto}
                  className="flex-row items-center py-3.5 px-3 rounded-xl active:bg-slate-50 dark:active:bg-slate-800 mb-1"
                >
                  <View className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 items-center justify-center mr-3">
                    <Camera size={20} color="#d97706" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Take a Photo
                    </Text>
                    <Text className="text-xs text-slate-400">
                      Use device camera to snap product picture
                    </Text>
                  </View>
                </Pressable>
              )}

              {/* Pick Photos from Gallery */}
              {imageCount < MAX_IMAGES && (
                <Pressable
                  onPress={handlePickPhotos}
                  className="flex-row items-center py-3.5 px-3 rounded-xl active:bg-slate-50 dark:active:bg-slate-800 mb-1"
                >
                  <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/60 items-center justify-center mr-3">
                    <ImageIcon size={20} color="#2563eb" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Choose from Photo Library
                    </Text>
                    <Text className="text-xs text-slate-400">
                      Select one or multiple photos ({MAX_IMAGES - imageCount} remaining)
                    </Text>
                  </View>
                </Pressable>
              )}

              {/* Pick Video */}
              {videoCount < MAX_VIDEOS && (
                <Pressable
                  onPress={handlePickVideo}
                  className="flex-row items-center py-3.5 px-3 rounded-xl active:bg-slate-50 dark:active:bg-slate-800 mb-2"
                >
                  <View className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/60 items-center justify-center mr-3">
                    <Video size={20} color="#4f46e5" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Attach Video Clip
                    </Text>
                    <Text className="text-xs text-slate-400">
                      Short video showing the product in action (max 50 MB)
                    </Text>
                  </View>
                </Pressable>
              )}

              <Pressable
                onPress={() => setShowPickerMenu(false)}
                className="mt-2 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl items-center"
              >
                <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Cancel
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Fullscreen Preview Modal */}
        <ReviewMediaModal
          visible={previewModalVisible}
          media={previewMediaItems}
          initialIndex={previewIndex}
          onClose={() => setPreviewModalVisible(false)}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  thumbnailBox: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#0f172a',
  },
  thumbnailMedia: {
    width: 80,
    height: 80,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadgeText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
