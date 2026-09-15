import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, Package, Calendar } from 'lucide-react-native';
import { Order } from '../../types/order';
import { OrderStatusBadge } from './OrderStatusBadge';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

const formatDate = (isoString?: string) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

export const OrderCard: React.FC<OrderCardProps> = ({ order, onPress }) => {
  const firstItem = order.items?.[0];
  const otherItemsCount = (order.items?.length || 1) - 1;

  // Resolve first item image
  let imageUrl = firstItem?.image || '';
  if (!imageUrl && typeof firstItem?.productId === 'object' && firstItem.productId?.images?.[0]) {
    imageUrl = firstItem.productId.images[0].url;
  }

  const formattedAmount = `₹${(order.totalAmount || 0).toLocaleString('en-IN')}`;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.82}
      onPress={onPress}
    >
      {/* Card Header: Order Number, Date & Status */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.orderNumber} allowFontScaling={false}>
            #{order.orderNumber}
          </Text>
          <View style={styles.dateRow}>
            <Calendar size={11} color="#94a3b8" style={{ marginRight: 3 }} />
            <Text style={styles.orderDate} allowFontScaling={false}>
              {formatDate(order.createdAt)}
            </Text>
          </View>
        </View>
        <OrderStatusBadge status={order.status} size="sm" />
      </View>

      <View style={styles.divider} />

      {/* Card Body: Items Preview */}
      <View style={styles.body}>
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.placeholderThumbnail}>
              <Package size={22} color="#94a3b8" />
            </View>
          )}
        </View>

        <View style={styles.itemDetails}>
          <Text style={styles.itemTitle} numberOfLines={2} allowFontScaling={false}>
            {firstItem?.name || 'Order Item'}
          </Text>

          {firstItem?.variantTitle ? (
            <Text style={styles.itemVariant} numberOfLines={1} allowFontScaling={false}>
              Variant: {firstItem.variantTitle}
            </Text>
          ) : null}

          <View style={styles.itemCountRow}>
            <Text style={styles.itemQuantity} allowFontScaling={false}>
              Qty: {firstItem?.quantity || 1}
            </Text>
            {otherItemsCount > 0 && (
              <View style={styles.moreBadge}>
                <Text style={styles.moreBadgeText} allowFontScaling={false}>
                  +{otherItemsCount} more item{otherItemsCount > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Card Footer: Amount & View Details Action */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.totalLabel} allowFontScaling={false}>
            Total Amount
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceText} allowFontScaling={false}>
              {formattedAmount}
            </Text>
            <View style={styles.paymentMethodPill}>
              <Text style={styles.paymentMethodText} allowFontScaling={false}>
                {order.paymentMethod === 'COD' ? 'COD' : 'Paid Online'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsBtn}>
          <Text style={styles.detailsBtnText} allowFontScaling={false}>
            Details
          </Text>
          <ChevronRight size={15} color="#4f46e5" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
    padding: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderDate: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f8fafc',
    marginVertical: 10,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    width: 62,
    height: 62,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 18,
    marginBottom: 2,
  },
  itemVariant: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  itemCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginRight: 8,
  },
  moreBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  moreBadgeText: {
    fontSize: 10,
    color: '#4f46e5',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  footerLeft: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4f46e5',
    marginRight: 8,
  },
  paymentMethodPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  paymentMethodText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
    marginRight: 2,
  },
});
