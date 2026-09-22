import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MessageSquare, ChevronRight, Tag } from 'lucide-react-native';
import { SupportTicket } from '../../types/support';
import { SupportStatusBadge } from './SupportStatusBadge';
import { SupportPriorityBadge } from './SupportPriorityBadge';

interface SupportTicketCardProps {
  ticket: SupportTicket;
  onPress: () => void;
}

export const SupportTicketCard: React.FC<SupportTicketCardProps> = ({ ticket, onPress }) => {
  const messagesCount = ticket.messages?.length || 0;
  const lastMessage = messagesCount > 0 ? ticket.messages[messagesCount - 1] : null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.topRow}>
        <View style={styles.badgesRow}>
          <SupportStatusBadge status={ticket.status} size="sm" />
          <SupportPriorityBadge priority={ticket.priority} />
        </View>
        <Text style={styles.dateText} allowFontScaling={false}>
          {formatDate(ticket.updatedAt || ticket.createdAt)}
        </Text>
      </View>

      <Text style={styles.subjectText} numberOfLines={2} allowFontScaling={false}>
        {ticket.subject}
      </Text>

      {ticket.category ? (
        <View style={styles.categoryRow}>
          <Tag size={11} color="#6366f1" style={{ marginRight: 4 }} />
          <Text style={styles.categoryText} allowFontScaling={false}>
            {ticket.category}
          </Text>
        </View>
      ) : null}

      {lastMessage ? (
        <View style={styles.snippetWrap}>
          <Text style={styles.snippetSender} allowFontScaling={false}>
            {lastMessage.senderType === 'USER' ? 'You: ' : 'Support: '}
          </Text>
          <Text style={styles.snippetText} numberOfLines={1} allowFontScaling={false}>
            {lastMessage.message}
          </Text>
        </View>
      ) : null}

      <View style={styles.footerRow}>
        <View style={styles.msgCountPill}>
          <MessageSquare size={12} color="#64748b" style={{ marginRight: 4 }} />
          <Text style={styles.msgCountText} allowFontScaling={false}>
            {messagesCount} message{messagesCount === 1 ? '' : 's'}
          </Text>
        </View>
        <View style={styles.viewRow}>
          <Text style={styles.viewText} allowFontScaling={false}>
            View Conversation
          </Text>
          <ChevronRight size={14} color="#6366f1" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  subjectText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 20,
    marginBottom: 6,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '700',
  },
  snippetWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  snippetSender: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  snippetText: {
    flex: 1,
    fontSize: 11,
    color: '#64748b',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  msgCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  msgCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366f1',
    marginRight: 2,
  },
});
