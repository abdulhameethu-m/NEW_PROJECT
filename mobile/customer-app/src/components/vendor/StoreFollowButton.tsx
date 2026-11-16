import React, { useState, useEffect } from 'react';
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
  const [localIsFollowing, setLocalIsFollowing] = useState(isFollowing);
  const toggleMutation = useToggleFollowStore();
  const isPending = toggleMutation.isPending;

  useEffect(() => {
    setLocalIsFollowing(isFollowing);
  }, [isFollowing]);

  const handlePress = () => {
    if (isPending || !storeSlug) return;

    const nextState = !localIsFollowing;
    setLocalIsFollowing(nextState);

    toggleMutation.mutate(
      { slug: storeSlug, isCurrentlyFollowing: localIsFollowing },
      {
        onSuccess: (data) => {
          const finalState = data?.isFollowing ?? nextState;
          setLocalIsFollowing(finalState);
          onFollowToggled?.(finalState);
        },
        onError: () => {
          setLocalIsFollowing(isFollowing);
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
      activeOpacity={0.7}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={[
        styles.baseButton,
        isSmall && styles.smButton,
        isLarge && styles.lgButton,
        localIsFollowing ? styles.followingButton : styles.followButton,
        style,
      ]}
    >
      {isPending ? (
        <ActivityIndicator
          size="small"
          color={localIsFollowing ? '#059669' : '#ffffff'}
          style={{ marginRight: 6 }}
        />
      ) : localIsFollowing ? (
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
          localIsFollowing ? styles.followingText : styles.followText,
          textStyle,
        ]}
      >
        {isPending ? 'Updating...' : localIsFollowing ? 'Following' : 'Follow'}
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
    zIndex: 50,
    elevation: 4,
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
