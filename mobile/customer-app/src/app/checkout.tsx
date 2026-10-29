import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  BackHandler,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { safeGoBack } from '../utils/safeNavigation';
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
  Tag,
  Ticket,
  Truck,
} from 'lucide-react-native';
import { calculateDeliveryEstimate } from '../utils/deliveryEstimator';
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

  // Prevent accidental navigation away from checkout screen during active online payment flow
  useEffect(() => {
    if (!isOnlinePaying) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      return true;
    });
    return () => subscription.remove();
  }, [isOnlinePaying]);

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

  // Dynamic delivery estimate for active address
  const deliveryEstimate = useMemo(() => {
    return calculateDeliveryEstimate(activeAddress?.pincode || activeAddress?.postalCode);
  }, [activeAddress?.pincode, activeAddress?.postalCode]);

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

  // Coupons & Promo Codes Catalog
  const AVAILABLE_COUPONS = [
    {
      code: 'WELCOME10',
      title: '10% OFF',
      description: '10% off up to ₹150 on orders above ₹299',
      type: 'percentage' as const,
      value: 10,
      maxDiscount: 150,
      minOrder: 299,
    },
    {
      code: 'SAVE50',
      title: 'FLAT ₹50 OFF',
      description: 'Flat ₹50 savings on orders above ₹499',
      type: 'fixed' as const,
      value: 50,
      maxDiscount: 50,
      minOrder: 499,
    },
    {
      code: 'FREESHIP',
      title: 'FREE DELIVERY',
      description: 'Waive delivery charges on orders above ₹199',
      type: 'shipping' as const,
      value: 0,
      maxDiscount: 100,
      minOrder: 199,
    },
    {
      code: 'FESTIVE20',
      title: '20% MEGA SAVINGS',
      description: '20% off up to ₹300 on orders above ₹999',
      type: 'percentage' as const,
      value: 20,
      maxDiscount: 300,
      minOrder: 999,
    },
  ];

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    type: 'fixed' | 'percentage';
    description?: string;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Financial calculations
  const basePayable =
    preparedSummary?.totalAmount ??
    cart?.totalAmount ??
    (cart?.items || []).reduce((sum, item) => sum + item.price * item.quantity, 0);

  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const finalPayable = Math.max(0, basePayable - couponDiscount);

  const handleApplyCoupon = (codeToApply?: string) => {
    const rawCode = (codeToApply || couponInput).trim().toUpperCase();
    setCouponError(null);

    if (!rawCode) {
      setCouponError('Please enter a valid coupon code.');
      return;
    }

    setIsApplyingCoupon(true);
    setTimeout(() => {
      const found = AVAILABLE_COUPONS.find((c) => c.code === rawCode);
      const subtotal =
        preparedSummary?.subtotal ??
        cart?.totalAmount ??
        (cart?.items || []).reduce((sum, item) => sum + item.price * item.quantity, 0);
      const shippingFee = preparedSummary?.shippingFee ?? 0;

      if (!found) {
        setCouponError(`Coupon code "${rawCode}" is invalid or expired.`);
        setIsApplyingCoupon(false);
        return;
      }

      if (subtotal < found.minOrder) {
        setCouponError(
          `Minimum order value of ₹${found.minOrder} required for ${found.code}. Current items subtotal: ₹${subtotal}`
        );
        setIsApplyingCoupon(false);
        return;
      }

      let discount = 0;
      if (found.type === 'percentage') {
        discount = Math.min(Math.round((subtotal * found.value) / 100), found.maxDiscount);
      } else if (found.type === 'fixed') {
        discount = found.value;
      } else if (found.type === 'shipping') {
        discount = shippingFee > 0 ? shippingFee : 40;
      }

      setAppliedCoupon({
        code: found.code,
        discount,
        type: found.type === 'percentage' ? 'percentage' : 'fixed',
        description: found.description,
      });
      setCouponInput('');
      setIsApplyingCoupon(false);
    }, 250);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

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
      const orderId = firstOrder?._id || '';
      const totalAmount = firstOrder?.totalAmount ?? preparedSummary?.totalAmount ?? 0;

      router.replace({
        pathname: '/order-success',
        params: {
          orderId,
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
              let verifyRes: any = null;
              let lastVerifyErr: any = null;

              // Resilient verification with retry for timeout & network blips
              for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                  verifyRes = await verifyRazorpayPayment({
                    razorpay_order_id: query.razorpay_order_id,
                    razorpay_payment_id: query.razorpay_payment_id,
                    razorpay_signature: query.razorpay_signature,
                    shippingAddress,
                  });
                  break;
                } catch (vErr: any) {
                  lastVerifyErr = vErr;
                  const statusCode = vErr.response?.status;
                  // If client validation error (other than 408, 409, 429, 504), don't retry
                  if (
                    statusCode &&
                    statusCode >= 400 &&
                    statusCode < 500 &&
                    statusCode !== 408 &&
                    statusCode !== 409 &&
                    statusCode !== 429
                  ) {
                    break;
                  }
                  if (attempt < 3) {
                    await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
                  }
                }
              }

              if (!verifyRes && lastVerifyErr) {
                const isTimeout =
                  lastVerifyErr.response?.status === 504 ||
                  lastVerifyErr.response?.data?.code === 'RAZORPAY_PAYMENT_FETCH_TIMEOUT' ||
                  String(lastVerifyErr.message || '').toLowerCase().includes('timeout');

                if (isTimeout) {
                  setCheckoutError(
                    'Payment was received by Razorpay! Confirmation is synchronizing with your bank. If your account was debited, your order will appear in My Orders momentarily.'
                  );
                } else {
                  const errorMsg =
                    lastVerifyErr.response?.data?.message ||
                    lastVerifyErr.message ||
                    'Payment verification failed. If your bank account was debited, your order will be confirmed automatically via webhook.';
                  setCheckoutError(errorMsg);
                }
                return;
              }

              queryClient.setQueryData(CART_QUERY_KEY, {
                _id: '',
                userId: '',
                items: [],
                totalAmount: 0,
                itemCount: 0,
                currency: 'INR',
              });
              queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });

              const firstOrder = verifyRes?.orders?.[0];
              const orderNumber =
                firstOrder?.orderNumber ||
                verifyRes?.orderGroupId ||
                query.razorpay_order_id;
              const orderId = firstOrder?._id || '';
              const totalAmount =
                firstOrder?.totalAmount ??
                preparedSummary?.totalAmount ??
                razorpayOrder.amount / 100;

              router.replace({
                pathname: '/order-success',
                params: {
                  orderId,
                  orderNumber,
                  orderGroupId: verifyRes?.orderGroupId || '',
                  totalAmount: String(totalAmount),
                  paymentMethod: 'ONLINE',
                  recipientName: shippingAddress.fullName,
                  deliveryCity: `${shippingAddress.city}, ${shippingAddress.state}`,
                },
              });
              return;
            } else if (query.status === 'cancelled') {
              setCheckoutError('Payment cancelled. Your cart is preserved and you can retry when ready.');
            } else {
              setCheckoutError(
                query.error || 'Payment was declined by bank. Please try another card or UPI.'
              );
            }
          } else {
            // User pressed physical Android Back button or dismissed in-app browser
            setCheckoutError('Payment window was closed. Your cart is preserved and no charges were made.');
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
            onPress={() => safeGoBack(router, '/(tabs)/cart')}
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
            onPress={() => safeGoBack(router, '/(tabs)/cart')}
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

                  {/* Estimated Delivery Promise Card */}
                  <View style={styles.deliveryEstimateCard}>
                    <View style={styles.deliveryEstimateIconBg}>
                      <Truck size={17} color="#4f46e5" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.deliveryEstimateTitle}>Estimated Delivery</Text>
                        <View style={styles.expressPill}>
                          <Text style={styles.expressPillText}>Fast Logistics</Text>
                        </View>
                      </View>
                      <Text style={styles.deliveryEstimateDate}>
                        {deliveryEstimate.formattedDate}
                      </Text>
                      <Text style={styles.deliveryEstimateSub}>
                        Shipped via verified courier partners (Delhivery, Shiprocket, Shadowfax)
                      </Text>
                    </View>
                  </View>
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

        {/* 3. Coupons & Offers Section */}
        <View style={{ marginBottom: 20 }}>
          <Text style={styles.sectionHeading}>Coupons & Offers</Text>
          <View style={styles.couponCard}>
            {appliedCoupon ? (
              <View style={styles.appliedCouponBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={styles.appliedTagIcon}>
                    <Tag size={18} color="#16a34a" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.appliedCouponCode}>
                      {appliedCoupon.code} Applied
                    </Text>
                    <Text style={styles.appliedCouponSaving}>
                      You saved ₹{appliedCoupon.discount} on this order!
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleRemoveCoupon} style={styles.removeCouponBtn}>
                  <Text style={styles.removeCouponText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={styles.couponInputRow}>
                  <TextInput
                    style={styles.couponInput}
                    placeholder="Enter coupon code (e.g. SAVE50)"
                    placeholderTextColor="#94a3b8"
                    value={couponInput}
                    onChangeText={(text) => {
                      setCouponInput(text.toUpperCase());
                      if (couponError) setCouponError(null);
                    }}
                    autoCapitalize="characters"
                    returnKeyType="done"
                    onSubmitEditing={() => handleApplyCoupon()}
                  />
                  <TouchableOpacity
                    style={[styles.applyBtn, !couponInput.trim() && styles.applyBtnDisabled]}
                    onPress={() => handleApplyCoupon()}
                    disabled={!couponInput.trim() || isApplyingCoupon}
                    activeOpacity={0.8}
                  >
                    {isApplyingCoupon ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.applyBtnText}>Apply</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {couponError && (
                  <View style={styles.couponErrorRow}>
                    <AlertCircle size={13} color="#ef4444" style={{ marginRight: 4 }} />
                    <Text style={styles.couponErrorText}>{couponError}</Text>
                  </View>
                )}

                {/* Quick Offer Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {AVAILABLE_COUPONS.map((coupon) => (
                    <TouchableOpacity
                      key={coupon.code}
                      style={styles.couponChip}
                      onPress={() => handleApplyCoupon(coupon.code)}
                      activeOpacity={0.7}
                    >
                      <Ticket size={12} color="#4f46e5" style={{ marginRight: 4 }} />
                      <Text style={styles.couponChipCode}>{coupon.code}</Text>
                      <Text style={styles.couponChipDesc}>• {coupon.title}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* 4. Order Items & Price Summary */}
        <View style={{ marginBottom: 20 }}>
          <CheckoutSummaryCard
            items={cart?.items || []}
            summary={preparedSummary}
            isLoading={isPreparing}
            couponDiscount={couponDiscount}
            appliedCoupon={appliedCoupon}
            onRemoveCoupon={handleRemoveCoupon}
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
  couponCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  couponInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  couponInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  applyBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnDisabled: {
    backgroundColor: '#cbd5e1',
    opacity: 0.7,
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  couponErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  couponErrorText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '500',
  },
  chipsScroll: {
    marginTop: 12,
    flexDirection: 'row',
  },
  couponChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  couponChipCode: {
    color: '#4f46e5',
    fontSize: 11,
    fontWeight: '800',
  },
  couponChipDesc: {
    color: '#6366f1',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 3,
  },
  appliedCouponBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
  },
  appliedTagIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appliedCouponCode: {
    color: '#15803d',
    fontSize: 13,
    fontWeight: '800',
  },
  appliedCouponSaving: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  removeCouponBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  removeCouponText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '700',
  },
  deliveryEstimateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  deliveryEstimateIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  deliveryEstimateTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  expressPill: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expressPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4f46e5',
  },
  deliveryEstimateDate: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e40af',
    marginTop: 2,
  },
  deliveryEstimateSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
});
