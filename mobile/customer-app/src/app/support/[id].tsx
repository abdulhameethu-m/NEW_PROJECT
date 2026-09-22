import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Send,
  Headphones,
  User as UserIcon,
  Tag,
  AlertCircle,
  RotateCcw,
} from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { safeGoBack } from '../../utils/safeNavigation';
import { useSupportTicket, useReplySupportTicket } from '../../hooks/useSupport';
import { SupportStatusBadge } from '../../components/support/SupportStatusBadge';
import { SupportPriorityBadge } from '../../components/support/SupportPriorityBadge';

export default function TicketConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const scrollViewRef = useRef<ScrollView>(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);

  const { data: ticket, isLoading, isError, refetch } = useSupportTicket(id);
  const replyMutation = useReplySupportTicket();
  const isSending = replyMutation.isPending;

  // Auto-scroll to bottom when messages change or load
  useEffect(() => {
    if (ticket?.messages?.length) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [ticket?.messages?.length]);

  const handleSendReply = async () => {
    const text = replyText.trim();
    if (!text || isSending || !id) return;
    setReplyError(null);

    try {
      await replyMutation.mutateAsync({
        ticketId: id,
        payload: { message: text },
      });
      setReplyText('');
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to send reply.';
      setReplyError(msg);
    }
  };

  const formatMessageTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ' · ' +
        d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaScreen style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => safeGoBack(router, '/support')}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            Support Ticket
          </Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.centerText} allowFontScaling={false}>
            Loading conversation...
          </Text>
        </View>
      </SafeAreaScreen>
    );
  }

  if (isError || !ticket) {
    return (
      <SafeAreaScreen style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => safeGoBack(router, '/support')}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            Support Ticket
          </Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.centerBox}>
          <AlertCircle size={36} color="#ef4444" style={{ marginBottom: 12 }} />
          <Text style={styles.errorTitle} allowFontScaling={false}>
            Ticket Not Found
          </Text>
          <Text style={styles.errorSubtitle} allowFontScaling={false}>
            This support ticket could not be loaded or may have been removed.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => refetch()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnText} allowFontScaling={false}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaScreen>
    );
  }

  const isClosedOrResolved = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';

  return (
    <SafeAreaScreen style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeGoBack(router, '/support')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1} allowFontScaling={false}>
            {ticket.subject}
          </Text>
          <Text style={styles.headerSubtitle} allowFontScaling={false}>
            Ticket #{ticket._id.substring(ticket._id.length - 6).toUpperCase()}
          </Text>
        </View>
        <SupportStatusBadge status={ticket.status} size="sm" />
      </View>

      {/* Ticket Meta Info Strip */}
      <View style={styles.metaStrip}>
        <View style={styles.metaCol}>
          {ticket.category ? (
            <View style={styles.categoryPill}>
              <Tag size={11} color="#4f46e5" style={{ marginRight: 4 }} />
              <Text style={styles.categoryPillText} allowFontScaling={false}>
                {ticket.category}
              </Text>
            </View>
          ) : null}
          <SupportPriorityBadge priority={ticket.priority} />
        </View>
        <Text style={styles.metaDate} allowFontScaling={false}>
          Opened {new Date(ticket.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </Text>
      </View>

      {/* Ticket Subject Card */}
      <View style={styles.subjectBox}>
        <Text style={styles.subjectLabel} allowFontScaling={false}>
          INQUIRY SUBJECT:
        </Text>
        <Text style={styles.subjectContent} allowFontScaling={false}>
          {ticket.subject}
        </Text>
      </View>

      {/* Reopen Notice Banner */}
      {isClosedOrResolved && (
        <View style={styles.reopenBanner}>
          <RotateCcw size={14} color="#0369a1" style={{ marginRight: 6, marginTop: 1 }} />
          <Text style={styles.reopenBannerText} allowFontScaling={false}>
            This ticket is marked {ticket.status.toLowerCase()}. Sending a reply will automatically reopen it for investigation.
          </Text>
        </View>
      )}

      {/* Conversation Thread */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {ticket.messages.map((msg, index) => {
            const isUser = msg.senderType === 'USER';
            return (
              <View
                key={index}
                style={[
                  styles.messageRow,
                  isUser ? styles.userMessageRow : styles.supportMessageRow,
                ]}
              >
                {!isUser && (
                  <View style={styles.supportAvatar}>
                    <Headphones size={14} color="#ffffff" />
                  </View>
                )}

                <View
                  style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.supportBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.senderLabel,
                      isUser ? styles.userSenderLabel : styles.supportSenderLabel,
                    ]}
                    allowFontScaling={false}
                  >
                    {isUser ? 'You' : 'Customer Support Specialist'}
                  </Text>
                  <Text
                    style={[
                      styles.messageText,
                      isUser ? styles.userMessageText : styles.supportMessageText,
                    ]}
                    allowFontScaling={false}
                  >
                    {msg.message}
                  </Text>
                  <Text
                    style={[
                      styles.timestampText,
                      isUser ? styles.userTimestamp : styles.supportTimestamp,
                    ]}
                    allowFontScaling={false}
                  >
                    {formatMessageTime(msg.createdAt)}
                  </Text>
                </View>

                {isUser && (
                  <View style={styles.userAvatar}>
                    <UserIcon size={14} color="#ffffff" />
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Reply Error notice */}
        {replyError && (
          <View style={styles.replyErrorBar}>
            <Text style={styles.replyErrorText} allowFontScaling={false}>
              {replyError}
            </Text>
          </View>
        )}

        {/* Bottom Reply Composer */}
        <View style={styles.composerContainer}>
          <TextInput
            style={styles.composerInput}
            placeholder={isClosedOrResolved ? 'Reply to reopen ticket...' : 'Type your reply here...'}
            placeholderTextColor="#94a3b8"
            value={replyText}
            onChangeText={setReplyText}
            multiline
            maxLength={2000}
            editable={!isSending}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!replyText.trim() || isSending) && styles.sendBtnDisabled,
            ]}
            onPress={handleSendReply}
            disabled={!replyText.trim() || isSending}
            activeOpacity={0.8}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Send size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },
  metaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  metaCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4f46e5',
  },
  metaDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  subjectBox: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  subjectLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  subjectContent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 18,
  },
  reopenBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f9ff',
    borderBottomWidth: 1,
    borderBottomColor: '#bae6fd',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  reopenBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#0369a1',
    lineHeight: 16,
    fontWeight: '600',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  supportMessageRow: {
    justifyContent: 'flex-start',
  },
  supportAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: '#4f46e5',
    borderBottomRightRadius: 4,
  },
  supportBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  senderLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  userSenderLabel: {
    color: '#c7d2fe',
  },
  supportSenderLabel: {
    color: '#0284c7',
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
  },
  userMessageText: {
    color: '#ffffff',
  },
  supportMessageText: {
    color: '#1e293b',
  },
  timestampText: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: '#e0e7ff',
  },
  supportTimestamp: {
    color: '#94a3b8',
  },
  replyErrorBar: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#fecaca',
  },
  replyErrorText: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '600',
  },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  composerInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: '#0f172a',
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  centerText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  errorSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
