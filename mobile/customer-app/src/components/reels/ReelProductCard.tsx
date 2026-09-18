import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { ShoppingBag, ChevronRight, Tag } from 'lucide-react-native';
import { ReelProduct } from '../../types/reel';
import { resolveReelMediaUrl } from '../../api/reels';

interface ReelProductCardProps {
  product: ReelProduct;
  onPress: () => void;
}

export const ReelProductCard: React.FC<ReelProductCardProps> = ({ product, onPress }) => {
  const rawImage =
    product.image ||
    (typeof product.images?.[0] === 'object'
      ? (product.images[0] as any)?.url
      : (product.images?.[0] as string));
  const imageUri = resolveReelMediaUrl(rawImage);

  const price = product.salePrice ?? product.price ?? 0;
  const regularPrice = product.regularPrice ?? product.price;
  const hasDiscount = regularPrice && regularPrice > price;
  const discountPct = hasDiscount ? Math.round(((regularPrice - price) / regularPrice) * 100) : 0;

  return (
    <TouchableOpacity style={styles.cardContainer} onPress={onPress} activeOpacity={0.88}>
      {/* Product Image */}
      <View style={styles.imageWrapper}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.fallbackImage]}>
            <ShoppingBag size={18} color="#94a3b8" />
          </View>
        )}
        {discountPct > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discountPct}%</Text>
          </View>
        )}
      </View>

      {/* Product Details */}
      <View style={styles.infoWrapper}>
        <View style={styles.tagRow}>
          <Tag size={11} color="#e0e7ff" />
          <Text style={styles.tagText}>Featured Product</Text>
        </View>

        <Text style={styles.productTitle} numberOfLines={1}>
          {product.name || product.title || 'Tagged Item'}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{price.toLocaleString('en-IN')}</Text>
          {hasDiscount && (
            <Text style={styles.strikePrice}>₹{regularPrice.toLocaleString('en-IN')}</Text>
          )}
        </View>
      </View>

      {/* CTA Button */}
      <View style={styles.ctaButton}>
        <Text style={styles.ctaText}>Shop</Text>
        <ChevronRight size={14} color="#ffffff" strokeWidth={2.5} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    maxWidth: 320,
    marginBottom: 8,
  },
  imageWrapper: {
    width: 46,
    height: 46,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackImage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  discountBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#ef4444',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderBottomRightRadius: 6,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  infoWrapper: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  tagText: {
    color: '#a5b4fc',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  productTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  strikePrice: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 2,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
