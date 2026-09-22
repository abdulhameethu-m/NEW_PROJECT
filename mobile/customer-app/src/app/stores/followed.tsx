import React from 'react';
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
import { ChevronLeft, Store, Compass, LogIn } from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { useFollowedStores } from '../../hooks/useVendor';
import { useAuthStore } from '../../stores/authStore';
import { FollowedStoreCard } from '../../components/vendor/FollowedStoreCard';
import { safeGoBack } from '../../utils/safeNavigation';

export default function FollowedStoresScreen() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'AUTHENTICATED';

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useFollowedStores();

  const stores = data?.stores || [];

  if (!isAuthenticated) {
    return (
      <SafeAreaScreen style={styles.screen}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => safeGoBack(router, '/(tabs)/profile')}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle} allowFontScaling={false}>
            Followed Stores
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.centerBox}>
          <Store size={54} color="#94a3b8" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle} allowFontScaling={false}>
            Sign In to View Followed Stores
          </Text>
          <Text style={styles.emptySubtitle} allowFontScaling={false}>
            Follow your favorite marketplace brands and stores to stay notified of new arrivals, exclusive discounts, and sales.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            style={styles.primaryBtn}
            activeOpacity={0.8}
          >
            <LogIn size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText} allowFontScaling={false}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen style={styles.screen}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => safeGoBack(router, '/(tabs)/profile')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>

        <Text style={styles.topBarTitle} allowFontScaling={false}>
          Followed Stores
        </Text>

        <TouchableOpacity
          onPress={() => router.push('/stores' as any)}
          style={styles.discoverBtn}
          activeOpacity={0.7}
        >
          <Compass size={18} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText} allowFontScaling={false}>
            Loading followed stores...
          </Text>
        </View>
      ) : stores.length === 0 ? (
        <View style={styles.centerBox}>
          <Store size={54} color="#cbd5e1" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle} allowFontScaling={false}>
            No Followed Stores Yet
          </Text>
          <Text style={styles.emptySubtitle} allowFontScaling={false}>
            You haven't followed any stores yet. Discover verified marketplace merchants and follow them for instant updates!
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/stores' as any)}
            style={styles.primaryBtn}
            activeOpacity={0.8}
          >
            <Compass size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText} allowFontScaling={false}>
              Explore Marketplace Stores
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item, index) => item.vendor?._id || String(index)}
          renderItem={({ item }) => <FollowedStoreCard item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
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
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    textAlign: 'center',
  },
  discoverBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    fontWeight: '500',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
