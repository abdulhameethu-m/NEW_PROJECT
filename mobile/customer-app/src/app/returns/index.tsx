import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ChevronLeft, RotateCcw, ChevronRight, Package, Calendar } from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { useCustomerReturns } from '../../hooks/useReturns';
import { ReturnStatusBadge } from '../../components/returns/ReturnStatusBadge';
import { ReturnRequest } from '../../types/return';

type FilterTab = 'ALL' | 'ACTIVE' | 'REFUNDED' | 'REJECTED';

export default function ReturnsListScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  const { data, isLoading, refetch, isRefetching } = useCustomerReturns();
  const returns = data?.returns || [];

  const filteredReturns = useMemo(() => {
    if (activeTab === 'ALL') return returns;
    if (activeTab === 'ACTIVE') {
      return returns.filter((r) =>
        [
          'REQUESTED',
          'ADMIN_REVIEW',
          'ADMIN_APPROVED',
          'RETURN_PICKUP_PENDING',
          'RETURN_IN_TRANSIT',
          'VENDOR_RECEIVED',
          'VENDOR_INSPECTION',
          'ACCEPTED',
          'REFUND_PENDING',
          'REFUND_INITIATED',
          'VENDOR_DISPUTED',
          'ADMIN_DISPUTE_REVIEW',
        ].includes(r.status)
      );
    }
    if (activeTab === 'REFUNDED') {
      return returns.filter((r) => r.status === 'REFUNDED');
    }
    if (activeTab === 'REJECTED') {
      return returns.filter((r) => ['ADMIN_REJECTED', 'RETURN_REJECTED'].includes(r.status));
    }
    return returns;
  }, [returns, activeTab]);

  const renderReturnCard = ({ item }: { item: ReturnRequest }) => {
    const orderNum =
      typeof item.orderId === 'object' ? item.orderId.orderNumber : item.orderId;
    const requestedDate = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

    const refundVal = item.refundAmount ?? item.unitPrice * (item.quantity || 1);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/returns/${item._id}` as any)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderNumber} allowFontScaling={false}>
              Order #{orderNum || item._id.slice(-6)}
            </Text>
            {requestedDate ? (
              <View style={styles.dateRow}>
                <Calendar size={11} color="#94a3b8" style={{ marginRight: 4 }} />
                <Text style={styles.dateText} allowFontScaling={false}>
                  {requestedDate}
                </Text>
              </View>
            ) : null}
          </View>
          <ReturnStatusBadge status={item.status} size="sm" />
        </View>

        <View style={styles.divider} />

        <View style={styles.productRow}>
          <View style={styles.imageWrapper}>
            {item.productImage ? (
              <Image source={{ uri: item.productImage }} style={styles.image} contentFit="cover" />
            ) : (
              <Package size={22} color="#94a3b8" />
            )}
          </View>

          <View style={styles.productDetails}>
            <Text style={styles.productName} numberOfLines={1} allowFontScaling={false}>
              {item.productName || 'Product'}
            </Text>
            <Text style={styles.reasonText} allowFontScaling={false}>
              Reason: {item.reasonCode.replace(/_/g, ' ')}
            </Text>
            <Text style={styles.refundText} allowFontScaling={false}>
              Refund: ₹{refundVal.toLocaleString('en-IN')}
            </Text>
          </View>

          <ChevronRight size={18} color="#94a3b8" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaScreen style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} allowFontScaling={false}>
          Returns & Refunds
        </Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(['ALL', 'ACTIVE', 'REFUNDED', 'REJECTED'] as FilterTab[]).map((tab) => {
          const isSelected = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, isSelected && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.tabBtnText, isSelected && styles.tabBtnTextActive]}
                allowFontScaling={false}
              >
                {tab === 'ALL'
                  ? 'All'
                  : tab === 'ACTIVE'
                  ? 'Active'
                  : tab === 'REFUNDED'
                  ? 'Refunded'
                  : 'Rejected'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText} allowFontScaling={false}>
            Loading return requests...
          </Text>
        </View>
      ) : filteredReturns.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBg}>
            <RotateCcw size={36} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle} allowFontScaling={false}>
            No Returns Found
          </Text>
          <Text style={styles.emptySubtitle} allowFontScaling={false}>
            {activeTab === 'ALL'
              ? 'You have not submitted any return or replacement requests yet.'
              : `You have no ${activeTab.toLowerCase()} return requests at this time.`}
          </Text>
          <TouchableOpacity
            style={styles.ordersBtn}
            onPress={() => router.push('/orders' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.ordersBtnText} allowFontScaling={false}>
              View Your Orders
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredReturns}
          keyExtractor={(item) => item._id}
          renderItem={renderReturnCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#4f46e5"
              colors={['#4f46e5']}
            />
          }
        />
      )}
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
    justifyContent: 'space-between',
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
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  tabBtnActive: {
    backgroundColor: '#4f46e5',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageWrapper: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 6,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  reasonText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  refundText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  ordersBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  ordersBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
