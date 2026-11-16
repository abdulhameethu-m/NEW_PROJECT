import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Package, Star } from 'lucide-react-native';
import { OrderItem } from '../../types/order';

export interface OrderItemsListProps {
  items: OrderItem[];
  isDelivered: boolean;
  onOpenReview: (item: OrderItem) => void;
}

export const OrderItemsList: React.FC<OrderItemsListProps> = ({
  items,
  isDelivered,
  onOpenReview,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Package size={16} color="#4f46e5" style={{ marginRight: 6 }} />
        <Text style={styles.cardTitle} allowFontScaling={false}>
          Items Ordered ({items?.length || 0})
        </Text>
      </View>

      <View style={styles.itemsList}>
        {items?.map((item, idx) => {
          let imgUrl = item.image || '';
          if (!imgUrl && typeof item.productId === 'object' && item.productId?.images?.[0]) {
            imgUrl = item.productId.images[0].url;
          }

          const itemTotal = `₹${((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}`;

          return (
            <View
              key={`${item.name}-${idx}`}
              style={[
                styles.itemRow,
                idx < (items?.length || 1) - 1 && styles.itemRowBorder,
              ]}
            >
              <View style={styles.itemImageContainer}>
                {imgUrl ? (
                  <Image
                    source={{ uri: imgUrl }}
                    style={styles.itemImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={styles.itemImagePlaceholder}>
                    <Package size={20} color="#94a3b8" />
                  </View>
                )}
              </View>

              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2} allowFontScaling={false}>
                  {item.name}
                </Text>
                {item.variantTitle ? (
                  <Text style={styles.itemVariant} numberOfLines={1} allowFontScaling={false}>
                    {item.variantTitle}
                  </Text>
                ) : null}
                <Text style={styles.itemUnitPrice} allowFontScaling={false}>
                  ₹{(item.price || 0).toLocaleString('en-IN')} × {item.quantity}
                </Text>

                {isDelivered && (
                  <TouchableOpacity
                    style={styles.reviewItemBtn}
                    onPress={() => onOpenReview(item)}
                    activeOpacity={0.75}
                  >
                    <Star size={11} color="#d97706" fill="#f59e0b" style={{ marginRight: 4 }} />
                    <Text style={styles.reviewItemBtnText} allowFontScaling={false}>
                      Write a Review
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.itemTotalText} allowFontScaling={false}>
                {itemTotal}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  itemsList: {},
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  itemImageContainer: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 18,
    marginBottom: 2,
  },
  itemVariant: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  itemUnitPrice: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  itemTotalText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  reviewItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  reviewItemBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
});
