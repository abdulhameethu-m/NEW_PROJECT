import React, { useCallback, useState } from 'react';
import { View, ScrollView, RefreshControl, Text } from 'react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { ResponsiveContainer } from '../../components/layout/ResponsiveContainer';
import { useHome } from '../../hooks/useHome';
import { useCategories } from '../../hooks/useCategories';
import { useProducts } from '../../hooks/useProducts';

// Home Components
import { HomeBanner } from '../../components/home/HomeBanner';
import { HomeBannerCarousel } from '../../components/home/HomeBannerCarousel';
import { HomeCategories } from '../../components/home/HomeCategories';
import { HomeFeatured } from '../../components/home/HomeFeatured';
import { HomeHeader } from '../../components/home/HomeHeader';
import { TrustBadges } from '../../components/home/TrustBadges';
import { HomeFlashSale } from '../../components/home/HomeFlashSale';
import { HomeDealsStrip } from '../../components/home/HomeDealsStrip';
import { HomeMasonry } from '../../components/home/HomeMasonry';
import { HomeBrandShowcase } from '../../components/home/HomeBrandShowcase';
import { HomeVendorStorefront } from '../../components/home/HomeVendorStorefront';
import { HomeComboDeal } from '../../components/home/HomeComboDeal';
import { HomeVideoProducts } from '../../components/home/HomeVideoProducts';

import { SearchBar } from '../../components/catalog/SearchBar';
import { useRouter } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();

  // 1. Fetch Dynamic Layout (May be null in dev if unconfigured)
  const { data: layout, isLoading: isLayoutLoading, refetch: refetchLayout } = useHome('mobile');

  // 2. Fetch Categories (Independent fallback query)
  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    refetch: refetchCategories,
    isError: isCategoriesError,
  } = useCategories();

  // 3. Fetch Products (Independent fallback query)
  const {
    data: productsData,
    isLoading: isProductsLoading,
    refetch: refetchProducts,
    isError: isProductsError,
  } = useProducts({ sortBy: 'createdAt', sortOrder: 'desc' });

  const fallbackProducts = productsData?.pages?.[0]?.items?.filter(Boolean) || [];

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchLayout(), refetchCategories(), refetchProducts()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchLayout, refetchCategories, refetchProducts]);

  const handleSearchPress = () => {
    router.push('/search' as any);
  };

  /**
   * Renders a single dynamic layout container based on its containerType.
   * All types from the backend registry are handled here.
   */
  const renderContainer = (container: any, index: number) => {
    const key = `${container._id || container.instanceId || 'container'}-${index}`;
    const cfg = container.config || {};
    const products = container.products || [];
    const title = container.title || '';

    switch (container.containerType) {
      // ─── BANNER types ──────────────────────────────────────────────
      case 'BANNER': {
        const mediaItems = cfg.bannerMedia || [];
        // Single or multi-slide: if multiple, use carousel; if one, use simple banner
        if (mediaItems.length > 1) {
          return (
            <View key={key} className="mb-2">
              <HomeBannerCarousel
                slides={mediaItems}
                autoSlide={cfg.autoSlide !== false}
                slideSpeed={cfg.slideSpeed || 3500}
                showArrows={cfg.showArrows !== false}
                showDots={cfg.showDots !== false}
                overlayOpacity={cfg.overlayOpacity ?? 0.35}
              />
            </View>
          );
        }
        const primary = mediaItems[0] || {};
        return (
          <View key={key} className="mb-4">
            <HomeBanner
              title={primary.heading || cfg.heading || title}
              subtitle={primary.subheading || cfg.subheading}
              imageUrl={primary.mobileImage || primary.desktopImage || primary.url || cfg.bannerImage}
              ctaText={primary.ctaLabel || cfg.ctaButton}
              ctaUrl={primary.ctaUrl || cfg.ctaUrl}
              isLoading={false}
            />
          </View>
        );
      }

      case 'BANNER_CAROUSEL': {
        const mediaItems = cfg.bannerMedia || cfg.slides || [];
        return (
          <View key={key} className="mb-2">
            <HomeBannerCarousel
              slides={mediaItems}
              autoSlide={cfg.autoSlide !== false}
              slideSpeed={cfg.slideSpeed || 3500}
              showArrows={cfg.showArrows !== false}
              showDots={cfg.showDots !== false}
              overlayOpacity={cfg.overlayOpacity ?? 0.35}
            />
          </View>
        );
      }

      case 'SLIDER': {
        const slides = cfg.slides || [];
        return (
          <View key={key} className="mb-2">
            <HomeBannerCarousel
              slides={slides}
              autoSlide={cfg.autoplay !== false}
              showArrows={false}
              showDots={cfg.indicators !== false}
            />
          </View>
        );
      }

      // ─── PRODUCT GRID / CAROUSEL types ────────────────────────────
      case 'FEATURED_PRODUCTS':
      case 'CAROUSEL':
      case 'GRID':
        return (
          <View key={key} className="mb-4">
            <HomeFeatured
              title={title || cfg.featuredHeading}
              products={products}
              isLoading={false}
            />
          </View>
        );

      // ─── CATEGORY SHOWCASE ─────────────────────────────────────────
      case 'CATEGORY_SHOWCASE':
        return (
          <View key={key} className="mb-4">
            <HomeCategories
              categories={container.categories || cfg.categories || []}
              isLoading={false}
            />
          </View>
        );

      // ─── FLASH SALE ────────────────────────────────────────────────
      case 'FLASH_SALE':
        return (
          <View key={key} className="mb-2">
            <HomeFlashSale
              title={title}
              products={products}
              startTime={cfg.startTime}
              endTime={cfg.endTime}
              flashBanner={cfg.flashBanner}
              countdownStyle={cfg.countdownStyle || 'BLOCKS'}
              isLoading={false}
            />
          </View>
        );

      // ─── DEALS STRIP ───────────────────────────────────────────────
      case 'DEALS_STRIP':
        return (
          <View key={key} className="mb-2">
            <HomeDealsStrip
              primaryHeading={cfg.dealPrimaryHeading || title}
              secondaryHeading={cfg.dealSecondaryHeading}
              offerText={cfg.offerText}
              badgeText={cfg.dealBadgeText}
              couponCode={cfg.couponCode}
              ctaText={cfg.dealCtaText || 'Shop Now'}
              ctaUrl={cfg.dealCtaUrl}
              endDate={cfg.offerEndDate}
              layoutVariant={cfg.dealLayoutVariant || 'LEFT_CONTENT_RIGHT_BUTTON'}
              icon={cfg.dealIcon || 'FLASH'}
              gradientColor1={cfg.dealGradientColor1 || '#e11d48'}
              gradientColor2={cfg.dealGradientColor2 || '#f97316'}
              backgroundImage={cfg.dealBackgroundImage}
              textColor={cfg.dealTextColor || '#ffffff'}
              headingColor={cfg.dealHeadingColor || '#ffffff'}
              enableCountdown={cfg.enableCountdown}
              countdownEndDate={cfg.countdownEndDate}
            />
          </View>
        );

      // ─── MASONRY ───────────────────────────────────────────────────
      case 'MASONRY':
        return (
          <View key={key} className="mb-4">
            <HomeMasonry
              title={title}
              products={products}
              mobileColumns={cfg.mobileColumns || 2}
              cardHeights={cfg.cardHeights || 'MIXED'}
              isLoading={false}
            />
          </View>
        );

      // ─── BRAND SHOWCASE ────────────────────────────────────────────
      case 'BRAND_SHOWCASE':
        return (
          <View key={key} className="mb-4">
            <HomeBrandShowcase
              title={title || 'Top Brands'}
              brands={cfg.brands || []}
              brandLogos={cfg.brandLogos || []}
              isLoading={false}
            />
          </View>
        );

      // ─── RECENTLY VIEWED / RECOMMENDED / TRENDING / NEW ARRIVALS / TOP RATED ─
      case 'RECENTLY_VIEWED':
      case 'RECOMMENDED':
      case 'TRENDING':
      case 'NEW_ARRIVALS':
      case 'TOP_RATED':
      case 'VENDOR_SPOTLIGHT': {
        const sectionTitle =
          title ||
          ({
            RECENTLY_VIEWED: 'Recently Viewed',
            RECOMMENDED: 'Recommended For You',
            TRENDING: 'Trending Now',
            NEW_ARRIVALS: 'New Arrivals',
            TOP_RATED: 'Top Rated',
            VENDOR_SPOTLIGHT: 'Vendor Spotlight',
          } as Record<string, string>)[container.containerType] ||
          'Products';

        return products.length > 0 ? (
          <View key={key} className="mb-4">
            <HomeFeatured title={sectionTitle} products={products} isLoading={false} />
          </View>
        ) : null;
      }

      // ─── COMBO DEALS ───────────────────────────────────────────────
      case 'COMBO_DEALS':
        return (
          <View key={key} className="mb-4">
            <HomeComboDeal
              title={title || 'Bundle Deals'}
              comboTitle={cfg.comboTitle || 'Bundle & Save'}
              comboSubtitle={cfg.comboSubtitle}
              badgeText={cfg.comboBadgeText}
              products={products}
              comboDiscount={cfg.comboDiscount ?? 10}
              comboBanner={cfg.comboBanner}
              comboLayout={cfg.comboLayout || 'HERO_BUNDLE'}
              showSavings={cfg.comboShowSavings !== false}
              ctaText={cfg.comboCtaText || 'View combo'}
              ctaUrl={cfg.comboCtaUrl}
              isLoading={false}
            />
          </View>
        );

      // ─── VIDEO PRODUCTS ────────────────────────────────────────────
      case 'VIDEO_PRODUCTS':
        return (
          <View key={key} className="mb-4">
            <HomeVideoProducts
              title={title || 'Shop the Look'}
              videoUrl={cfg.videoUpload}
              products={products}
              autoplay={cfg.autoplay !== false}
              mute={cfg.mute !== false}
              videoPosition={cfg.videoPosition || 'TOP'}
              isLoading={false}
            />
          </View>
        );

      // ─── VENDOR STOREFRONT types ───────────────────────────────────
      case 'VENDOR_STOREFRONT_GRID':
      case 'VENDOR_STOREFRONT_CAROUSEL':
      case 'VENDOR_FEATURED_STORES':
      case 'VENDOR_TRENDING_STORES':
      case 'VENDOR_VERIFIED_STORES':
      case 'VENDOR_NEW_STORES':
      case 'VENDOR_RECOMMENDED_STORES': {
        const items = container.vendors || container.stores || [];
        return items.length > 0 ? (
          <View key={key} className="mb-4">
            <HomeVendorStorefront
              title={
                title ||
                container.containerType
                  .replace('VENDOR_', '')
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (c: string) => c.toUpperCase())
              }
              items={items}
              entityType="vendor"
              displayType={
                container.containerType.includes('CAROUSEL') ? 'CAROUSEL' : cfg.storefrontDisplayType || 'CAROUSEL'
              }
              cardLayout={cfg.storefrontCardLayout}
              showLogo={cfg.showStoreLogo !== false}
              showBanner={cfg.showStoreBanner !== false}
              showName={cfg.showStoreName !== false}
              showDescription={cfg.showStoreDescription !== false}
              showFollowersCount={cfg.showFollowersCount !== false}
              showProductsCount={cfg.showProductsCount !== false}
              showRating={cfg.showStoreRating !== false}
              showVerifiedBadge={cfg.showVerifiedBadge !== false}
              ctaText={cfg.cardCtaText || 'Visit Store'}
              isLoading={false}
            />
          </View>
        ) : null;
      }

      // ─── INFLUENCER STOREFRONT types ───────────────────────────────
      case 'INFLUENCER_STOREFRONT_GRID':
      case 'INFLUENCER_STOREFRONT_CAROUSEL':
      case 'INFLUENCER_FEATURED_CREATORS':
      case 'INFLUENCER_TRENDING_CREATORS':
      case 'INFLUENCER_VERIFIED_CREATORS':
      case 'INFLUENCER_NEW_CREATORS':
      case 'INFLUENCER_RECOMMENDED_CREATORS': {
        const items = container.influencers || container.creators || [];
        return items.length > 0 ? (
          <View key={key} className="mb-4">
            <HomeVendorStorefront
              title={
                title ||
                container.containerType
                  .replace('INFLUENCER_', '')
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (c: string) => c.toUpperCase())
              }
              items={items}
              entityType="influencer"
              displayType={
                container.containerType.includes('CAROUSEL') ? 'CAROUSEL' : cfg.storefrontDisplayType || 'CAROUSEL'
              }
              cardLayout={cfg.storefrontCardLayout}
              showLogo={cfg.showStoreLogo !== false}
              showBanner={cfg.showStoreBanner !== false}
              showName={cfg.showStoreName !== false}
              showDescription={cfg.showStoreDescription !== false}
              showFollowersCount={cfg.showFollowersCount !== false}
              showProductsCount={cfg.showProductsCount !== false}
              showRating={cfg.showStoreRating !== false}
              showVerifiedBadge={cfg.showVerifiedBadge !== false}
              ctaText={cfg.cardCtaText || 'View Storefront'}
              isLoading={false}
            />
          </View>
        ) : null;
      }

      default:
        // Silently ignore unsupported types (show in terminal only)
        console.warn(`[HomeScreen] Unsupported container type: ${container.containerType}`);
        return null;
    }
  };

  const renderContent = () => {
    // If backend returns a valid layout, use the dynamic layout path
    if (layout && Array.isArray(layout.containers) && layout.containers.length > 0) {
      return (
        <View className="pb-10">
          {layout.containers.map((container: any, index: number) =>
            renderContainer(container, index)
          )}
        </View>
      );
    }

    // CONTROLLED FALLBACK PATH
    return (
      <View className="pb-10">
        {/* Categories with Partial Failure Boundary */}
        {isCategoriesError ? (
          <View className="p-4 items-center flex-row justify-center bg-rose-50 dark:bg-rose-950/30 m-4 rounded-xl">
            <AlertCircle size={16} className="text-rose-500 mr-2" />
            <Text className="text-sm text-rose-600 dark:text-rose-400">Unable to load categories</Text>
          </View>
        ) : (
          <HomeCategories categories={categories} isLoading={isCategoriesLoading} />
        )}

        {/* Explore Products with Partial Failure Boundary */}
        {isProductsError ? (
          <View className="p-4 items-center flex-row justify-center bg-rose-50 dark:bg-rose-950/30 m-4 rounded-xl">
            <AlertCircle size={16} className="text-rose-500 mr-2" />
            <Text className="text-sm text-rose-600 dark:text-rose-400">Unable to load products</Text>
          </View>
        ) : (
          <HomeFeatured
            products={fallbackProducts}
            isLoading={isProductsLoading}
            title="Explore Products"
          />
        )}

        {/* Trust Badges */}
        <TrustBadges />
      </View>
    );
  };

  return (
    <SafeAreaScreen className="flex-1 bg-white dark:bg-slate-950" edges={['top']}>
      <HomeHeader />

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SearchBar onPress={handleSearchPress} editable={false} />
        {renderContent()}
      </ScrollView>
    </SafeAreaScreen>
  );
}
