import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import {
  ShieldCheck,
  Star,
  Package,
  Users,
  Share2,
  Calendar,
  Building2,
  MapPin,
} from 'lucide-react-native';
import { VendorStore } from '../../types/vendor';
import { StoreFollowButton } from './StoreFollowButton';
import { resolveUrl } from '../../utils/resolveUrl';

export type StoreTabKey = 'products' | 'collections' | 'reviews' | 'about';

interface VendorStoreHeaderProps {
  vendor: VendorStore;
  isFollowing: boolean;
  activeTab: StoreTabKey;
  onTabChange: (tab: StoreTabKey) => void;
  collectionsCount?: number;
}

export const VendorStoreHeader: React.FC<VendorStoreHeaderProps> = ({
  vendor,
  isFollowing,
  activeTab,
  onTabChange,
  collectionsCount = 0,
}) => {
  const bannerUri = resolveUrl(vendor.bannerUrl);
  const logoUri = resolveUrl(vendor.logoUrl);

  const handleShare = async () => {
    try {
      await Share.share({
        title: vendor.vendorName,
        message: `Check out ${vendor.vendorName} on Uchooseme! Discover their exclusive products and offers: https://uchooseme.com/vendor/${vendor.storeSlug}`,
      });
    } catch {
      // Ignored
    }
  };

  const formattedFollowers = (vendor.followersCount || 0).toLocaleString('en-IN');
  const formattedProducts = (vendor.productsCount || 0).toLocaleString('en-IN');
  const ratingValue = (vendor.rating || 0).toFixed(1);

  const locationText =
    typeof vendor.address === 'string'
      ? vendor.address
      : vendor.address
      ? [vendor.address.city, vendor.address.state].filter(Boolean).join(', ')
      : null;

  return (
    <View style={styles.container}>
      {/* Hero Banner */}
      <View style={styles.bannerContainer}>
        {bannerUri ? (
          <Image
            source={{ uri: bannerUri }}
            style={styles.bannerImage}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View style={styles.fallbackBanner}>
            <View style={styles.bannerCircle1} />
            <View style={styles.bannerCircle2} />
          </View>
        )}
      </View>

      {/* Main Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.avatarRow}>
          {/* Store Logo */}
          <View style={styles.logoContainer}>
            {logoUri ? (
              <Image
                source={{ uri: logoUri }}
                style={styles.logoImage}
                contentFit="contain"
                transition={200}
              />
            ) : (
              <View style={styles.fallbackLogo}>
                <Text style={styles.fallbackLogoText} allowFontScaling={false}>
                  {vendor.vendorName?.substring(0, 2)?.toUpperCase() || 'ST'}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons: Follow & Share */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleShare}
              style={styles.shareBtn}
              activeOpacity={0.75}
            >
              <Share2 size={18} color="#475569" />
            </TouchableOpacity>

            <StoreFollowButton
              storeSlug={vendor.storeSlug}
              isFollowing={isFollowing}
              size="md"
            />
          </View>
        </View>

        {/* Name & Badges */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={styles.vendorName} allowFontScaling={false} numberOfLines={2}>
              {vendor.vendorName}
            </Text>
            {vendor.verified && (
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={14} color="#059669" />
                <Text style={styles.verifiedText} allowFontScaling={false}>
                  Verified
                </Text>
              </View>
            )}
          </View>

          {vendor.companyName && vendor.companyName !== vendor.vendorName ? (
            <View style={styles.companyRow}>
              <Building2 size={13} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.companyText} allowFontScaling={false} numberOfLines={1}>
                {vendor.companyName}
              </Text>
            </View>
          ) : null}

          {locationText ? (
            <View style={styles.locationRow}>
              <MapPin size={13} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.locationText} allowFontScaling={false} numberOfLines={1}>
                {locationText}
              </Text>
            </View>
          ) : null}

          {vendor.storeDescription ? (
            <Text style={styles.description} allowFontScaling={false} numberOfLines={3}>
              {vendor.storeDescription}
            </Text>
          ) : null}
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <View style={styles.metricIconRow}>
              <Star size={15} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.metricValue} allowFontScaling={false}>
                {ratingValue === '0.0' ? 'New' : ratingValue}
              </Text>
            </View>
            <Text style={styles.metricLabel} allowFontScaling={false}>
              {vendor.totalReviews ? `${vendor.totalReviews} reviews` : 'Rating'}
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <View style={styles.metricIconRow}>
              <Users size={15} color="#4f46e5" />
              <Text style={styles.metricValue} allowFontScaling={false}>
                {formattedFollowers}
              </Text>
            </View>
            <Text style={styles.metricLabel} allowFontScaling={false}>
              Followers
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <View style={styles.metricIconRow}>
              <Package size={15} color="#0284c7" />
              <Text style={styles.metricValue} allowFontScaling={false}>
                {formattedProducts}
              </Text>
            </View>
            <Text style={styles.metricLabel} allowFontScaling={false}>
              Products
            </Text>
          </View>

          {vendor.yearsOnPlatform ? (
            <>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <View style={styles.metricIconRow}>
                  <Calendar size={15} color="#10b981" />
                  <Text style={styles.metricValue} allowFontScaling={false}>
                    {vendor.yearsOnPlatform} yr{vendor.yearsOnPlatform > 1 ? 's' : ''}
                  </Text>
                </View>
                <Text style={styles.metricLabel} allowFontScaling={false}>
                  On Platform
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </View>

      {/* Tabs Navigation */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'products' && styles.tabButtonActive]}
          onPress={() => onTabChange('products')}
          activeOpacity={0.7}
        >
          <Text
            allowFontScaling={false}
            style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}
          >
            Products
          </Text>
        </TouchableOpacity>

        {collectionsCount > 0 && (
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'collections' && styles.tabButtonActive]}
            onPress={() => onTabChange('collections')}
            activeOpacity={0.7}
          >
            <Text
              allowFontScaling={false}
              style={[styles.tabText, activeTab === 'collections' && styles.tabTextActive]}
            >
              Collections ({collectionsCount})
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'reviews' && styles.tabButtonActive]}
          onPress={() => onTabChange('reviews')}
          activeOpacity={0.7}
        >
          <Text
            allowFontScaling={false}
            style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}
          >
            Reviews {vendor.totalReviews ? `(${vendor.totalReviews})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'about' && styles.tabButtonActive]}
          onPress={() => onTabChange('about')}
          activeOpacity={0.7}
        >
          <Text
            allowFontScaling={false}
            style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}
          >
            About Store
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
  },
  bannerContainer: {
    height: 150,
    width: '100%',
    backgroundColor: '#e0e7ff',
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  fallbackBanner: {
    width: '100%',
    height: '100%',
    backgroundColor: '#312e81',
    position: 'relative',
    overflow: 'hidden',
  },
  bannerCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#4338ca',
    opacity: 0.5,
    top: -50,
    left: -40,
  },
  bannerCircle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#6366f1',
    opacity: 0.35,
    right: -50,
    bottom: -80,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -42,
    marginBottom: 12,
  },
  logoContainer: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
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
  fallbackLogoText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  vendorName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  companyText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  locationText: {
    fontSize: 12,
    color: '#64748b',
  },
  description: {
    fontSize: 13.5,
    lineHeight: 19,
    color: '#475569',
    marginTop: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#4f46e5',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#4f46e5',
    fontWeight: '700',
  },
});
