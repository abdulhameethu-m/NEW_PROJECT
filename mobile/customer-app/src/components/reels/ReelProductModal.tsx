import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { X, ShoppingBag, Plus, Minus, Check, ExternalLink } from 'lucide-react-native';
import { ReelProduct } from '../../types/reel';
import { resolveReelMediaUrl, reelsApi } from '../../api/reels';
import { useAddCartItem } from '../../hooks/useCart';

interface ReelProductModalProps {
  visible: boolean;
  product: ReelProduct | null;
  reelId?: string;
  onClose: () => void;
}

export const ReelProductModal: React.FC<ReelProductModalProps> = ({
  visible,
  product,
  reelId,
  onClose,
}) => {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const { mutate: addToCart, isPending } = useAddCartItem();

  if (!product) return null;

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

  const handleAddToCart = () => {
    if (!product._id && !product.id) return;
    const prodId = product._id || product.id || '';

    // Record product click attribution
    if (reelId) {
      reelsApi.recordProductClick(reelId, prodId);
    }

    addToCart(
      { productId: prodId, quantity },
      {
        onSuccess: () => {
          setAddedSuccess(true);
          setTimeout(() => {
            setAddedSuccess(false);
            onClose();
          }, 1200);
        },
      }
    );
  };

  const handleViewDetails = () => {
    onClose();
    const slugOrId = product.slug || product._id || product.id;
    if (slugOrId) {
      router.push(`/product/${slugOrId}`);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          {/* Top Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Quick Shop</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Product overview card */}
            <View style={styles.productRow}>
              <View style={styles.imageWrapper}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.productImage} contentFit="cover" />
                ) : (
                  <View style={[styles.productImage, styles.fallbackImage]}>
                    <ShoppingBag size={24} color="#94a3b8" />
                  </View>
                )}
                {discountPct > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{discountPct}% OFF</Text>
                  </View>
                )}
              </View>

              <View style={styles.detailsCol}>
                <Text style={styles.brandText}>{product.brand || product.category || 'Product'}</Text>
                <Text style={styles.titleText} numberOfLines={2}>
                  {product.name || product.title || 'Tagged Item'}
                </Text>

                <View style={styles.priceRow}>
                  <Text style={styles.salePrice}>₹{price.toLocaleString('en-IN')}</Text>
                  {hasDiscount && (
                    <Text style={styles.regularPrice}>₹{regularPrice.toLocaleString('en-IN')}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Quantity Selector */}
            <View style={styles.quantitySection}>
              <Text style={styles.sectionLabel}>Quantity</Text>
              <View style={styles.quantityControl}>
                <TouchableOpacity
                  style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus size={16} color={quantity <= 1 ? '#94a3b8' : '#0f172a'} />
                </TouchableOpacity>

                <Text style={styles.qtyText}>{quantity}</Text>

                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity((q) => q + 1)}
                >
                  <Plus size={16} color="#0f172a" />
                </TouchableOpacity>
              </View>
            </View>

            {/* View Details Link */}
            <TouchableOpacity style={styles.detailsLink} onPress={handleViewDetails}>
              <Text style={styles.detailsLinkText}>View full product details & specifications</Text>
              <ExternalLink size={14} color="#4f46e5" />
            </TouchableOpacity>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.addToCartBtn,
                addedSuccess && styles.addedBtn,
                isPending && styles.pendingBtn,
              ]}
              onPress={handleAddToCart}
              disabled={isPending || addedSuccess}
              activeOpacity={0.85}
            >
              {isPending ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : addedSuccess ? (
                <View style={styles.btnContent}>
                  <Check size={18} color="#ffffff" strokeWidth={3} />
                  <Text style={styles.btnText}>Added to Cart!</Text>
                </View>
              ) : (
                <View style={styles.btnContent}>
                  <ShoppingBag size={18} color="#ffffff" />
                  <Text style={styles.btnText}>Add to Cart • ₹{(price * quantity).toLocaleString('en-IN')}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  handleBar: {
    width: 44,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  imageWrapper: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  productImage: {
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
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderBottomRightRadius: 8,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  detailsCol: {
    flex: 1,
    marginLeft: 14,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366f1',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 18,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  salePrice: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  regularPrice: {
    fontSize: 13,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  qtyBtnDisabled: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    paddingHorizontal: 16,
  },
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  detailsLinkText: {
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  addToCartBtn: {
    backgroundColor: '#4f46e5',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  addedBtn: {
    backgroundColor: '#10b981',
  },
  pendingBtn: {
    opacity: 0.8,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
