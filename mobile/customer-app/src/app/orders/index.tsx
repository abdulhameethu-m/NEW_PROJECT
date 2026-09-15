import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ShoppingBag, PackageX } from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { useOrders } from '../../hooks/useOrders';
import { OrderCard } from '../../components/orders/OrderCard';
import { Order } from '../../types/order';

const FILTER_TABS = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export default function OrdersListScreen() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState('ALL');

  // Backend supports status filtering directly.
  // For ACTIVE tab, we map to Pending/Shipped or filter client-side for immediate responsive experience.
  const { data, isLoading, isRefetching, refetch } = useOrders(undefined, 1, 50);

  const orders = useMemo(() => {
    const list = data?.orders || [];
    if (selectedTab === 'ALL') return list;
    if (selectedTab === 'ACTIVE') {
      return list.filter((o) => {
        const s = (o.status || '').toLowerCase();
        return ['pending', 'placed', 'packed', 'shipped', 'out for delivery'].includes(s);
      });
    }
    if (selectedTab === 'DELIVERED') {
      return list.filter((o) => (o.status || '').toLowerCase() === 'delivered');
    }
    if (selectedTab === 'CANCELLED') {
      return list.filter((o) => (o.status || '').toLowerCase() === 'cancelled');
    }
    return list;
  }, [data?.orders, selectedTab]);

  const handleOrderPress = (order: Order) => {
    router.push({
      pathname: '/orders/[id]' as any,
      params: { id: order._id },
    });
  };

  const renderEmptyState = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBg}>
          <PackageX size={44} color="#94a3b8" />
        </View>
        <Text style={styles.emptyTitle} allowFontScaling={false}>
          No Orders Found
        </Text>
        <Text style={styles.emptySubtitle} allowFontScaling={false}>
          {selectedTab === 'ALL'
            ? "You haven't placed any orders yet. Discover great deals in our shop!"
            : `You don't have any ${selectedTab.toLowerCase()} orders at the moment.`}
        </Text>
        <TouchableOpacity
          style={styles.shopNowBtn}
          onPress={() => router.push('/(tabs)/shop')}
          activeOpacity={0.85}
        >
          <ShoppingBag size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.shopNowBtnText} allowFontScaling={false}>
            Start Shopping
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaScreen style={styles.screen}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} allowFontScaling={false}>
          My Orders
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {FILTER_TABS.map((tab) => {
          const isSelected = selectedTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabBtn,
                isSelected && styles.tabBtnSelected,
              ]}
              onPress={() => setSelectedTab(tab.id)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  isSelected && styles.tabBtnTextSelected,
                ]}
                allowFontScaling={false}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Orders List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText} allowFontScaling={false}>
            Loading your orders...
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <OrderCard order={item} onPress={() => handleOrderPress(item)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={['#4f46e5']}
              tintColor="#4f46e5"
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: '#f1f5f9',
  },
  tabBtnSelected: {
    backgroundColor: '#4f46e5',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBtnTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 10,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  shopNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  shopNowBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
