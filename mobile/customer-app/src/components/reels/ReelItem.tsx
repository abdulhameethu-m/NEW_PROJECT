import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Share,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Play, Pause, Heart, Sparkles } from 'lucide-react-native';
import { ReelItem as ReelItemType, ReelProduct } from '../../types/reel';
import { resolveReelMediaUrl, reelsApi } from '../../api/reels';
import { ReelActionSidebar } from './ReelActionSidebar';
import { ReelProductCard } from './ReelProductCard';
import { useToggleReelLike, useToggleReelSave, useFollowCreator } from '../../hooks/useReels';

interface ReelItemProps {
  item: ReelItemType;
  isActive: boolean;
  height: number;
  width: number;
  onOpenComments: (reelId: string, count: number) => void;
  onOpenProduct: (product: ReelProduct, reelId: string) => void;
}

export const ReelItem: React.FC<ReelItemProps> = ({
  item,
  isActive,
  height,
  width,
  onOpenComments,
  onOpenProduct,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  const lastTapRef = useRef<number>(0);
  const playTimeoutRef = useRef<any>(null);

  const { mutate: toggleLike } = useToggleReelLike();
  const { mutate: toggleSave } = useToggleReelSave();
  const { mutate: followCreator } = useFollowCreator();

  // Double tap heart pop animation
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const videoUri = resolveReelMediaUrl(item.videoUrl);
  const thumbnailUri = resolveReelMediaUrl(item.thumbnailUrl || item.imageUrls?.[0]);
  const isVideo = item.mediaType !== 'image' && Boolean(item.videoUrl);

  // Initialize Video Player
  const player = useVideoPlayer(videoUri || '', (p) => {
    p.loop = true;
    p.muted = isMuted;
    if (isActive) {
      p.play();
    }
  });

  // Control playback when active state changes
  useEffect(() => {
    if (!player || !isVideo) return;
    if (isActive) {
      player.play();
      setIsPlaying(true);

      // Record view metric after 2 seconds of watch time
      const viewTimer = setTimeout(() => {
        reelsApi.recordView(item._id, { watchTimeSeconds: 2 });
      }, 2000);

      return () => clearTimeout(viewTimer);
    } else {
      player.pause();
      setIsPlaying(false);
    }
  }, [isActive, player, isVideo, item._id]);

  const togglePlayPause = () => {
    if (!player || !isVideo) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }

    setShowPlayIcon(true);
    clearTimeout(playTimeoutRef.current);
    playTimeoutRef.current = setTimeout(() => {
      setShowPlayIcon(false);
    }, 800);
  };

  const handleMuteToggle = () => {
    if (!player) return;
    const newMuted = !isMuted;
    player.muted = newMuted;
    setIsMuted(newMuted);
  };

  const triggerHeartPop = () => {
    heartScale.value = 0;
    heartOpacity.value = 1;
    heartScale.value = withSequence(
      withSpring(1.4, { damping: 4, stiffness: 220 }),
      withTiming(1, { duration: 150 })
    );
    heartOpacity.value = withTiming(0, { duration: 700 });
  };

  const handleDoubleTap = () => {
    triggerHeartPop();
    if (!item.engagement?.viewer?.liked) {
      toggleLike(item._id);
    }
  };

  const handleSurfacePress = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      handleDoubleTap();
    } else {
      togglePlayPause();
    }
    lastTapRef.current = now;
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: item.title || 'Check out this reel on Uchooseme!',
        message: `${item.title || 'Check out this reel!'}\n${videoUri}`,
      });
      reelsApi.recordView(item._id, { watchTimeSeconds: 0 });
    } catch {
      // Handled silently
    }
  };

  const handleFollow = () => {
    const currentFollowed = item.influencerId?.isFollowing || false;
    followCreator({ reelId: item._id, following: !currentFollowed });
  };

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  const primaryProduct = item.products?.[0];

  return (
    <View style={[styles.container, { height, width }]}>
      {/* Background Media: Video or Static Image */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleSurfacePress}>
        {isVideo ? (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
        ) : (
          <Image
            source={{ uri: thumbnailUri || videoUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        )}
      </Pressable>

      {/* Floating Center Heart Pop on Double Tap */}
      <Animated.View
        style={[styles.heartPopContainer, heartAnimatedStyle]}
        pointerEvents="none"
      >
        <Heart size={100} color="#f43f5e" fill="#f43f5e" />
      </Animated.View>

      {/* Momentary Play / Pause Indicator */}
      {showPlayIcon && (
        <View style={styles.centerIconOverlay} pointerEvents="none">
          <View style={styles.centerIconCircle}>
            {isPlaying ? (
              <Play size={36} color="#ffffff" fill="#ffffff" />
            ) : (
              <Pause size={36} color="#ffffff" fill="#ffffff" />
            )}
          </View>
        </View>
      )}

      {/* Bottom Dark Gradient for Text Legibility */}
      <LinearGradient
        colors={['transparent', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.88)']}
        locations={[0, 0.5, 1]}
        style={[styles.bottomGradient, { width }]}
        pointerEvents="box-none"
      >
        <View style={styles.bottomContentWrapper} pointerEvents="box-none">
          {/* Tagged Product Pill (if available) */}
          {primaryProduct && (
            <ReelProductCard
              product={primaryProduct}
              onPress={() => onOpenProduct(primaryProduct, item._id)}
            />
          )}

          {/* Campaign / Sponsored Badge */}
          {item.campaignBadge && (
            <View style={styles.campaignBadge}>
              <Sparkles size={11} color="#fef08a" />
              <Text style={styles.campaignBadgeText}>{item.campaignBadge}</Text>
            </View>
          )}

          {/* Creator Info */}
          {item.influencerId && (
            <View style={styles.creatorRow}>
              <Text style={styles.creatorName}>
                @{item.influencerId.displayName || item.influencerId.storeName || 'creator'}
              </Text>
              {item.influencerId.verified && (
                <View style={styles.verifiedDot} />
              )}
            </View>
          )}

          {/* Reel Caption */}
          {(item.caption || item.title) && (
            <Pressable onPress={() => setCaptionExpanded(!captionExpanded)}>
              <Text
                style={styles.captionText}
                numberOfLines={captionExpanded ? undefined : 2}
              >
                {item.caption || item.title}
              </Text>
            </Pressable>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {item.tags.slice(0, 4).map((tag, idx) => (
                <Text key={idx} style={styles.tagItem}>
                  #{tag}
                </Text>
              ))}
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Right Side Action Sidebar */}
      <ReelActionSidebar
        influencer={item.influencerId}
        counts={item.engagement?.counts}
        isLiked={item.engagement?.viewer?.liked}
        isSaved={item.engagement?.viewer?.saved}
        isMuted={isMuted}
        onLikePress={() => toggleLike(item._id)}
        onCommentPress={() => onOpenComments(item._id, item.engagement?.counts?.comments || 0)}
        onSavePress={() => toggleSave(item._id)}
        onSharePress={handleShare}
        onMuteToggle={handleMuteToggle}
        onFollowPress={handleFollow}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    overflow: 'hidden',
    position: 'relative',
  },
  heartPopContainer: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -50,
    marginTop: -50,
    zIndex: 40,
  },
  centerIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 35,
  },
  centerIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 80,
    zIndex: 20,
  },
  bottomContentWrapper: {
    maxWidth: '75%',
  },
  campaignBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 179, 8, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(254, 240, 138, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 6,
  },
  campaignBadgeText: {
    color: '#fef08a',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  creatorName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38bdf8',
    marginLeft: 6,
  },
  captionText: {
    color: '#f1f5f9',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagItem: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '600',
  },
});
