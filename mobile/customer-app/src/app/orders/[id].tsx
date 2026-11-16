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
import {
  ChevronLeft,
  AlertCircle,
  RotateCcw,
  ArrowRight,
  FileText,
} from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { useOrderDetails, useCancelOrder } from '../../hooks/useOrders';
import { useCustomerReturns } from '../../hooks/useReturns';
import { OrderOverviewCard } from '../../components/orders/OrderOverviewCard';
import { OrderItemsList } from '../../components/orders/OrderItemsList';
import { OrderDeliveryDetailsCard } from '../../components/orders/OrderDeliveryDetailsCard';
import { OrderPaymentReceipt } from '../../components/orders/OrderPaymentReceipt';
import { OrderActionButtons } from '../../components/orders/OrderActionButtons';
import { OrderTrackingTimeline } from '../../components/orders/OrderTrackingTimeline';
import { DeliveryVerificationOtpCard } from '../../components/orders/DeliveryVerificationOtpCard';
import { CancelOrderModal } from '../../components/orders/CancelOrderModal';
import { ReturnRequestModal } from '../../components/returns/ReturnRequestModal';
import { InvoicePreviewModal } from '../../components/invoice/InvoicePreviewModal';
import { ReviewForm } from '../../components/product/ReviewForm';
import { safeGoBack } from '../../utils/safeNavigation';

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: order, isLoading, error, refetch } = useOrderDetails(id);
  const { data: returnsData, refetch: refetchReturns } = useCustomerReturns({ limit: 50 });
  const cancelOrderMutation = useCancelOrder();

  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [isReturnModalVisible, setIsReturnModalVisible] = useState(false);
  const [isInvoiceModalVisible, setIsInvoiceModalVisible] = useState(false);
  const [selectedReviewItem, setSelectedReviewItem] = useState<{
    productId: string;
    orderId: string;
    name: string;
  } | null>(null);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);

  const handleOpenReview = (item: any) => {
    const prodId =
      typeof item.productId === 'object'
        ? item.productId?._id
        : item.productId;

    if (!prodId || !order?._id) return;

    setSelectedReviewItem({
      productId: String(prodId),
      orderId: String(order._id),
      name: item.name || 'Product',
    });
    setIsReviewModalVisible(true);
  };

  if (isLoading) {
    return (
      <SafeAreaScreen style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => safeGoBack(router, '/orders')}
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
            onPress={() => safeGoBack(router, '/orders')}
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
  const isReturnEligible = normStatus === 'delivered';

  const existingReturn = returnsData?.returns?.find((ret) => {
    const retOrderId = typeof ret.orderId === 'object' ? (ret.orderId as any)?._id : ret.orderId;
    const retOrderNumber = typeof ret.orderId === 'object' ? (ret.orderId as any)?.orderNumber : undefined;
    return (
      (retOrderId && String(retOrderId) === String(order._id)) ||
      (retOrderNumber && String(retOrderNumber) === String(order.orderNumber))
    );
  });

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
          onPress={() => safeGoBack(router, '/orders')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} allowFontScaling={false}>
          Order Details
        </Text>
        <TouchableOpacity
          style={styles.invoiceHeaderBtn}
          onPress={() => setIsInvoiceModalVisible(true)}
          activeOpacity={0.7}
        >
          <FileText size={18} color="#0284c7" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Order Identification & Status Card */}
        <OrderOverviewCard
          orderNumber={order.orderNumber}
          status={order.status}
          createdAt={order.createdAt}
          onViewInvoice={() => setIsInvoiceModalVisible(true)}
        />

        {/* Delivery Pickup Verification OTP (COD or High-Value Handover) */}
        <DeliveryVerificationOtpCard
          otp={order.deliveryOtp}
          orderStatus={order.status}
          paymentMethod={order.paymentMethod}
          totalAmount={order.totalAmount}
        />

        {/* Live Tracking Milestones */}
        <OrderTrackingTimeline order={order} />

        {/* Existing Return Banner if customer already initiated return */}
        {existingReturn && (
          <TouchableOpacity
            style={styles.existingReturnBanner}
            onPress={() => router.push(`/returns/${existingReturn._id}` as any)}
            activeOpacity={0.85}
          >
            <View style={styles.existingReturnBannerTop}>
              <View style={styles.existingReturnBannerTitleRow}>
                <View style={styles.existingReturnIconBg}>
                  <RotateCcw size={16} color="#0284c7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.existingReturnBannerTitle} allowFontScaling={false}>
                    Return Request #{existingReturn.returnNumber || existingReturn._id.slice(-6).toUpperCase()}
                  </Text>
                  <Text style={styles.existingReturnBannerSub} allowFontScaling={false}>
                    Status:{' '}
                    <Text style={{ fontWeight: '700', color: '#0369a1' }}>
                      {existingReturn.status.replace(/_/g, ' ')}
                    </Text>
                  </Text>
                </View>
              </View>
              <ArrowRight size={18} color="#0284c7" />
            </View>
            <Text style={styles.existingReturnBannerHint} allowFontScaling={false}>
              Tap to track pickup agent arrival, courier AWB, and refund progress →
            </Text>
          </TouchableOpacity>
        )}

        {/* Ordered Items List */}
        <OrderItemsList
          items={order.items || []}
          isDelivered={normStatus === 'delivered'}
          onOpenReview={handleOpenReview}
        />

        {/* Delivery Address Card */}
        <OrderDeliveryDetailsCard address={address} />

        {/* Payment & Price Breakdown Card */}
        <OrderPaymentReceipt
          subtotal={order.subtotal}
          shippingFee={order.shippingFee}
          priceBreakdown={order.priceBreakdown}
          chargesTotal={order.chargesTotal}
          discountAmount={order.discountAmount}
          paymentMethod={order.paymentMethod}
          totalAmount={order.totalAmount}
        />

        {/* Action Buttons */}
        <OrderActionButtons
          isCancellable={isCancellable}
          isReturnEligible={isReturnEligible}
          hasExistingReturn={Boolean(existingReturn)}
          onCancel={() => setIsCancelModalVisible(true)}
          onReturn={() => setIsReturnModalVisible(true)}
          onViewReturn={() => {
            if (existingReturn?._id) {
              router.push(`/returns/${existingReturn._id}` as any);
            }
          }}
          onViewInvoice={() => setIsInvoiceModalVisible(true)}
          onSupport={() =>
            router.push({
              pathname: '/support/new',
              params: {
                orderId: order._id,
                orderNumber: order.orderNumber,
                category: 'Orders & Delivery',
              },
            } as any)
          }
          onContinueShopping={() => router.push('/(tabs)/shop')}
        />
      </ScrollView>

      {/* Cancellation Modal */}
      <CancelOrderModal
        visible={isCancelModalVisible}
        onClose={() => setIsCancelModalVisible(false)}
        onConfirm={handleConfirmCancel}
        isSubmitting={cancelOrderMutation.isPending}
        paymentMethod={order.paymentMethod}
      />

      {/* Return Request Modal */}
      <ReturnRequestModal
        visible={isReturnModalVisible}
        onClose={() => setIsReturnModalVisible(false)}
        order={order}
        onSuccess={(returnId) => {
          setIsReturnModalVisible(false);
          refetchReturns();
          refetch();
          router.push(`/returns/${returnId}` as any);
        }}
      />

      {/* Invoice Preview & Download Modal */}
      <InvoicePreviewModal
        visible={isInvoiceModalVisible}
        orderId={order._id}
        orderNumber={order.orderNumber}
        onClose={() => setIsInvoiceModalVisible(false)}
      />

      {/* Product Review Modal for Delivered Items */}
      {selectedReviewItem && (
        <ReviewForm
          productId={selectedReviewItem.productId}
          orderId={selectedReviewItem.orderId}
          isVisible={isReviewModalVisible}
          onClose={() => {
            setIsReviewModalVisible(false);
            setSelectedReviewItem(null);
          }}
        />
      )}
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
  invoiceHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  existingReturnBanner: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  existingReturnBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  existingReturnBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  existingReturnIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  existingReturnBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369a1',
  },
  existingReturnBannerSub: {
    fontSize: 12,
    color: '#0284c7',
    marginTop: 2,
  },
  existingReturnBannerHint: {
    fontSize: 11,
    color: '#0284c7',
    marginTop: 8,
    fontWeight: '500',
  },
});
