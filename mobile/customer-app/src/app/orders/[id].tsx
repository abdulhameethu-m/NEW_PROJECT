import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  MapPin,
  Package,
  CreditCard,
  AlertCircle,
  HelpCircle,
  ShoppingBag,
  Calendar,
} from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { useOrderDetails, useCancelOrder } from '../../hooks/useOrders';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';
import { OrderTrackingTimeline } from '../../components/orders/OrderTrackingTimeline';
import { CancelOrderModal } from '../../components/orders/CancelOrderModal';

const formatDateTime = (isoString?: string) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return `${d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })} at ${d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })}`;
  } catch {
    return '';
  }
};

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: order, isLoading, error, refetch } = useOrderDetails(id);
  const cancelOrderMutation = useCancelOrder();

  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);

  if (isLoading) {
    return (
      <SafeAreaScreen style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            Order Details
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText} allowFontScaling={false}>
            Loading order details...
          </Text>
        </View>
      </SafeAreaScreen>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaScreen style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            Order Details
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <AlertCircle size={44} color="#ef4444" style={{ marginBottom: 12 }} />
          <Text style={styles.errorTitle} allowFontScaling={false}>
            Order Not Found
          </Text>
          <Text style={styles.errorSubtitle} allowFontScaling={false}>
            We couldn't retrieve the details for this order. It may have been deleted or the link is expired.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => refetch()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnText} allowFontScaling={false}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaScreen>
    );
  }

  const normStatus = (order.status || '').toLowerCase();
  const isCancellable = ['pending', 'placed', 'packed'].includes(normStatus);

  const handleConfirmCancel = async (reason: string, notes?: string) => {
    if (!order?._id) return;
    await cancelOrderMutation.mutateAsync({
      orderId: order._id,
      payload: { reason, notes },
    });
    setIsCancelModalVisible(false);
    Alert.alert('Order Cancelled', 'Your order has been cancelled successfully.');
  };

  const address = order.shippingAddress || {};

  return (
    <SafeAreaScreen style={styles.screen}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} allowFontScaling={false}>
          Order Details
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Order Identification & Status Card */}
        <View style={styles.orderOverviewCard}>
          <View style={styles.orderOverviewTop}>
            <View style={styles.orderNumCol}>
              <Text style={styles.orderOverviewLabel} allowFontScaling={false}>
                ORDER NUMBER
              </Text>
              <Text style={styles.orderOverviewNumber} allowFontScaling={false}>
                #{order.orderNumber}
              </Text>
            </View>
            <OrderStatusBadge status={order.status} size="md" />
          </View>

          <View style={styles.orderOverviewDivider} />

          <View style={styles.orderOverviewBottom}>
            <Calendar size={13} color="#64748b" style={{ marginRight: 6 }} />
            <Text style={styles.orderOverviewDate} allowFontScaling={false}>
              Placed on {formatDateTime(order.createdAt)}
            </Text>
          </View>
        </View>

        {/* Live Tracking Milestones */}
        <OrderTrackingTimeline order={order} />

        {/* Ordered Items Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Package size={16} color="#4f46e5" style={{ marginRight: 6 }} />
            <Text style={styles.cardTitle} allowFontScaling={false}>
              Items Ordered ({order.items?.length || 0})
            </Text>
          </View>

          <View style={styles.itemsList}>
            {order.items?.map((item, idx) => {
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
                    idx < (order.items?.length || 1) - 1 && styles.itemRowBorder,
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
                  </View>

                  <Text style={styles.itemTotalText} allowFontScaling={false}>
                    {itemTotal}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Delivery Address Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MapPin size={16} color="#4f46e5" style={{ marginRight: 6 }} />
            <Text style={styles.cardTitle} allowFontScaling={false}>
              Delivery Address
            </Text>
          </View>

          <View style={styles.addressBody}>
            <Text style={styles.addressName} allowFontScaling={false}>
              {address.fullName || 'Customer'}
            </Text>
            {address.phone ? (
              <Text style={styles.addressPhone} allowFontScaling={false}>
                Phone: {address.phone}
              </Text>
            ) : null}
            <Text style={styles.addressStreet} allowFontScaling={false}>
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ''}
            </Text>
            <Text style={styles.addressCityState} allowFontScaling={false}>
              {address.city ? `${address.city}, ` : ''}
              {address.state ? `${address.state} - ` : ''}
              {address.postalCode}
            </Text>
          </View>
        </View>

        {/* Payment & Price Breakdown Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CreditCard size={16} color="#4f46e5" style={{ marginRight: 6 }} />
            <Text style={styles.cardTitle} allowFontScaling={false}>
              Payment & Bill Details
            </Text>
          </View>

          <View style={styles.billRows}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel} allowFontScaling={false}>
                Items Subtotal
              </Text>
              <Text style={styles.billValue} allowFontScaling={false}>
                ₹{(order.subtotal || 0).toLocaleString('en-IN')}
              </Text>
            </View>

            {/* Delivery fee - only shown if configured by admin and > 0 */}
            {order.shippingFee && order.shippingFee > 0 ? (
              <View style={styles.billRow}>
                <Text style={styles.billLabel} allowFontScaling={false}>
                  Delivery / Shipping Fee
                </Text>
                <Text style={styles.billValue} allowFontScaling={false}>
                  ₹{order.shippingFee.toLocaleString('en-IN')}
                </Text>
              </View>
            ) : null}

            {/* Configured Admin fees (e.g. Extra fee, Platform fee) */}
            {order.priceBreakdown?.charges && order.priceBreakdown.charges.length > 0 ? (
              order.priceBreakdown.charges
                .filter((charge) => charge.amount > 0 && charge.key !== 'shipping_cost')
                .map((charge, cIdx) => (
                  <View key={`charge-${cIdx}`} style={styles.billRow}>
                    <Text style={styles.billLabel} allowFontScaling={false}>
                      {charge.displayName || charge.name || 'Additional Fee'}
                    </Text>
                    <Text style={styles.billValue} allowFontScaling={false}>
                      ₹{charge.amount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                ))
            ) : order.chargesTotal && order.chargesTotal > 0 ? (
              <View style={styles.billRow}>
                <Text style={styles.billLabel} allowFontScaling={false}>
                  Additional Charges
                </Text>
                <Text style={styles.billValue} allowFontScaling={false}>
                  ₹{order.chargesTotal.toLocaleString('en-IN')}
                </Text>
              </View>
            ) : null}

            {order.discountAmount && order.discountAmount > 0 ? (
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: '#059669' }]} allowFontScaling={false}>
                  Discount Applied
                </Text>
                <Text style={[styles.billValue, { color: '#059669' }]} allowFontScaling={false}>
                  -₹{order.discountAmount.toLocaleString('en-IN')}
                </Text>
              </View>
            ) : null}

            <View style={styles.billDivider} />

            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalRowLabel} allowFontScaling={false}>
                  {order.paymentMethod === 'COD' ? 'Payable on Delivery' : 'Total Paid'}
                </Text>
                <Text style={styles.paymentMethodNote} allowFontScaling={false}>
                  Mode: {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment'}
                </Text>
              </View>
              <Text style={styles.totalRowValue} allowFontScaling={false}>
                ₹{(order.totalAmount || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {isCancellable && (
            <TouchableOpacity
              style={styles.cancelOrderBtn}
              onPress={() => setIsCancelModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelOrderBtnText} allowFontScaling={false}>
                Cancel Order
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.continueShopBtn}
            onPress={() => router.push('/(tabs)/shop')}
            activeOpacity={0.8}
          >
            <ShoppingBag size={16} color="#4f46e5" style={{ marginRight: 6 }} />
            <Text style={styles.continueShopBtnText} allowFontScaling={false}>
              Continue Shopping
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Cancellation Modal */}
      <CancelOrderModal
        visible={isCancelModalVisible}
        onClose={() => setIsCancelModalVisible(false)}
        onConfirm={handleConfirmCancel}
        isSubmitting={cancelOrderMutation.isPending}
        paymentMethod={order.paymentMethod}
      />
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  orderOverviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  orderOverviewTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  orderNumCol: {
    flex: 1,
    marginRight: 10,
  },
  orderOverviewLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  orderOverviewNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4f46e5',
  },
  orderOverviewDivider: {
    height: 1,
    backgroundColor: '#f8fafc',
    marginVertical: 12,
  },
  orderOverviewBottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderOverviewDate: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 12,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
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
  addressBody: {
    paddingVertical: 2,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  addressPhone: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 6,
  },
  addressStreet: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  addressCityState: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginTop: 2,
  },
  billRows: {},
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  billLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalRowLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  paymentMethodNote: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  totalRowValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4f46e5',
  },
  actionsContainer: {
    marginTop: 8,
    gap: 10,
  },
  cancelOrderBtn: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelOrderBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e11d48',
  },
  continueShopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 48,
    borderRadius: 12,
  },
  continueShopBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4f46e5',
  },
});
