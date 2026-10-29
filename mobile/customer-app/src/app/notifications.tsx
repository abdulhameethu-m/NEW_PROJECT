import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  CheckCheck,
  Package,
  Truck,
  Tag,
  LifeBuoy,
  CreditCard,
  Bell,
  Trash2,
  Sparkles,
  ShoppingBag,
  User as UserIcon,
} from 'lucide-react-native';
import { SafeAreaScreen } from '../components/layout/SafeAreaScreen';
import { ResponsiveContainer } from '../components/layout/ResponsiveContainer';
import { safeGoBack } from '../utils/safeNavigation';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '../hooks/useNotifications';
import { CustomerNotification } from '../types/notification';

const FILTER_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'ORDER', label: 'Orders' },
  { key: 'PROMOTION', label: 'Offers' },
  { key: 'SYSTEM', label: 'System' },
];

function formatTimeAgo(isoDate: string): string {
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (3600 * 1000));
    const diffDays = Math.floor(diffMs / (86400 * 1000));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(isoDate).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

function getNotificationVisuals(type: string) {
  switch (type) {
    case 'ORDER':
      return {
        icon: <Package size={20} color="#4f46e5" strokeWidth={2.2} />,
        bgColor: '#e0e7ff',
        badgeColor: '#4f46e5',
        badgeLabel: 'Order',
      };
    case 'DELIVERY':
      return {
        icon: <Truck size={20} color="#059669" strokeWidth={2.2} />,
        bgColor: '#d1fae5',
        badgeColor: '#059669',
        badgeLabel: 'Delivery',
      };
    case 'PROMOTION':
      return {
        icon: <Sparkles size={20} color="#d97706" strokeWidth={2.2} />,
        bgColor: '#fef3c7',
        badgeColor: '#d97706',
        badgeLabel: 'Offer',
      };
    case 'PAYMENT':
      return {
        icon: <CreditCard size={20} color="#0284c7" strokeWidth={2.2} />,
        bgColor: '#e0f2fe',
        badgeColor: '#0284c7',
        badgeLabel: 'Payment',
      };
    case 'SUPPORT':
      return {
        icon: <LifeBuoy size={20} color="#7c3aed" strokeWidth={2.2} />,
        bgColor: '#ede9fe',
        badgeColor: '#7c3aed',
        badgeLabel: 'Support',
      };
    case 'ACCOUNT':
      return {
        icon: <UserIcon size={20} color="#0891b2" strokeWidth={2.2} />,
        bgColor: '#cffafe',
        badgeColor: '#0891b2',
        badgeLabel: 'Account',
      };
    default:
      return {
        icon: <Bell size={20} color="#475569" strokeWidth={2.2} />,
        bgColor: '#f1f5f9',
        badgeColor: '#475569',
        badgeLabel: 'Alert',
      };
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('ALL');

  const { data, isLoading, refetch, isRefetching } = useNotifications(activeFilter);
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const deleteMutation = useDeleteNotification();

  const notifications = useMemo(() => data?.notifications || [], [data]);
  const unreadCount = data?.unreadCount || 0;

  const handleNotificationPress = (item: CustomerNotification) => {
    if (!item.isRead) {
      markReadMutation.mutate(item._id);
    }

    const { data: itemData } = item;
    if (itemData?.orderId) {
      router.push(`/orders/${itemData.orderId}` as any);
      return;
    }
    if (itemData?.slug) {
      router.push(`/product/${itemData.slug}` as any);
      return;
    }
    if (itemData?.ticketId) {
      router.push(`/support/${itemData.ticketId}` as any);
      return;
    }
    if (itemData?.screen === 'cart') {
      router.push('/(tabs)/cart');
      return;
    }
    if (itemData?.screen === 'shop') {
      router.push('/(tabs)/shop');
      return;
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;
    markAllReadMutation.mutate();
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const renderItem = ({ item }: { item: CustomerNotification }) => {
    const visuals = getNotificationVisuals(item.type);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => handleNotificationPress(item)}
        style={[styles.card, !item.isRead && styles.unreadCard]}
      >
        {/* Unread Left Indicator Bar */}
        {!item.isRead && <View style={styles.unreadAccentBar} />}

        <View style={styles.cardHeaderRow}>
          {/* Visual Icon Bubble */}
          <View style={[styles.iconBubble, { backgroundColor: visuals.bgColor }]}>
            {visuals.icon}
          </View>

          {/* Title & Badge */}
          <View style={styles.contentCol}>
            <View style={styles.titleRow}>
              <Text
                style={[styles.titleText, !item.isRead && styles.unreadTitleText]}
                numberOfLines={1}
                allowFontScaling={false}
              >
                {item.title}
              </Text>
              {!item.isRead && <View style={styles.blueDot} />}
            </View>

            <Text style={styles.messageText} numberOfLines={2} allowFontScaling={false}>
              {item.message}
            </Text>

            <View style={styles.footerRow}>
              <View style={[styles.typeBadge, { borderColor: visuals.badgeColor }]}>
                <Text
                  style={[styles.typeBadgeText, { color: visuals.badgeColor }]}
                  allowFontScaling={false}
                >
                  {visuals.badgeLabel}
                </Text>
              </View>

              <Text style={styles.timeAgoText} allowFontScaling={false}>
                {formatTimeAgo(item.createdAt)}
              </Text>
            </View>
          </View>

          {/* Delete Action Button */}
          <TouchableOpacity
            style={styles.deleteBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => handleDelete(item._id)}
          >
            <Trash2 size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaScreen edges={['top', 'bottom']} backgroundColor="#f8fafc">
      <ResponsiveContainer style={{ flex: 1 }}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => safeGoBack(router, '/(tabs)')}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} allowFontScaling={false}>
              Activity Center
            </Text>
            {unreadCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText} allowFontScaling={false}>
                  {unreadCount} new
                </Text>
              </View>
            )}
          </View>

          {/* Mark All Read Button */}
          <TouchableOpacity
            onPress={handleMarkAllRead}
            disabled={unreadCount === 0 || markAllReadMutation.isPending}
            style={[styles.markAllBtn, unreadCount === 0 && { opacity: 0.4 }]}
          >
            <CheckCheck size={18} color={unreadCount > 0 ? '#4f46e5' : '#94a3b8'} />
            <Text
              style={[
                styles.markAllText,
                { color: unreadCount > 0 ? '#4f46e5' : '#94a3b8' },
              ]}
              allowFontScaling={false}
            >
              Read all
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Chips Bar */}
        <View style={styles.filterBar}>
          {FILTER_TABS.map((tab) => {
            const isSelected = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveFilter(tab.key)}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}
                  allowFontScaling={false}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Notifications List */}
        {isLoading && !isRefetching ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.loadingText} allowFontScaling={false}>
              Loading activity...
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listContent,
              notifications.length === 0 && { flex: 1 },
            ]}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#4f46e5" />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Bell size={42} color="#94a3b8" />
                </View>
                <Text style={styles.emptyTitle} allowFontScaling={false}>
                  You're all caught up!
                </Text>
                <Text style={styles.emptySubtitle} allowFontScaling={false}>
                  No notifications found under this filter. Order milestones, delivery updates, and
                  promotions will appear here.
                </Text>
                <TouchableOpacity
                  onPress={() => router.replace('/(tabs)/shop')}
                  style={styles.exploreBtn}
                  activeOpacity={0.8}
                >
                  <ShoppingBag size={18} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.exploreBtnText} allowFontScaling={false}>
                    Explore Store Deals
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </ResponsiveContainer>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerBadge: {
    marginLeft: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  filterChipActive: {
    backgroundColor: '#4f46e5',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    overflow: 'hidden',
  },
  unreadCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e0e7ff',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  unreadAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#4f46e5',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  unreadTitleText: {
    fontWeight: '700',
    color: '#0f172a',
  },
  blueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4f46e5',
    marginLeft: 6,
  },
  messageText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timeAgoText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 6,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 24,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  exploreBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
