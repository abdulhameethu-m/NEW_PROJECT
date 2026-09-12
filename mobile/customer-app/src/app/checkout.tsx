import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Plus,
  ShieldCheck,
  MapPin,
  AlertCircle,
  ShoppingBag,
  Package,
  RotateCcw,
} from 'lucide-react-native';
import { SafeAreaScreen } from '../components/layout/SafeAreaScreen';
import { useAuthStore } from '../stores/authStore';
import { useCart, CART_QUERY_KEY } from '../hooks/useCart';
import { useAddresses, useCreateAddress, useDeleteAddress } from '../hooks/useAddresses';
import { usePrepareCheckout, useCreateOrder } from '../hooks/useCheckout';
import { toShippingAddress } from '../api/address';
import { createRazorpayOrder, verifyRazorpayPayment } from '../api/checkout';
import { ENV } from '../config/env';
import { UserAddress } from '../types/checkout';
import { AddressCard } from '../components/checkout/AddressCard';
import { AddressFormModal } from '../components/checkout/AddressFormModal';
import { PaymentMethodSelector } from '../components/checkout/PaymentMethodSelector';
import { CheckoutSummaryCard } from '../components/checkout/CheckoutSummaryCard';
import { CodConfirmationModal } from '../components/checkout/CodConfirmationModal';

WebBrowser.maybeCompleteAuthSession();

export default function CheckoutScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status, user } = useAuthStore();
  const isAuthenticated = status === 'AUTHENTICATED';

  // Cart Data
  const { data: cart, isLoading: isCartLoading } = useCart();

  // Address Data & Mutations
  const { data: addresses = [], isLoading: isAddressesLoading } = useAddresses();
  const { mutateAsync: createAddressMutation, isPending: isCreatingAddress } = useCreateAddress();
  const { mutate: deleteAddressMutation } = useDeleteAddress();

  // Local Checkout State
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showAddressList, setShowAddressList] = useState<boolean>(false);
  const [isAddressModalVisible, setAddressModalVisible] = useState<boolean>(false);
  const [isCodModalVisible, setIsCodModalVisible] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isOnlinePaying, setIsOnlinePaying] = useState<boolean>(false);

  // Auto-select default or first address when addresses load
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
      if (defaultAddr?._id) {
        setSelectedAddressId(defaultAddr._id);
      }
    }
  }, [addresses, selectedAddressId]);

  // Active chosen address
  const activeAddress = useMemo(() => {
    return addresses.find((a) => a._id === selectedAddressId) || null;
  }, [addresses, selectedAddressId]);

  // Formatted shipping address payload for APIs
  const shippingAddress = useMemo(() => {
    return activeAddress ? toShippingAddress(activeAddress) : undefined;
  }, [activeAddress]);

  // Live Pricing & COD Eligibility Preparation
  const {
    data: preparedSummary,
    isLoading: isPreparing,
  } = usePrepareCheckout(
    {
      shippingAddress,
      paymentMethod,
      currency: 'INR',
    },
    { enabled: Boolean(shippingAddress?.postalCode) }
  );

  // Order Placement Mutation
  const { mutateAsync: placeOrderMutation, isPending: isPlacingOrder } = useCreateOrder();

  // Handle Add New Address
  const handleSaveAddress = async (newAddressData: Omit<UserAddress, '_id'>) => {
    const created = await createAddressMutation(newAddressData);
    if (created?._id) {
      setSelectedAddressId(created._id);
      setShowAddressList(false);
    }
  };

  const finalPayable =
    preparedSummary?.totalAmount ??
    cart?.totalAmount ??
    (cart?.items || []).reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Process COD Order Placement
  const processCodOrderPlacement = async () => {
    if (!shippingAddress) return;
    try {
      const result = await placeOrderMutation({
        shippingAddress,
        paymentMethod: 'COD',
      });

      setIsCodModalVisible(false);

      const firstOrder = result.orders?.[0];
      const orderNumber = firstOrder?.orderNumber || result.orderGroupId || 'ORD-SUCCESS';
      const totalAmount = firstOrder?.totalAmount ?? preparedSummary?.totalAmount ?? 0;

      router.replace({
        pathname: '/order-success',
        params: {
          orderNumber,
          orderGroupId: result.orderGroupId || '',
          totalAmount: String(totalAmount),
          paymentMethod: 'COD',
          recipientName: shippingAddress.fullName,
          deliveryCity: `${shippingAddress.city}, ${shippingAddress.state}`,
        },
      });
    } catch (err: any) {
      setIsCodModalVisible(false);
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to place Cash on Delivery order. Please try again.';
      setCheckoutError(message);
    }
  };

  // Handle Place Order
  const handlePlaceOrder = async () => {
    setCheckoutError(null);

    if (!shippingAddress) {
      setCheckoutError('Please select or add a delivery address.');
      return;
    }

    if (paymentMethod === 'COD' && preparedSummary?.codAvailability?.codAvailable === false) {
      setCheckoutError(
        preparedSummary?.codAvailability?.reasons?.[0] ||
          'Cash on Delivery is unavailable for this delivery address.'
      );
      return;
    }

    try {
      if (paymentMethod === 'COD') {
        setIsCodModalVisible(true);
      } else {
        setIsOnlinePaying(true);
        try {
          const razorpayOrder = await createRazorpayOrder({
            shippingAddress,
          });

          const redirectUrl = Linking.createURL('razorpay-callback');
          const serverOrigin = ENV.API_URL.replace(/\/api\/?$/, '');
          const checkoutUrl = `${serverOrigin}/uploads/razorpay-checkout.html?order_id=${encodeURIComponent(
            razorpayOrder.razorpay_order_id || razorpayOrder.orderId
          )}&key=${encodeURIComponent(
            razorpayOrder.key_id || razorpayOrder.key || ''
          )}&amount=${encodeURIComponent(
            razorpayOrder.amount
          )}&currency=${encodeURIComponent(
            razorpayOrder.currency || 'INR'
          )}&name=${encodeURIComponent(
            shippingAddress.fullName
          )}&email=${encodeURIComponent(
            user?.email || 'customer@example.com'
          )}&contact=${encodeURIComponent(
            shippingAddress.phone
          )}&redirect_url=${encodeURIComponent(redirectUrl)}`;

          const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, redirectUrl, {
            toolbarColor: '#4f46e5',
            secondaryToolbarColor: '#4338ca',
            showTitle: true,
            enableBarCollapsing: true,
            showInRecents: false,
          });

          if (result.type === 'success' && result.url) {
            const parsed = Linking.parse(result.url);
            const query = (parsed.queryParams || {}) as Record<string, string>;

            if (query.status === 'success' && query.razorpay_payment_id) {
              const verifyRes = await verifyRazorpayPayment({
                razorpay_order_id: query.razorpay_order_id,
                razorpay_payment_id: query.razorpay_payment_id,
                razorpay_signature: query.razorpay_signature,
                shippingAddress,
              });

              queryClient.setQueryData(CART_QUERY_KEY, {
                _id: '',
                userId: '',
                items: [],
                totalAmount: 0,
                itemCount: 0,
                currency: 'INR',
              });
              queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });

              const firstOrder = verifyRes.orders?.[0];
              const orderNumber =
                firstOrder?.orderNumber ||
                verifyRes.orderGroupId ||
                query.razorpay_order_id;
              const totalAmount =
                firstOrder?.totalAmount ??
                preparedSummary?.totalAmount ??
                razorpayOrder.amount / 100;

              router.replace({
                pathname: '/order-success',
                params: {
                  orderNumber,
                  orderGroupId: verifyRes.orderGroupId || '',
                  totalAmount: String(totalAmount),
                  paymentMethod: 'ONLINE',
                  recipientName: shippingAddress.fullName,
                  deliveryCity: `${shippingAddress.city}, ${shippingAddress.state}`,
                },
              });
              return;
            } else if (query.status === 'cancelled') {
              setCheckoutError('Payment window was closed. You can retry when ready.');
            } else {
              setCheckoutError(
                query.error || 'Payment was not completed. Please try again.'
              );
            }
          } else {
            setCheckoutError('Payment window was closed. You can retry when ready.');
          }
        } catch (err: any) {
          const message =
            err.response?.data?.message ||
            err.response?.data?.error ||
            err.message ||
            'Payment initiation failed. Please try again.';
          setCheckoutError(message);
        } finally {
          setIsOnlinePaying(false);
        }
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to place order. Please try again.';
      setCheckoutError(message);
    }
  };

  const isPlaceOrderDisabled =
    isPlacingOrder ||
    isOnlinePaying ||
    !activeAddress ||
    (paymentMethod === 'COD' && preparedSummary?.codAvailability?.codAvailable === false);

  // Auth Guard
  if (!isAuthenticated) {
    return (
      <SafeAreaScreen className="flex-1 bg-white dark:bg-slate-900">
        <View style={styles.centerContainer}>
          <ShieldCheck size={56} color="#4f46e5" style={{ marginBottom: 16 }} />
          <Text style={styles.authTitle}>Login to Continue</Text>
          <Text style={styles.authSubtitle}>
            Please sign in or register to complete your order and manage your delivery addresses.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.8}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaScreen>
    );
  }

  // Empty Cart Guard
  if (!isCartLoading && (!cart?.items || cart.items.length === 0)) {
    return (
      <SafeAreaScreen className="flex-1 bg-white dark:bg-slate-900">
        <View style={styles.navHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Checkout</Text>
        </View>
        <View style={styles.centerContainer}>
          <ShoppingBag size={56} color="#94a3b8" style={{ marginBottom: 16 }} />
          <Text style={styles.authTitle}>Your Cart is Empty</Text>
          <Text style={styles.authSubtitle}>
            Add items to your cart before proceeding to checkout.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/shop')}
            activeOpacity={0.8}
            style={[styles.primaryBtn, { width: 200 }]}
          >
            <Text style={styles.primaryBtnText}>Explore Products</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen className="flex-1 bg-white dark:bg-black">
      {/* Top Header */}
      <View style={styles.navHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Checkout</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ShieldCheck size={16} color="#059669" style={{ marginRight: 4 }} />
          <Text style={styles.secureText}>100% Secure</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
      >
        {/* Error Banner */}
        {checkoutError && (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color="#dc2626" style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={styles.errorText}>{checkoutError}</Text>
          </View>
        )}

        {/* 1. Delivery Address Section */}
        <View style={{ marginBottom: 20 }}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MapPin size={18} color="#0f172a" />
              <Text style={styles.sectionTitle}>Delivery Address</Text>
            </View>

            {addresses.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowAddressList(!showAddressList)}
                activeOpacity={0.7}
                style={styles.changeBtn}
              >
                <Text style={styles.changeText}>
                  {showAddressList ? 'Done' : 'Change'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {isAddressesLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#4f46e5" size="small" />
            </View>
          ) : addresses.length === 0 ? (
            <View style={styles.emptyAddressBox}>
              <MapPin size={24} color="#94a3b8" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>No addresses saved yet</Text>
              <Text style={styles.emptySubtitle}>
                Add your delivery address to proceed with checkout.
              </Text>
              <TouchableOpacity
                onPress={() => setAddressModalVisible(true)}
                activeOpacity={0.8}
                style={styles.emptyAddBtn}
              >
                <Plus size={15} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.emptyAddText}>Add Address</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* Show all addresses when expanded */}
              {showAddressList ? (
                <View style={{ gap: 10 }}>
                  {addresses.map((address) => (
                    <AddressCard
                      key={address._id}
                      address={address}
                      isSelected={address._id === selectedAddressId}
                      onSelect={() => {
                        if (address._id) {
                          setSelectedAddressId(address._id);
                          setShowAddressList(false);
                        }
                      }}
                      onDelete={() => {
                        if (address._id) {
                          deleteAddressMutation(address._id);
                        }
                      }}
                    />
                  ))}
                  <TouchableOpacity
                    onPress={() => setAddressModalVisible(true)}
                    activeOpacity={0.7}
                    style={styles.addAddressBtn}
                  >
                    <Plus size={16} color="#4f46e5" style={{ marginRight: 6 }} />
                    <Text style={styles.addAddressText}>
                      Add New Delivery Address
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : activeAddress ? (
                /* Selected Address Card + Add New Address Box below it (Matching Image 1) */
                <View>
                  <AddressCard
                    address={activeAddress}
                    isSelected={true}
                    onSelect={() => {}}
                  />
                  <TouchableOpacity
                    onPress={() => setAddressModalVisible(true)}
                    activeOpacity={0.7}
                    style={styles.addAddressBtn}
                  >
                    <Plus size={16} color="#4f46e5" style={{ marginRight: 6 }} />
                    <Text style={styles.addAddressText}>
                      Add New Delivery Address
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* 2. Payment Method Section */}
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.sectionHeading}>Payment Method</Text>
          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onSelectMethod={setPaymentMethod}
            codAvailability={preparedSummary?.codAvailability}
            codAdvance={preparedSummary?.codAdvance}
            isAddressSelected={Boolean(activeAddress)}
          />
        </View>

        {/* 3. Order Items & Price Summary */}
        <View style={{ marginBottom: 20 }}>
          <CheckoutSummaryCard
            items={cart?.items || []}
            summary={preparedSummary}
            isLoading={isPreparing}
          />
        </View>

        {/* 4. Trust Badges - 3 Columns with Vertical Dividers (Matching Image 1) */}
        <View style={styles.trustRow}>
          <View style={styles.trustCol}>
            <ShieldCheck size={22} color="#0f172a" />
            <Text style={styles.trustText}>100% Secure</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustCol}>
            <Package size={22} color="#b45309" />
            <Text style={styles.trustText}>Fast Delivery</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustCol}>
            <RotateCcw size={22} color="#0369a1" />
            <Text style={styles.trustText}>Easy Returns</Text>
          </View>
        </View>
      </ScrollView>

      {/* 5. Sticky Bottom Action Bar (Matching Image 1) */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarContent}>
          <View>
            <Text style={styles.payableLabel}>Payable Total</Text>
            <Text style={styles.payableAmount}>
              ₹{finalPayable.toLocaleString('en-IN')}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handlePlaceOrder}
            disabled={isPlaceOrderDisabled}
            activeOpacity={0.8}
            style={[
              styles.placeOrderBtn,
              isPlaceOrderDisabled && styles.disabledBtn,
            ]}
          >
            {isPlacingOrder || isOnlinePaying ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.placeOrderText}>Place Order</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Address Form Modal */}
      <AddressFormModal
        visible={isAddressModalVisible}
        onClose={() => setAddressModalVisible(false)}
        onSave={handleSaveAddress}
        isLoading={isCreatingAddress}
      />

      {/* Neat COD Confirmation Modal */}
      <CodConfirmationModal
        visible={isCodModalVisible}
        onClose={() => setIsCodModalVisible(false)}
        onConfirm={processCodOrderPlacement}
        totalAmount={finalPayable}
        shippingAddress={shippingAddress}
        isLoading={isPlacingOrder}
      />
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  navHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 6,
    marginLeft: -4,
    borderRadius: 999,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginLeft: 8,
  },
  secureText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginLeft: 6,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  changeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4f46e5',
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
    marginTop: 12,
  },
  addAddressText: {
    color: '#4f46e5',
    fontWeight: '700',
    fontSize: 13,
  },
  loadingBox: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyAddressBox: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#1e293b',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyAddText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  errorBanner: {
    padding: 14,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  trustRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  trustCol: {
    alignItems: 'center',
    flex: 1,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#334155',
    marginTop: 6,
  },
  trustDivider: {
    height: 28,
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payableLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  payableAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  placeOrderBtn: {
    paddingHorizontal: 32,
    height: 48,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
  },
  disabledBtn: {
    backgroundColor: '#cbd5e1',
    opacity: 0.6,
  },
  placeOrderText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  authSubtitle: {
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  primaryBtn: {
    width: '100%',
    height: 54,
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
});
