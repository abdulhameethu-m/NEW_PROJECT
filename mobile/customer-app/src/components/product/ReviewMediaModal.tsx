import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  useWindowDimensions,
  FlatList,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { X, Play, AlertCircle } from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { resolveUrl } from '../../utils/resolveUrl';

export interface ReviewMediaItem {
  url: string;
  mimeType?: string;
  isVideo?: boolean;
}

interface ReviewMediaModalProps {
  visible: boolean;
  media: ReviewMediaItem[];
  initialIndex?: number;
  onClose: () => void;
}

const SingleVideoPlayer: React.FC<{ url: string; width: number; height: number; isActive: boolean }> = ({
  url,
  width,
  height,
  isActive,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);

  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    if (isActive) {
      p.play();
    }
  });

  useEffect(() => {
    if (!player) return;
    try {
      if (isActive) {
        player.play();
        setIsPlaying(true);
      } else {
        player.pause();
        setIsPlaying(false);
      }
    } catch (e) {
      console.warn('[ReviewMediaModal] Video playback error:', e);
    }
  }, [isActive, player]);

  const togglePlay = () => {
    if (!player) return;
    try {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn('[ReviewMediaModal] Toggle play error:', e);
    }
  };

  return (
    <Pressable
      onPress={togglePlay}
      style={{ width, height }}
      className="items-center justify-center bg-black relative"
    >
      <VideoView
        player={player}
        style={{ width, height: height * 0.8 }}
        contentFit="contain"
      />
      {!isPlaying && (
        <View className="absolute w-16 h-16 rounded-full bg-black/60 items-center justify-center border border-white/30">
          <Play size={28} color="#ffffff" fill="#ffffff" style={{ marginLeft: 3 }} />
        </View>
      )}
    </Pressable>
  );
};

const SingleImageViewer: React.FC<{ url: string; width: number; height: number }> = ({
  url,
  width,
  height,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <View
      style={{ width, height }}
      className="items-center justify-center bg-black relative"
    >
      {isLoading && (
        <View className="absolute z-10">
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      )}

      {hasError ? (
        <View className="items-center justify-center p-6">
          <AlertCircle size={32} color="#94a3b8" />
          <Text className="text-slate-400 text-sm font-medium text-center mt-2">
            Unable to display image preview
          </Text>
        </View>
      ) : (
        <Image
          source={{ uri: url }}
          style={{ width, height: height * 0.85 }}
          contentFit="contain"
          transition={200}
          cachePolicy="memory-disk"
          onLoadEnd={() => setIsLoading(false)}
          onError={(e) => {
            console.warn('[ReviewMediaModal] Image failed to load:', e, 'uri:', url);
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
    </View>
  );
};

export const ReviewMediaModal: React.FC<ReviewMediaModalProps> = ({
  visible,
  media,
  initialIndex = 0,
  onClose,
}) => {
  const { width, height } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      setActiveIndex(initialIndex);
      setTimeout(() => {
        if (flatListRef.current && initialIndex >= 0 && initialIndex < media.length) {
          try {
            flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
          } catch {
            // Safe fallback
          }
        }
      }, 60);
    }
  }, [visible, initialIndex, media.length]);

  if (!visible || !media || media.length === 0) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black">
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* Top Action Bar */}
        <View className="absolute top-12 left-0 right-0 z-20 flex-row items-center justify-between px-5">
          <View className="bg-black/50 px-3 py-1 rounded-full border border-white/20">
            <Text className="text-white text-xs font-semibold">
              {activeIndex + 1} / {media.length}
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="w-10 h-10 rounded-full bg-black/60 border border-white/20 items-center justify-center active:bg-white/20"
          >
            <X size={20} color="#ffffff" />
          </Pressable>
        </View>

        {/* Media Swiper */}
        <FlatList
          ref={flatListRef}
          data={media}
          keyExtractor={(_, index) => `modal-media-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex < media.length ? initialIndex : 0}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
            }, 60);
          }}
          onMomentumScrollEnd={(e) => {
            const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
            setActiveIndex(newIndex);
          }}
          renderItem={({ item, index }) => {
            const rawUrl = item.url;
            const fullUrl = resolveUrl(rawUrl) || rawUrl;
            const isVideo = Boolean(
              item.isVideo ||
              item.mimeType?.startsWith('video/') ||
              fullUrl.toLowerCase().endsWith('.mp4') ||
              fullUrl.toLowerCase().endsWith('.mov') ||
              fullUrl.toLowerCase().endsWith('.webm') ||
              fullUrl.toLowerCase().includes('/video/')
            );

            if (isVideo) {
              return (
                <SingleVideoPlayer
                  url={fullUrl}
                  width={width}
                  height={height}
                  isActive={activeIndex === index}
                />
              );
            }

            return (
              <SingleImageViewer
                url={fullUrl}
                width={width}
                height={height}
              />
            );
          }}
        />

        {/* Bottom Thumbnail Strip (when multiple media items) */}
        {media.length > 1 && (
          <View className="absolute bottom-10 left-0 right-0 z-20 flex-row justify-center items-center px-4 space-x-2">
            {media.map((item, idx) => (
              <View
                key={`dot-${idx}`}
                className={`w-2 h-2 rounded-full mx-1 ${
                  activeIndex === idx ? 'bg-amber-400 w-5' : 'bg-white/40'
                }`}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
};
