import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Modal,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Store,
  Sparkles,
  PackageOpen,
} from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { useVendorStorefront, useVendorProducts } from '../../hooks/useVendor';
import { VendorStoreHeader, StoreTabKey } from '../../components/vendor/VendorStoreHeader';
import { VendorReviewsList } from '../../components/vendor/VendorReviewsList';
import { VendorInfoTab } from '../../components/vendor/VendorInfoTab';
import { ProductCard } from '../../components/catalog/ProductCard';
import { safeGoBack } from '../../utils/safeNavigation';
import { VendorStoreQueryParams } from '../../types/vendor';
import { Product } from '../../types/catalog';
import { Image } from 'expo-image';
import { resolveUrl } from '../../utils/resolveUrl';

const SORT_OPTIONS: Array<{ id: NonNullable<VendorStoreQueryParams['sortBy']>; label: string }> = [
  { id: 'newest', label: 'Newest Arrivals' },
  { id: 'best_selling', label: 'Best Selling' },
  { id: 'highest_rated', label: 'Highest Rated' },
  { id: 'price_low', label: 'Price: Low to High' },
  { id: 'price_high', label: 'Price: High to Low' },
  { id: 'discount', label: 'Biggest Discount' },
];

export default function VendorStorefrontScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [activeTab, setActiveTab] = useState<StoreTabKey>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSort, setSelectedSort] = useState<NonNullable<VendorStoreQueryParams['sortBy']>>('newest');
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);

  // Storefront meta + showcase rows
  const {
    data: storefront,
    isLoading: isStorefrontLoading,
    refetch: refetchStorefront,
    isRefetching: isStorefrontRefetching,
    error: storefrontError,
  } = useVendorStorefront(slug);

  // Filtered store catalog
  const queryParams: VendorStoreQueryParams = useMemo(() => {
    return {
      search: searchQuery.trim() || undefined,
      category: selectedCategory || undefined,
      sortBy: selectedSort,
      limit: 40,
    };
  }, [searchQuery, selectedCategory, selectedSort]);

  const {
    data: productsData,
    isLoading: isProductsLoading,
    refetch: refetchProducts,
    isRefetching: isProductsRefetching,
  } = useVendorProducts(slug, queryParams);

  const vendor = storefront?.vendor;
  const isFollowing = storefront?.isFollowing ?? false;
  const collections = storefront?.collections || [];
  const products = productsData?.products || [];

  const handleRefresh = async () => {
    await Promise.all([refetchStorefront(), refetchProducts()]);
  };

  const isRefreshing = isStorefrontRefetching || isProductsRefetching;

  // Available categories from vendor profile or catalog items
  const storeCategories = useMemo(() => {
    const list = new Set<string>();
    if (vendor?.storeCategories) {
      vendor.storeCategories.forEach((c) => list.add(c));
    }
    products.forEach((p) => {
      if (p.category) list.add(p.category);
    });
    return Array.from(list);
  }, [vendor, products]);

  if (isStorefrontLoading && !storefront) {
    return (
      <SafeAreaScreen style={styles.screen}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => safeGoBack(router, '/(tabs)')}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle} allowFontScaling={false}>
            Storefront
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText} allowFontScaling={false}>
            Loading store...
          </Text>
        </View>
      </SafeAreaScreen>
    );
  }

  if (storefrontError || !vendor) {
    return (
      <SafeAreaScreen style={styles.screen}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => safeGoBack(router, '/(tabs)')}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle} allowFontScaling={false}>
            Storefront
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerBox}>
          <Store size={48} color="#ef4444" style={{ marginBottom: 12 }} />
          <Text style={styles.errorTitle} allowFontScaling={false}>
            Store Not Found
          </Text>
          <Text style={styles.errorSubtitle} allowFontScaling={false}>
            This seller store is either inactive, undergoing review, or does not exist.
          </Text>
          <TouchableOpacity
            onPress={() => safeGoBack(router, '/(tabs)')}
            style={styles.errorBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.errorBtnText} allowFontScaling={false}>
              Explore Marketplace
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaScreen>
    );
  }

  const selectedSortLabel =
    SORT_OPTIONS.find((s) => s.id === selectedSort)?.label || 'Sort By';

  return (
    <SafeAreaScreen style={styles.screen}>
      {/* Sticky Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => safeGoBack(router, '/(tabs)')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>

        <Text style={styles.topBarTitle} allowFontScaling={false} numberOfLines={1}>
          {vendor.vendorName}
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#4f46e5']}
          />
        }
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Hero Header Card with Tabs */}
        <VendorStoreHeader
          vendor={vendor}
          isFollowing={isFollowing}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          collectionsCount={collections.length}
        />

        {/* TAB 1: PRODUCTS */}
        {activeTab === 'products' && (
          <View style={styles.tabContent}>
            {/* Search and Sort Toolbar */}
            <View style={styles.toolbar}>
              <View style={styles.searchWrap}>
                <Search size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={`Search in ${vendor.vendorName}...`}
                  placeholderTextColor="#94a3b8"
                  style={styles.searchInput}
                  allowFontScaling={false}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <X size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                onPress={() => setIsSortModalVisible(true)}
                style={styles.sortButton}
                activeOpacity={0.7}
              >
                <ArrowUpDown size={16} color="#4f46e5" />
              </TouchableOpacity>
            </View>

            {/* Category Filter Chips */}
            {storeCategories.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryChipsScroll}
              >
                <TouchableOpacity
                  onPress={() => setSelectedCategory(null)}
                  style={[
                    styles.catChip,
                    selectedCategory === null && styles.catChipActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    allowFontScaling={false}
                    style={[
                      styles.catChipText,
                      selectedCategory === null && styles.catChipTextActive,
                    ]}
                  >
                    All Items
                  </Text>
                </TouchableOpacity>

                {storeCategories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setSelectedCategory(isActive ? null : cat)}
                      style={[styles.catChip, isActive && styles.catChipActive]}
                      activeOpacity={0.7}
                    >
                      <Text
                        allowFontScaling={false}
                        style={[
                          styles.catChipText,
                          isActive && styles.catChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Active Sort Pill */}
            <View style={styles.activeFilterRow}>
              <Text style={styles.activeFilterCount} allowFontScaling={false}>
                {products.length} product{products.length !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity
                onPress={() => setIsSortModalVisible(true)}
                style={styles.sortPill}
                activeOpacity={0.7}
              >
                <Text style={styles.sortPillText} allowFontScaling={false}>
                  Sorted by: <Text style={{ fontWeight: '700', color: '#4f46e5' }}>{selectedSortLabel}</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Product Grid */}
            {isProductsLoading && products.length === 0 ? (
              <View style={styles.productsLoadingBox}>
                <ActivityIndicator size="small" color="#4f46e5" />
                <Text style={styles.productsLoadingText} allowFontScaling={false}>
                  Updating catalog...
                </Text>
              </View>
            ) : products.length === 0 ? (
              <View style={styles.emptyCatalogBox}>
                <PackageOpen size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyCatalogTitle} allowFontScaling={false}>
                  No Products Found
                </Text>
                <Text style={styles.emptyCatalogSubtitle} allowFontScaling={false}>
                  {searchQuery || selectedCategory
                    ? 'Try clearing your search keyword or selected category.'
                    : 'This store currently has no active products listed.'}
                </Text>
                {(searchQuery || selectedCategory) && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      setSelectedCategory(null);
                    }}
                    style={styles.resetFilterBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.resetFilterBtnText} allowFontScaling={false}>
                      Clear Filters
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.productGrid}>
                {products.map((item) => (
                  <View key={item._id} style={styles.productGridItem}>
                    <ProductCard product={item} />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: COLLECTIONS */}
        {activeTab === 'collections' && (
          <View style={styles.tabContent}>
            {collections.length === 0 ? (
              <View style={styles.emptyCatalogBox}>
                <Sparkles size={44} color="#cbd5e1" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyCatalogTitle} allowFontScaling={false}>
                  No Featured Collections
                </Text>
                <Text style={styles.emptyCatalogSubtitle} allowFontScaling={false}>
                  This seller has not grouped their catalog into themed collections yet.
                </Text>
              </View>
            ) : (
              <View style={styles.collectionsGrid}>
                {collections.map((coll) => {
                  const imageUri = resolveUrl(coll.imageUrl);
                  return (
                    <TouchableOpacity
                      key={coll._id}
                      onPress={() => {
                        setSelectedCategory(coll.title);
                        setActiveTab('products');
                      }}
                      style={styles.collectionCard}
                      activeOpacity={0.85}
                    >
                      <View style={styles.collectionImageWrap}>
                        {imageUri ? (
                          <Image source={{ uri: imageUri }} style={styles.collectionImage} contentFit="cover" />
                        ) : (
                          <View style={styles.collectionFallbackImg}>
                            <Sparkles size={28} color="#ffffff" />
                          </View>
                        )}
                        <View style={styles.collectionOverlay} />
                        <View style={styles.collectionTextWrap}>
                          <Text style={styles.collectionTitle} allowFontScaling={false}>
                            {coll.title}
                          </Text>
                          {coll.productCount ? (
                            <Text style={styles.collectionCount} allowFontScaling={false}>
                              {coll.productCount} Products
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* TAB 3: REVIEWS */}
        {activeTab === 'reviews' && (
          <VendorReviewsList storeSlug={vendor.storeSlug} />
        )}

        {/* TAB 4: ABOUT */}
        {activeTab === 'about' && (
          <VendorInfoTab vendor={vendor} />
        )}
      </ScrollView>

      {/* Sort Modal */}
      <Modal
        visible={isSortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSortModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsSortModalVisible(false)}
        >
          <View style={styles.sortModalCard}>
            <View style={styles.sortModalHeader}>
              <Text style={styles.sortModalTitle} allowFontScaling={false}>
                Sort Store Catalog
              </Text>
              <TouchableOpacity
                onPress={() => setIsSortModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {SORT_OPTIONS.map((opt) => {
              const isSelected = selectedSort === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => {
                    setSelectedSort(opt.id);
                    setIsSortModalVisible(false);
                  }}
                  style={[styles.sortOptionRow, isSelected && styles.sortOptionSelected]}
                  activeOpacity={0.7}
                >
                  <Text
                    allowFontScaling={false}
                    style={[styles.sortOptionText, isSelected && styles.sortOptionTextSelected]}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.radioDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
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
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  errorBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  errorBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  tabContent: {
    paddingTop: 14,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },
  searchWrap: {
    flex: 1,
    height: 42,
    backgroundColor: '#ffffff',
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
  sortButton: {
    width: 42,
    height: 42,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 10,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  catChipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  catChipTextActive: {
    color: '#ffffff',
  },
  activeFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  activeFilterCount: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  sortPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  sortPillText: {
    fontSize: 11,
    color: '#64748b',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  productGridItem: {
    width: '50%',
    padding: 4,
  },
  productsLoadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 8,
  },
  productsLoadingText: {
    fontSize: 13,
    color: '#64748b',
  },
  emptyCatalogBox: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyCatalogTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptyCatalogSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  resetFilterBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#eef2ff',
    borderRadius: 10,
  },
  resetFilterBtnText: {
    color: '#4f46e5',
    fontWeight: '700',
    fontSize: 13,
  },
  collectionsGrid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  collectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 140,
  },
  collectionImageWrap: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  collectionImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  collectionFallbackImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#312e81',
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  collectionTextWrap: {
    padding: 16,
  },
  collectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 2,
  },
  collectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sortModalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  sortModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sortModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  sortOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  sortOptionSelected: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  sortOptionText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  sortOptionTextSelected: {
    color: '#4f46e5',
    fontWeight: '700',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4f46e5',
  },
});
