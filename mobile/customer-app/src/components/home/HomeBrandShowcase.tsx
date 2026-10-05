import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Store } from 'lucide-react-native';
import { ResponsiveContainer } from '../layout/ResponsiveContainer';
import { resolveUrl } from '../../utils/resolveUrl';

interface Brand {
  name?: string;
  logo?: string;
  url?: string;
  _id?: string;
}

interface HomeBrandShowcaseProps {
  title?: string;
  brands?: string[];
  brandLogos?: Brand[];
  isLoading?: boolean;
}

export const HomeBrandShowcase = ({
  title = 'Top Brands',
  brands = [],
  brandLogos = [],
  isLoading = false,
}: HomeBrandShowcaseProps) => {
  const router = useRouter();

  // Merge brand names with brand logo objects
  const allBrands: Brand[] = brandLogos.length > 0
    ? brandLogos
    : brands.map((b, i) => ({ name: String(b), _id: String(i) }));

  if (isLoading) {
    return (
      <ResponsiveContainer className="py-4">
        <View style={styles.skeletonRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.skeletonItem}>
              <View style={styles.skeletonLogo} />
              <View style={styles.skeletonText} />
            </View>
          ))}
        </View>
      </ResponsiveContainer>
    );
  }

  if (allBrands.length === 0) return null;

  return (
    <ResponsiveContainer className="py-4" withPadding={false}>
      <View className="px-4 mb-3">
        <Text className="text-lg font-bold text-slate-900 dark:text-white">{title}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {allBrands.map((brand, i) => {
          const logoUrl = resolveUrl(brand.logo);
          return (
            <Pressable
              key={brand._id || i}
              style={styles.brandItem}
              onPress={() => {
                if (brand.url?.startsWith('/')) router.push(brand.url as any);
                else router.push('/(tabs)/shop' as any);
              }}
            >
              <View style={styles.logoWrapper}>
                {logoUrl ? (
                  <Image
                    source={logoUrl}
                    style={styles.logo}
                    contentFit="contain"
                    transition={200}
                  />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Store size={24} color="#94a3b8" />
                  </View>
                )}
              </View>
              {brand.name ? (
                <Text style={styles.brandName} numberOfLines={1}>
                  {brand.name}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </ResponsiveContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  brandItem: {
    alignItems: 'center',
    width: 80,
  },
  logoWrapper: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  logo: {
    width: '75%',
    height: '75%',
  },
  logoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  // Skeleton
  skeletonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
  },
  skeletonItem: {
    alignItems: 'center',
    width: 72,
  },
  skeletonLogo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    marginBottom: 8,
  },
  skeletonText: {
    width: 50,
    height: 10,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
});
