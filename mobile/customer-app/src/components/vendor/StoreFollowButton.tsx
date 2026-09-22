import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { UserCheck, UserPlus } from 'lucide-react-native';
import { useToggleFollowStore } from '../../hooks/useVendor';

interface StoreFollowButtonProps {
  storeSlug: string;
  isFollowing: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  onFollowToggled?: (isNowFollowing: boolean) => void;
}

export const StoreFollowButton: React.FC<StoreFollowButtonProps> = ({
  storeSlug,
  isFollowing,
  size = 'md',
  style,
  textStyle,
  onFollowToggled,
}) => {
  const toggleMutation = useToggleFollowStore();
  const isPending = toggleMutation.isPending;

  const handlePress = () => {
    if (isPending || !storeSlug) return;

    toggleMutation.mutate(
      { slug: storeSlug, isCurrentlyFollowing: isFollowing },
      {
        onSuccess: (data) => {
          onFollowToggled?.(data?.isFollowing ?? !isFollowing);
        },
      }
    );
  };

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isPending}
      activeOpacity={0.8}
      style={[
        styles.baseButton,
        isSmall && styles.smButton,
        isLarge && styles.lgButton,
        isFollowing ? styles.followingButton : styles.followButton,
        style,
      ]}
    >
      {isPending ? (
        <ActivityIndicator
          size="small"
          color={isFollowing ? '#475569' : '#ffffff'}
          style={{ marginRight: 6 }}
        />
      ) : isFollowing ? (
        <UserCheck size={isSmall ? 14 : isLarge ? 18 : 16} color="#059669" style={{ marginRight: 6 }} />
      ) : (
        <UserPlus size={isSmall ? 14 : isLarge ? 18 : 16} color="#ffffff" style={{ marginRight: 6 }} />
      )}

      <Text
        allowFontScaling={false}
        style={[
          styles.baseText,
          isSmall && styles.smText,
          isLarge && styles.lgText,
          isFollowing ? styles.followingText : styles.followText,
          textStyle,
        ]}
      >
        {isPending ? 'Updating...' : isFollowing ? 'Following' : 'Follow'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  smButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  lgButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  followButton: {
    backgroundColor: '#4f46e5',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  followingButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  baseText: {
    fontWeight: '700',
    fontSize: 14,
  },
  smText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lgText: {
    fontSize: 16,
  },
  followText: {
    color: '#ffffff',
  },
  followingText: {
    color: '#0f172a',
  },
});
