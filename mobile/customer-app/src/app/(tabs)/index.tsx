import React, { useCallback, useState } from 'react';
import { View, ScrollView, RefreshControl, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHome } from '../../hooks/useHome';
import { useCategories } from '../../hooks/useCategories';
import { useProducts } from '../../hooks/useProducts';
import { HomeBanner } from '../../components/home/HomeBanner';
import { HomeCategories } from '../../components/home/HomeCategories';
import { HomeFeatured } from '../../components/home/HomeFeatured';
import { HomeHeader } from '../../components/home/HomeHeader';
import { TrustBadges } from '../../components/home/TrustBadges';
import { SearchBar } from '../../components/catalog/SearchBar';
import { useRouter } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();

  // 1. Fetch Dynamic Layout (May be null in dev if unconfigured)
  const { data: layout, isLoading: isLayoutLoading, refetch: refetchLayout, isError: isLayoutError } = useHome('mobile');
  
  // 2. Fetch Categories (Independent fallback query)
  const { 
    data: categories = [], 
    isLoading: isCategoriesLoading, 
    refetch: refetchCategories,
    isError: isCategoriesError
  } = useCategories();
  
  // 3. Fetch Products (Independent fallback query)
  const { 
    data: productsData, 
    isLoading: isProductsLoading, 
    refetch: refetchProducts,
    isError: isProductsError
  } = useProducts({ sortBy: 'createdAt', sortOrder: 'desc' });

  // Fallback products from the first page
  const fallbackProducts = productsData?.pages?.[0]?.items?.filter(Boolean) || [];

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchLayout(),
        refetchCategories(),
        refetchProducts(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchLayout, refetchCategories, refetchProducts]);

  const handleSearchPress = () => {
    router.push('/(tabs)/shop');
  };

  const renderContent = () => {
    // If backend returns a valid layout, use the layout path
    // For Phase 3, we expect layout to be null often.
    if (layout && Array.isArray(layout.containers) && layout.containers.length > 0) {
      return (
        <View className="pb-10">
          {layout.containers.map((container: any) => {
            switch (container.containerType) {
              case 'BANNER':
              case 'BANNER_CAROUSEL':
              case 'SLIDER':
                // Extract from bannerMedia array if available
                const mediaItems = container.config?.bannerMedia || container.config?.slides || [];
                const primaryMedia = mediaItems[0] || {};
                
                // Fallbacks: Use specific media fields, else top-level config fields, else container info
                const title = primaryMedia.heading || container.config?.heading || container.title;
                const subtitle = primaryMedia.subheading || container.config?.subheading || container.description;
                const imageUrl = primaryMedia.mobileImage || primaryMedia.desktopImage || primaryMedia.url || container.config?.bannerImage;
                const ctaText = primaryMedia.ctaLabel || container.config?.ctaButton;
                const ctaUrl = primaryMedia.ctaUrl || container.config?.ctaUrl;

                return (
                  <View key={container._id || container.instanceId} className="mb-4">
                    <HomeBanner
                      title={title}
                      subtitle={subtitle}
                      imageUrl={imageUrl}
                      ctaText={ctaText}
                      ctaUrl={ctaUrl}
                      isLoading={false}
                    />
                  </View>
                );
              case 'FEATURED_PRODUCTS':
              case 'CAROUSEL':
              case 'GRID':
                return (
                  <View key={container._id || container.instanceId} className="mb-4">
                    <HomeFeatured
                      title={container.title}
                      products={container.products || []}
                      isLoading={false}
                    />
                  </View>
                );
              case 'CATEGORY_SHOWCASE':
                return (
                  <View key={container._id || container.instanceId} className="mb-4">
                    <HomeCategories
                      categories={container.categories || []}
                      isLoading={false}
                    />
                  </View>
                );
              default:
                // Safely ignore unsupported container types as instructed
                console.warn(`Unsupported container type: ${container.containerType}`);
                return null;
            }
          })}
        </View>
      );
    }

    // CONTROLLED FALLBACK PATH
    return (
      <View className="pb-10">
        {/* We do NOT show a fake banner. The banner section is gracefully omitted. */}
        
        {/* Categories Section with Partial Failure Boundary */}
        {isCategoriesError ? (
          <View className="p-4 items-center flex-row justify-center bg-rose-50 dark:bg-rose-950/30 m-4 rounded-xl">
            <AlertCircle size={16} className="text-rose-500 mr-2" />
            <Text className="text-sm text-rose-600 dark:text-rose-400">Unable to load categories</Text>
          </View>
        ) : (
          <HomeCategories 
            categories={categories} 
            isLoading={isCategoriesLoading} 
          />
        )}

        {/* Explore Products Section with Partial Failure Boundary */}
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

        {/* Trust Badges - Static UI elements based on verified platform policy */}
        <TrustBadges />
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950" edges={['top']}>
      <HomeHeader />
      
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SearchBar onPress={handleSearchPress} editable={false} />
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}
