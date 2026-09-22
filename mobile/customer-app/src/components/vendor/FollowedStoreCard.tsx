import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ShieldCheck, Star, Users, ChevronRight, ExternalLink } from 'lucide-react-native';
import { FollowedStoreItem } from '../../types/vendor';
import { resolveUrl } from '../../utils/resolveUrl';
import { StoreFollowButton } from './StoreFollowButton';

interface FollowedStoreCardProps {
  item: FollowedStoreItem;
}

export const FollowedStoreCard: React.FC<FollowedStoreCardProps> = ({ item }) => {
  const router = useRouter();
  const vendor = item.vendor;
  const logoUri = resolveUrl(vendor.logoUrl);
  const products = item.latestProducts || [];

  const handleOpenStore = () => {
    router.push(`/stores/${vendor.storeSlug}` as any);
  };

  const handleProductPress = (slug: string) => {
    router.push(`/product/${slug}` as any);
  };

  const ratingText = (vendor.rating || 0).toFixed(1);

  return (
    <View style={styles.card}>
      {/* Card Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={handleOpenStore}
          style={styles.storeInfoTouch}
          activeOpacity={0.7}
        >
          <View style={styles.logoWrap}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logo} contentFit="contain" />
            ) : (
              <View style={styles.fallbackLogo}>
                <Text style={styles.fallbackText} allowFontScaling={false}>
                  {vendor.vendorName?.substring(0, 2)?.toUpperCase() || 'ST'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.titleCol}>
            <View style={styles.nameRow}>
              <Text style={styles.storeName} allowFontScaling={false} numberOfLines={1}>
                {vendor.vendorName}
              </Text>
              {vendor.verified && (
                <ShieldCheck size={14} color="#059669" style={{ marginLeft: 4 }} />
              )}
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Star size={12} color="#f59e0b" fill="#f59e0b" />
                <Text style={styles.metaText} allowFontScaling={false}>
                  {ratingText === '0.0' ? 'New' : ratingText}
                </Text>
              </View>
              <Text style={styles.dot}>•</Text>
              <View style={styles.metaItem}>
                <Users size={12} color="#64748b" />
                <Text style={styles.metaText} allowFontScaling={false}>
                  {(vendor.followersCount || 0).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Following Toggle Button */}
        <StoreFollowButton
          storeSlug={vendor.storeSlug}
          isFollowing={true}
          size="sm"
        />
      </View>

      {/* Latest Products Row */}
      {products.length > 0 && (
        <View style={styles.productsSection}>
          <Text style={styles.productsHeading} allowFontScaling={false}>
            Latest from this store
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productsScroll}
          >
            {products.map((p) => {
              const imageUri = resolveUrl(p.images?.[0]?.url || p.thumbnail);
              return (
                <TouchableOpacity
                  key={p._id}
                  onPress={() => handleProductPress(p.slug)}
                  style={styles.productThumbCard}
                  activeOpacity={0.8}
                >
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.productImg} contentFit="cover" />
                  ) : (
                    <View style={styles.fallbackProductImg} />
                  )}
                  <Text style={styles.productPrice} allowFontScaling={false}>
                    ₹{(p.discountPrice || p.price).toLocaleString('en-IN')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Footer / Visit Store Link */}
      <TouchableOpacity
        onPress={handleOpenStore}
        style={styles.visitStoreBtn}
        activeOpacity={0.7}
      >
        <Text style={styles.visitStoreText} allowFontScaling={false}>
          Visit Storefront
        </Text>
        <ChevronRight size={16} color="#4f46e5" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storeInfoTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  fallbackLogo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  titleCol: {
    marginLeft: 10,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  dot: {
    marginHorizontal: 6,
    color: '#94a3b8',
    fontSize: 10,
  },
  productsSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  productsHeading: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  productsScroll: {
    gap: 8,
  },
  productThumbCard: {
    width: 76,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  productImg: {
    width: 76,
    height: 76,
  },
  fallbackProductImg: {
    width: 76,
    height: 76,
    backgroundColor: '#f1f5f9',
  },
  productPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    paddingVertical: 3,
    backgroundColor: '#ffffff',
  },
  visitStoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  visitStoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4f46e5',
  },
});
