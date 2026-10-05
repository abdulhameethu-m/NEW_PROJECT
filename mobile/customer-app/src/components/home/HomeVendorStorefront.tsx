import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Store, Star, CheckCircle, Users } from 'lucide-react-native';
import { ResponsiveContainer } from '../layout/ResponsiveContainer';
import { resolveUrl } from '../../utils/resolveUrl';

interface StorefrontCard {
  _id?: string;
  name?: string;
  storeName?: string;
  displayName?: string;
  logo?: string;
  profilePhoto?: string;
  avatar?: string;
  banner?: string;
  coverBanner?: string;
  description?: string;
  bio?: string;
  category?: string;
  followers?: number;
  productsCount?: number;
  rating?: number;
  isVerified?: boolean;
  isFeatured?: boolean;
  slug?: string;
  username?: string;
}

interface HomeVendorStorefrontProps {
  title?: string;
  items: StorefrontCard[];
  entityType?: 'vendor' | 'influencer';
  displayType?: 'GRID' | 'CAROUSEL';
  cardStyle?: string;
  cardLayout?: string;
  showLogo?: boolean;
  showBanner?: boolean;
  showName?: boolean;
  showDescription?: boolean;
  showFollowersCount?: boolean;
  showProductsCount?: boolean;
  showRating?: boolean;
  showVerifiedBadge?: boolean;
  ctaText?: string;
  isLoading?: boolean;
}

export const HomeVendorStorefront = ({
  title = 'Featured Stores',
  items = [],
  entityType = 'vendor',
  displayType = 'CAROUSEL',
  cardLayout = 'VERTICAL',
  showLogo = true,
  showBanner = true,
  showName = true,
  showDescription = true,
  showFollowersCount = true,
  showProductsCount = true,
  showRating = true,
  showVerifiedBadge = true,
  ctaText = 'Visit Store',
  isLoading = false,
}: HomeVendorStorefrontProps) => {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth * 0.62;
  const isInfluencer = entityType === 'influencer';

  const getNavigationPath = (item: StorefrontCard) => {
    if (isInfluencer) return `/stores/influencer/${item.slug || item.username || item._id}`;
    return `/stores/${item.slug || item._id}`;
  };

  if (isLoading) {
    return (
      <ResponsiveContainer className="py-4">
        <View style={styles.skeletonCard} />
      </ResponsiveContainer>
    );
  }

  if (!items || items.length === 0) return null;

  const renderCard = (item: StorefrontCard, i: number) => {
    const logoUrl = resolveUrl(item.logo || item.profilePhoto || item.avatar);
    const bannerUrl = resolveUrl(item.banner || item.coverBanner);
    const displayName = item.displayName || item.storeName || item.name || 'Store';
    const desc = item.bio || item.description || '';

    return (
      <Pressable
        key={item._id || i}
        style={[styles.card, { width: displayType === 'CAROUSEL' ? cardWidth : '48%' as any }]}
        onPress={() => router.push(getNavigationPath(item) as any)}
      >
        {/* Banner */}
        {showBanner && (
          <View style={styles.bannerWrapper}>
            {bannerUrl ? (
              <Image source={bannerUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: isInfluencer ? '#7c3aed' : '#1e3a5f' }]} />
            )}
            {/* Logo overlay */}
            {showLogo && (
              <View style={[styles.logoContainer, isInfluencer && styles.logoCricle]}>
                {logoUrl ? (
                  <Image source={logoUrl} style={styles.logoImg} contentFit="cover" />
                ) : (
                  <View style={styles.logoFallback}>
                    {isInfluencer ? (
                      <Users size={20} color="#94a3b8" />
                    ) : (
                      <Store size={20} color="#94a3b8" />
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        <View style={styles.cardBody}>
          {/* Name + verified */}
          {showName && (
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
              {showVerifiedBadge && item.isVerified && (
                <CheckCircle size={14} color="#3b82f6" fill="#3b82f6" />
              )}
            </View>
          )}

          {/* Description */}
          {showDescription && desc ? (
            <Text style={styles.description} numberOfLines={2}>{desc}</Text>
          ) : null}

          {/* Stats */}
          <View style={styles.statsRow}>
            {showFollowersCount && item.followers != null && (
              <View style={styles.stat}>
                <Users size={11} color="#64748b" />
                <Text style={styles.statText}>{formatCount(item.followers)}</Text>
              </View>
            )}
            {showProductsCount && item.productsCount != null && (
              <View style={styles.stat}>
                <Store size={11} color="#64748b" />
                <Text style={styles.statText}>{item.productsCount} items</Text>
              </View>
            )}
            {showRating && item.rating != null && (
              <View style={styles.stat}>
                <Star size={11} color="#f59e0b" fill="#f59e0b" />
                <Text style={styles.statText}>{item.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>

          <View style={styles.ctaRow}>
            <Text style={styles.ctaText}>{ctaText} →</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <ResponsiveContainer className="py-4" withPadding={false}>
      <View className="px-4 mb-3 flex-row justify-between items-end">
        <Text className="text-lg font-bold text-slate-900 dark:text-white flex-1 mr-2" numberOfLines={1}>
          {title}
        </Text>
      </View>

      {displayType === 'CAROUSEL' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
        >
          {items.map((item, i) => renderCard(item, i))}
        </ScrollView>
      ) : (
        <View style={styles.gridContent}>
          {items.map((item, i) => renderCard(item, i))}
        </View>
      )}
    </ResponsiveContainer>
  );
};

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const styles = StyleSheet.create({
  carouselContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerWrapper: {
    height: 90,
    position: 'relative',
  },
  logoContainer: {
    position: 'absolute',
    bottom: -20,
    left: 14,
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  logoCricle: {
    borderRadius: 22,
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },
  logoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  cardBody: {
    padding: 14,
    paddingTop: 26,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  description: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  ctaRow: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
  },
  skeletonCard: {
    height: 200,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
});
