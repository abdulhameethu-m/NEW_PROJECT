import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { X, Send, Heart, MessageCircle } from 'lucide-react-native';
import { useReelComments, useAddReelComment } from '../../hooks/useReels';
import { ReelComment } from '../../types/reel';
import { resolveReelMediaUrl, reelsApi } from '../../api/reels';

interface ReelCommentsModalProps {
  visible: boolean;
  reelId?: string;
  totalComments?: number;
  onClose: () => void;
}

export const ReelCommentsModal: React.FC<ReelCommentsModalProps> = ({
  visible,
  reelId,
  totalComments = 0,
  onClose,
}) => {
  const [commentText, setCommentText] = useState('');
  const { data, isLoading } = useReelComments(visible ? reelId : undefined);
  const { mutate: postComment, isPending: isPosting } = useAddReelComment(reelId || '');

  const comments = data?.items || [];
  const displayTotal = data?.total ?? totalComments;

  const handleSend = () => {
    const trimmed = commentText.trim();
    if (!trimmed || isPosting || !reelId) return;

    postComment(trimmed, {
      onSuccess: () => {
        setCommentText('');
      },
    });
  };

  const handleLikeComment = async (commentId: string) => {
    if (!reelId) return;
    try {
      await reelsApi.toggleCommentLike(reelId, commentId);
    } catch {
      // Handled silently
    }
  };

  const renderCommentItem = ({ item }: { item: ReelComment }) => {
    const avatarUri = resolveReelMediaUrl(item.userId?.avatarUrl);
    const userName = item.userId?.name || 'User';

    return (
      <View style={styles.commentRow}>
        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.fallbackAvatar]}>
              <Text style={styles.fallbackAvatarText}>{userName[0].toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Comment Body */}
        <View style={styles.commentBody}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.commentText}>{item.text}</Text>
          <Text style={styles.timestamp}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Just now'}
          </Text>
        </View>

        {/* Like comment button */}
        <TouchableOpacity
          style={styles.commentLikeBtn}
          onPress={() => handleLikeComment(item._id)}
          activeOpacity={0.7}
        >
          <Heart
            size={14}
            color={item.isLiked ? '#f43f5e' : '#94a3b8'}
            fill={item.isLiked ? '#f43f5e' : 'none'}
          />
          {Boolean(item.likesCount) && (
            <Text style={styles.commentLikeCount}>{item.likesCount}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.avoidingContainer}
        >
          <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
            {/* Top Handle bar */}
            <View style={styles.handleBar} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                Comments {displayTotal > 0 ? `(${displayTotal})` : ''}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#4f46e5" />
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <MessageCircle size={32} color="#94a3b8" />
                </View>
                <Text style={styles.emptyTitle}>No comments yet</Text>
                <Text style={styles.emptySubtitle}>Be the first to share your thoughts!</Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item._id}
                renderItem={renderCommentItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}

            {/* Comment Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Add a comment..."
                placeholderTextColor="#94a3b8"
                value={commentText}
                onChangeText={setCommentText}
                maxLength={500}
                multiline={false}
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />

              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!commentText.trim() || isPosting) && styles.sendBtnDisabled,
                ]}
                onPress={handleSend}
                disabled={!commentText.trim() || isPosting}
              >
                {isPosting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Send size={16} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  avoidingContainer: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: 480,
    maxHeight: '75%',
  },
  handleBar: {
    width: 44,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  fallbackAvatar: {
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  commentBody: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 19,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#94a3b8',
  },
  commentLikeBtn: {
    alignItems: 'center',
    paddingTop: 4,
  },
  commentLikeCount: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
});
