import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Heart, MessageCircle, Bookmark, Share2, Volume2, VolumeX, Plus, Check } from 'lucide-react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { ReelInfluencer, ReelEngagementCounts } from '../../types/reel';
import { resolveReelMediaUrl } from '../../api/reels';

interface ReelActionSidebarProps {
  influencer?: ReelInfluencer;
  counts?: ReelEngagementCounts;
  isLiked?: boolean;
  isSaved?: boolean;
  isMuted?: boolean;
  onLikePress: () => void;
  onCommentPress: () => void;
  onSavePress: () => void;
  onSharePress: () => void;
  onMuteToggle: () => void;
  onFollowPress: () => void;
}

function formatCompactNumber(num?: number): string {
  if (!num || num <= 0) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(num);
}

export const ReelActionSidebar: React.FC<ReelActionSidebarProps> = ({
  influencer,
  counts,
  isLiked = false,
  isSaved = false,
  isMuted = false,
  onLikePress,
  onCommentPress,
  onSavePress,
  onSharePress,
  onMuteToggle,
  onFollowPress,
}) => {
  const heartScale = useSharedValue(1);

  const handleLike = () => {
    heartScale.value = withSpring(1.3, { damping: 4, stiffness: 200 }, () => {
      heartScale.value = withSpring(1);
    });
    onLikePress();
  };

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const avatarUri = resolveReelMediaUrl(
    influencer?.avatarUrl || influencer?.profilePicture || influencer?.profileImage
  );

  return (
    <View style={styles.container}>
      {/* Creator Avatar & Follow Button */}
      {influencer && (
        <View style={styles.avatarContainer}>
          <View style={styles.avatarBorder}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.fallbackAvatar]}>
                <Text style={styles.avatarInitial}>
                  {(influencer.displayName || 'C')[0].toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.followBadge, influencer.isFollowing && styles.followingBadge]}
            onPress={onFollowPress}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {influencer.isFollowing ? (
              <Check size={12} color="#ffffff" strokeWidth={3} />
            ) : (
              <Plus size={12} color="#ffffff" strokeWidth={3} />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Like Button */}
      <TouchableOpacity style={styles.actionButton} onPress={handleLike} activeOpacity={0.7}>
        <Animated.View style={[styles.iconCircle, heartAnimatedStyle]}>
          <Heart
            size={28}
            color={isLiked ? '#f43f5e' : '#ffffff'}
            fill={isLiked ? '#f43f5e' : 'none'}
            strokeWidth={2}
          />
        </Animated.View>
        <Text style={styles.countText}>{formatCompactNumber(counts?.likes)}</Text>
      </TouchableOpacity>

      {/* Comments Button */}
      <TouchableOpacity style={styles.actionButton} onPress={onCommentPress} activeOpacity={0.7}>
        <View style={styles.iconCircle}>
          <MessageCircle size={26} color="#ffffff" strokeWidth={2} />
        </View>
        <Text style={styles.countText}>{formatCompactNumber(counts?.comments)}</Text>
      </TouchableOpacity>

      {/* Save / Bookmark Button */}
      <TouchableOpacity style={styles.actionButton} onPress={onSavePress} activeOpacity={0.7}>
        <View style={styles.iconCircle}>
          <Bookmark
            size={26}
            color={isSaved ? '#f59e0b' : '#ffffff'}
            fill={isSaved ? '#f59e0b' : 'none'}
            strokeWidth={2}
          />
        </View>
        <Text style={styles.countText}>{formatCompactNumber(counts?.saves)}</Text>
      </TouchableOpacity>

      {/* Share Button */}
      <TouchableOpacity style={styles.actionButton} onPress={onSharePress} activeOpacity={0.7}>
        <View style={styles.iconCircle}>
          <Share2 size={26} color="#ffffff" strokeWidth={2} />
        </View>
        <Text style={styles.countText}>{formatCompactNumber(counts?.shares)}</Text>
      </TouchableOpacity>

      {/* Mute / Unmute Button */}
      <TouchableOpacity style={styles.actionButton} onPress={onMuteToggle} activeOpacity={0.7}>
        <View style={[styles.iconCircle, styles.muteCircle]}>
          {isMuted ? (
            <VolumeX size={20} color="#ffffff" strokeWidth={2} />
          ) : (
            <Volume2 size={20} color="#ffffff" strokeWidth={2} />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    bottom: 120,
    alignItems: 'center',
    gap: 16,
    zIndex: 30,
  },
  avatarContainer: {
    marginBottom: 6,
    position: 'relative',
    alignItems: 'center',
  },
  avatarBorder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#ffffff',
    overflow: 'hidden',
    backgroundColor: '#1e293b',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  fallbackAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  followBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#f43f5e',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  followingBadge: {
    backgroundColor: '#10b981',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteCircle: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 38,
    height: 38,
    borderRadius: 19,
    marginTop: 4,
  },
  countText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
