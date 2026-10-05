import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Gift, Tag, Plus, ArrowRight } from 'lucide-react-native';
import { ResponsiveContainer } from '../layout/ResponsiveContainer';
import { ProductCard } from '../catalog/ProductCard';
import { Product } from '../../types/catalog';
import { resolveUrl } from '../../utils/resolveUrl';

interface HomeComboDealProps {
  title?: string;
  comboTitle?: string;
  comboSubtitle?: string;
  badgeText?: string;
  products: Product[];
  comboDiscount?: number;
  comboBanner?: string;
  comboLayout?: 'HERO_BUNDLE' | 'PRODUCT_GRID' | 'COMPACT_STRIP';
  showSavings?: boolean;
  ctaText?: string;
  ctaUrl?: string;
  isLoading?: boolean;
}

export const HomeComboDeal = ({
  title = 'Bundle Deals',
  comboTitle = 'Bundle & Save',
  comboSubtitle,
  badgeText = 'Bundle deal',
  products = [],
  comboDiscount = 10,
  comboBanner,
  comboLayout = 'HERO_BUNDLE',
  showSavings = true,
  ctaText = 'View combo',
  ctaUrl,
  isLoading = false,
}: HomeComboDealProps) => {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  const handleCta = () => {
    if (ctaUrl?.startsWith('/')) router.push(ctaUrl as any);
    else router.push('/(tabs)/shop' as any);
  };

  if (isLoading) {
    return (
      <ResponsiveContainer className="py-4">
        <View style={{ height: 200, borderRadius: 16, backgroundColor: '#e2e8f0' }} />
      </ResponsiveContainer>
    );
  }

  if (!products || products.length === 0) return null;

  const bannerUrl = resolveUrl(comboBanner);
  const totalPrice = products.reduce((sum, p) => sum + (p.price || 0), 0);
  const savings = (totalPrice * comboDiscount) / 100;

  const renderHeroBundle = () => (
    <View style={styles.heroBundle}>
      {/* Banner */}
      <View style={styles.heroBanner}>
        {bannerUrl ? (
          <>
            <Image source={bannerUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1e3a5f' }]} />
        )}
        <View style={styles.heroBannerContent}>
          {badgeText ? (
            <View style={styles.badge}>
              <Tag size={11} color="#fff" />
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          ) : null}
          <Text style={styles.heroTitle}>{comboTitle}</Text>
          {comboSubtitle ? <Text style={styles.heroSubtitle}>{comboSubtitle}</Text> : null}
          {showSavings && savings > 0 && (
            <Text style={styles.savingsText}>Save ₹{savings.toFixed(0)}</Text>
          )}
          <Pressable onPress={handleCta} style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>{ctaText}</Text>
            <ArrowRight size={14} color="#1e293b" />
          </Pressable>
        </View>
      </View>

      {/* Products Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsRow}
      >
        {products.map((product, i) => (
          <React.Fragment key={product._id}>
            <View style={[styles.productItem, { width: screenWidth * 0.38 }]}>
              <ProductCard product={product} />
            </View>
            {i < products.length - 1 && (
              <View style={styles.plusIcon}>
                <Plus size={16} color="#64748b" />
              </View>
            )}
          </React.Fragment>
        ))}
      </ScrollView>
    </View>
  );

  const renderCompactStrip = () => (
    <View style={styles.compactStrip}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1e3a5f' }]} />
      {bannerUrl && (
        <>
          <Image source={bannerUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
        </>
      )}
      <View style={styles.compactContent}>
        <Gift size={20} color="#fbbf24" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.compactTitle}>{comboTitle}</Text>
          {comboDiscount > 0 && (
            <Text style={styles.compactDiscount}>{comboDiscount}% OFF on bundle</Text>
          )}
        </View>
        <Pressable onPress={handleCta} style={styles.compactCta}>
          <Text style={styles.compactCtaText}>{ctaText}</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderProductGrid = () => (
    <View>
      <View style={styles.gridHeader}>
        <Gift size={18} color="#1e293b" />
        <Text style={styles.gridTitle}>{comboTitle}</Text>
        {showSavings && savings > 0 && (
          <View style={styles.gridBadge}>
            <Text style={styles.gridBadgeText}>-{comboDiscount}%</Text>
          </View>
        )}
      </View>
      <View style={styles.gridProducts}>
        {products.map((product) => (
          <View key={product._id} style={{ width: '48%' }}>
            <ProductCard product={product} />
          </View>
        ))}
      </View>
      <Pressable onPress={handleCta} style={styles.gridCta}>
        <Text style={styles.gridCtaText}>{ctaText}</Text>
      </Pressable>
    </View>
  );

  return (
    <ResponsiveContainer className="py-2 mb-2" withPadding={false}>
      <View className="px-4 mb-2">
        <Text className="text-lg font-bold text-slate-900 dark:text-white">{title}</Text>
      </View>
      <View style={{ paddingHorizontal: 12 }}>
        {comboLayout === 'COMPACT_STRIP'
          ? renderCompactStrip()
          : comboLayout === 'PRODUCT_GRID'
          ? renderProductGrid()
          : renderHeroBundle()}
      </View>
    </ResponsiveContainer>
  );
};

const styles = StyleSheet.create({
  heroBundle: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  heroBanner: {
    height: 160,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroBannerContent: {
    padding: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: 6,
  },
  savingsText: {
    color: '#86efac',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  ctaButtonText: {
    color: '#1e293b',
    fontSize: 13,
    fontWeight: '700',
  },
  productsRow: {
    padding: 12,
    gap: 4,
    alignItems: 'center',
  },
  productItem: {
    minWidth: 140,
  },
  plusIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  // COMPACT
  compactStrip: {
    height: 72,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  compactContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  compactTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  compactDiscount: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
  },
  compactCta: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  compactCtaText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  // GRID
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  gridTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  gridBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  gridBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  gridProducts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridCta: {
    marginTop: 12,
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  gridCtaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
