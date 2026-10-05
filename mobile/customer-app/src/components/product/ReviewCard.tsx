import React, { useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Star, Play, ShieldCheck } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ProductReview } from '../../api/reviews';
import { resolveUrl } from '../../utils/resolveUrl';
import { ReviewMediaModal, ReviewMediaItem } from './ReviewMediaModal';

interface Props {
  review: ProductReview;
}

const CardVideoThumbnail: React.FC<{ url: string }> = ({ url }) => {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.muted = true;
  });

  return (
    <View style={{ width: 72, height: 72, position: 'relative' }}>
      <VideoView
        player={player}
        style={{ width: 72, height: 72 }}
        contentFit="cover"
        nativeControls={false}
      />
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: 'rgba(0,0,0,0.65)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.4)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Play size={12} color="#ffffff" fill="#ffffff" style={{ marginLeft: 2 }} />
        </View>
        <View style={{ position: 'absolute', bottom: 3, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
          <Text style={{ fontSize: 8, fontWeight: '700', color: '#ffffff', textTransform: 'uppercase' }}>
            Video
          </Text>
        </View>
      </View>
    </View>
  );
};

export const ReviewCard = ({ review }: Props) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const author = typeof review.customerId === 'object' ? review.customerId : null;
  const authorName = author?.name || 'Verified Buyer';
  const avatarUrl = resolveUrl(author?.avatarUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=random`;

  const date = new Date(review.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Combine images and videos into uniform media items
  const allMedia: ReviewMediaItem[] = useMemo(() => {
    const items: ReviewMediaItem[] = [];

    if (Array.isArray(review.images)) {
      review.images.forEach((img) => {
        if (img?.url) {
          items.push({
            url: resolveUrl(img.url) || img.url,
            mimeType: img.mimeType || 'image/jpeg',
            isVideo: false,
          });
        }
      });
    }

    if (Array.isArray(review.videos)) {
      review.videos.forEach((vid) => {
        if (vid?.url) {
          items.push({
            url: resolveUrl(vid.url) || vid.url,
            mimeType: vid.mimeType || 'video/mp4',
            isVideo: true,
          });
        }
      });
    }

    return items;
  }, [review.images, review.videos]);

  const handleOpenMedia = (index: number) => {
    setSelectedMediaIndex(index);
    setModalVisible(true);
  };

  const visibleImages = review.images?.slice(0, 4) || [];
  const remainingImagesCount = (review.images?.length || 0) - visibleImages.length;

  return (
    <View className="px-4 py-5 border-t border-slate-100 dark:border-slate-800/50 bg-white dark:bg-slate-950">
      {/* Reviewer Header */}
      <View className="flex-row items-center mb-3">
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: 40, height: 40, borderRadius: 20 }}
          className="bg-slate-100 dark:bg-slate-800 mr-3"
          contentFit="cover"
        />
        <View className="flex-1">
          <Text className="text-sm font-bold text-slate-900 dark:text-white">
            {authorName}
          </Text>
          <View className="flex-row items-center mt-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={`review-star-${review._id}-${star}`}
                size={13}
                fill={star <= review.rating ? '#fbbf24' : 'transparent'}
                color={star <= review.rating ? '#fbbf24' : '#cbd5e1'}
              />
            ))}
            <Text className="text-slate-400 text-xs ml-2">{date}</Text>
          </View>
        </View>

        {review.verifiedPurchase && (
          <View className="flex-row items-center bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-md">
            <ShieldCheck size={12} color="#059669" />
            <Text className="text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider ml-1">
              Verified
            </Text>
          </View>
        )}
      </View>

      {/* Review Title */}
      {review.title ? (
        <Text className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">
          {review.title}
        </Text>
      ) : null}

      {/* Review Body */}
      {review.review ? (
        <Text className="text-slate-600 dark:text-slate-300 text-sm leading-6 mb-3">
          {review.review}
        </Text>
      ) : null}

      {/* Attached Media Grid */}
      {allMedia.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mt-1 mb-2">
          {/* Photos */}
          {visibleImages.map((img, i) => {
            const isLastVisible = i === 3 && remainingImagesCount > 0;
            const fullUrl = resolveUrl(img.url) || img.url;

            return (
              <Pressable
                key={`review-img-${review._id}-${i}`}
                onPress={() => handleOpenMedia(i)}
                className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 active:opacity-85"
                style={{ width: 72, height: 72 }}
              >
                <Image
                  source={{ uri: fullUrl }}
                  style={{ width: 72, height: 72 }}
                  className="bg-slate-100 dark:bg-slate-800"
                  contentFit="cover"
                />

                {isLastVisible && (
                  <View className="absolute inset-0 bg-black/60 items-center justify-center">
                    <Text className="text-white text-xs font-bold">
                      +{remainingImagesCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}

          {/* Videos */}
          {review.videos && review.videos.map((vid, vidIdx) => {
            const mediaIndex = (review.images?.length || 0) + vidIdx;
            const videoUrl = resolveUrl(vid.url) || vid.url;
            return (
              <Pressable
                key={`review-vid-${review._id}-${vidIdx}`}
                onPress={() => handleOpenMedia(mediaIndex)}
                className="rounded-xl overflow-hidden border border-indigo-200 dark:border-indigo-900 bg-slate-950 active:opacity-85"
                style={{ width: 72, height: 72 }}
              >
                <CardVideoThumbnail url={videoUrl} />
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Vendor Reply */}
      {review.vendorReply && (
        <View className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border-l-2 border-amber-500">
          <View className="flex-row items-center mb-1">
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Response from Store
            </Text>
          </View>
          <Text className="text-xs text-slate-600 dark:text-slate-400 leading-5">
            {review.vendorReply}
          </Text>
        </View>
      )}

      {/* Fullscreen Media Viewer Modal */}
      <ReviewMediaModal
        visible={modalVisible}
        media={allMedia}
        initialIndex={selectedMediaIndex}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
};
