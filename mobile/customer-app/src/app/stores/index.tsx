import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  Search,
  Store,
  ShieldCheck,
  Star,
  Users,
  Package,
  X,
  ChevronRight,
} from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { useAllStores } from '../../hooks/useVendor';
import { VendorStore } from '../../types/vendor';
import { resolveUrl } from '../../utils/resolveUrl';
import { safeGoBack } from '../../utils/safeNavigation';
import { StoreFollowButton } from '../../components/vendor/StoreFollowButton';

export default function StoresDirectoryScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: stores = [],
    isLoading,
    isRefetching,
    refetch,
  } = useAllStores();

  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return stores;
    const q = searchQuery.toLowerCase().trim();
    return stores.filter((s) => {
      const nameMatch = s.vendorName?.toLowerCase().includes(q);
      const companyMatch = s.companyName?.toLowerCase().includes(q);
      const catMatch = s.storeCategories?.some((c) => c.toLowerCase().includes(q));
      return nameMatch || companyMatch || catMatch;
    });
  }, [stores, searchQuery]);

  const renderStoreItem = ({ item }: { item: VendorStore }) => {
    const logoUri = resolveUrl(item.logoUrl);
    const bannerUri = resolveUrl(item.bannerUrl);
    const ratingVal = (item.rating || 0).toFixed(1);

    return (
      <TouchableOpacity
        onPress={() => router.push(`/stores/${item.storeSlug}` as any)}
        style={styles.storeCard}
        activeOpacity={0.85}
      >
        {/* Banner Preview */}
        <View style={styles.cardBanner}>
          {bannerUri ? (
            <Image source={{ uri: bannerUri }} style={styles.bannerImg} contentFit="cover" />
          ) : (
            <View style={styles.bannerFallback}>
              <Store size={28} color="rgba(255,255,255,0.4)" />
            </View>
          )}
        </View>

        {/* Store Content */}
        <View style={styles.cardBody}>
          <View style={styles.cardHeaderRow}>
            {/* Logo */}
            <View style={styles.logoWrap}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logoImg} contentFit="contain" />
              ) : (
                <View style={styles.logoFallback}>
                  <Text style={styles.logoLetter} allowFontScaling={false}>
                    {item.vendorName?.substring(0, 2)?.toUpperCase() || 'ST'}
                  </Text>
                </View>
              )}
            </View>

            {/* Title & Badges */}
            <View style={styles.storeInfoCol}>
              <View style={styles.nameRow}>
                <Text style={styles.storeName} allowFontScaling={false} numberOfLines={1}>
                  {item.vendorName}
                </Text>
                {item.verified && (
                  <ShieldCheck size={14} color="#059669" style={{ marginLeft: 4 }} />
                )}
              </View>

              {item.companyName && item.companyName !== item.vendorName ? (
                <Text style={styles.companyName} allowFontScaling={false} numberOfLines={1}>
                  {item.companyName}
                </Text>
              ) : null}
            </View>

            <ChevronRight size={18} color="#94a3b8" />
          </View>

          {item.storeDescription ? (
            <Text style={styles.description} allowFontScaling={false} numberOfLines={2}>
              {item.storeDescription}
            </Text>
          ) : null}

          {/* Stats Badges */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Star size={12} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.statText} allowFontScaling={false}>
                {ratingVal === '0.0' ? 'New' : ratingVal}
              </Text>
            </View>

            <View style={styles.statChip}>
              <Users size={12} color="#4f46e5" />
              <Text style={styles.statText} allowFontScaling={false}>
                {(item.followersCount || 0).toLocaleString('en-IN')} Followers
              </Text>
            </View>

            {item.productsCount ? (
              <View style={styles.statChip}>
                <Package size={12} color="#0284c7" />
                <Text style={styles.statText} allowFontScaling={false}>
                  {item.productsCount} Products
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaScreen style={styles.screen}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => safeGoBack(router, '/(tabs)')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>

        <Text style={styles.topBarTitle} allowFontScaling={false}>
          Discover Stores
        </Text>

        <View style={{ width: 40 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchInputBox}>
          <Search size={16} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search stores by name, brand, or category..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
            allowFontScaling={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Store Directory List */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText} allowFontScaling={false}>
            Loading marketplace stores...
          </Text>
        </View>
      ) : filteredStores.length === 0 ? (
        <View style={styles.centerBox}>
          <Store size={52} color="#cbd5e1" style={{ marginBottom: 14 }} />
          <Text style={styles.emptyTitle} allowFontScaling={false}>
            No Stores Found
          </Text>
          <Text style={styles.emptySubtitle} allowFontScaling={false}>
            We couldn't find any merchant matching "{searchQuery}".
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredStores}
          keyExtractor={(item) => item._id || item.storeSlug}
          renderItem={renderStoreItem}
          contentContainerStyle={styles.listContainer}
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
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchInputBox: {
    height: 42,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: '#0f172a',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  storeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardBanner: {
    height: 90,
    width: '100%',
    backgroundColor: '#e0e7ff',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
  },
  bannerFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3730a3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    padding: 14,
    paddingTop: 0,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -22,
    marginBottom: 8,
  },
  logoWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },
  logoFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLetter: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  storeInfoCol: {
    marginLeft: 10,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeName: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  companyName: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 17,
    color: '#475569',
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 4,
  },
  statText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    fontWeight: '500',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
});
