import { useState, useEffect, useMemo } from 'react';
import { BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { useCart, CART_QUERY_KEY } from './useCart';
import { useAddresses, useCreateAddress, useDeleteAddress } from './useAddresses';
import { usePrepareCheckout, useCreateOrder } from './useCheckout';
import { toShippingAddress } from '../api/address';
import { createRazorpayOrder, verifyRazorpayPayment } from '../api/checkout';
import { UserAddress } from '../types/checkout';
import { RazorpayOrderDetails, PaymentSuccessResult } from '../components/checkout/NativePaymentBottomSheet';
import { calculateDeliveryEstimate } from '../utils/deliveryEstimator';
import { getActiveTrackingToken, clearAttribution } from '../utils/attributionStorage';
import { hapticFeedback } from '../utils/haptics';

export function useCheckoutFormState() {
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
  const [isPaymentSheetVisible, setIsPaymentSheetVisible] = useState<boolean>(false);
  const [razorpayOrderData, setRazorpayOrderData] = useState<RazorpayOrderDetails | null>(null);
  const [isVerifyingOnlinePayment, setIsVerifyingOnlinePayment] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isOnlinePaying, setIsOnlinePaying] = useState<boolean>(false);
  const [trackingToken, setTrackingToken] = useState<string | null>(null);

  // Load active influencer / affiliate tracking token
  useEffect(() => {
    getActiveTrackingToken().then((token) => {
      if (token) {
        setTrackingToken(token);
        console.log('[Checkout] Loaded active attribution trackingToken for order credit');
      }
    });
  }, []);

  // Prevent accidental navigation away from checkout screen during active online payment flow
  useEffect(() => {
    if (!isOnlinePaying && !isVerifyingOnlinePayment && !isPaymentSheetVisible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      return true;
    });
    return () => subscription.remove();
  }, [isOnlinePaying, isVerifyingOnlinePayment, isPaymentSheetVisible]);

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
      trackingToken: trackingToken || undefined,
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

  // Handle Delete Address
  const handleDeleteAddress = (addressId: string) => {
    deleteAddressMutation(addressId);
  };

  // Payable Amount calculation (no coupons)
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
        trackingToken: trackingToken || undefined,
      });

      // Clear attribution after successful order placement
      await clearAttribution();

      // Micro-vibration on successful order placement
      hapticFeedback.paymentSuccess();

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
      hapticFeedback.paymentError();
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
        // Native Online Payment Flow
        setIsOnlinePaying(true);
        try {
          const razorpayOrder = await createRazorpayOrder({
            shippingAddress,
            trackingToken: trackingToken || undefined,
          });

          const orderKey = razorpayOrder.key_id || razorpayOrder.key || '';
          const orderId = razorpayOrder.razorpay_order_id || razorpayOrder.orderId;

          if (!orderId || !orderKey) {
            throw new Error('Payment configuration missing from server.');
          }

          setRazorpayOrderData({
            key_id: orderKey,
            razorpay_order_id: orderId,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency || 'INR',
            name: shippingAddress.fullName,
            email: user?.email || 'customer@example.com',
            contact: shippingAddress.phone,
          });

          setIsPaymentSheetVisible(true);
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

  // Handle Native Razorpay Payment Success
  const handleNativePaymentSuccess = async (result: PaymentSuccessResult) => {
    if (!shippingAddress) return;
    setIsVerifyingOnlinePayment(true);
    try {
      let verifyRes: any = null;
      let lastVerifyErr: any = null;

      // Resilient verification with retry for timeout & network blips
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          verifyRes = await verifyRazorpayPayment({
            razorpay_order_id: result.razorpay_order_id,
            razorpay_payment_id: result.razorpay_payment_id,
            razorpay_signature: result.razorpay_signature,
            shippingAddress,
            trackingToken: trackingToken || undefined,
          });
          await clearAttribution();
          break;
        } catch (vErr: any) {
          lastVerifyErr = vErr;
          const statusCode = vErr.response?.status;
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
        hapticFeedback.paymentError();
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
        setIsPaymentSheetVisible(false);
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

      // Micro-vibration on successful online payment confirmation
      hapticFeedback.paymentSuccess();
      setIsPaymentSheetVisible(false);

      const firstOrder = verifyRes?.orders?.[0];
      const orderNumber =
        firstOrder?.orderNumber ||
        verifyRes?.orderGroupId ||
        result.razorpay_order_id;
      const orderId = firstOrder?._id || '';
      const totalAmount =
        firstOrder?.totalAmount ??
        preparedSummary?.totalAmount ??
        (razorpayOrderData
          ? razorpayOrderData.amount >= 100
            ? razorpayOrderData.amount / 100
            : razorpayOrderData.amount
          : finalPayable);

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
    } catch (err: any) {
      hapticFeedback.paymentError();
      setIsPaymentSheetVisible(false);
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Payment verification failed. Please check your order status.';
      setCheckoutError(message);
    } finally {
      setIsVerifyingOnlinePayment(false);
    }
  };

  const handleNativePaymentFailure = (errorMsg: string) => {
    hapticFeedback.paymentError();
    setIsPaymentSheetVisible(false);
    setCheckoutError(errorMsg || 'Payment was cancelled or failed.');
  };

  const isPlaceOrderDisabled =
    isPlacingOrder ||
    isOnlinePaying ||
    !activeAddress ||
    (paymentMethod === 'COD' && preparedSummary?.codAvailability?.codAvailable === false);

  return {
    router,
    isAuthenticated,
    user,
    cart,
    isCartLoading,
    addresses,
    isAddressesLoading,
    isCreatingAddress,
    selectedAddressId,
    setSelectedAddressId,
    showAddressList,
    setShowAddressList,
    isAddressModalVisible,
    setAddressModalVisible,
    isCodModalVisible,
    setIsCodModalVisible,
    isPaymentSheetVisible,
    setIsPaymentSheetVisible,
    razorpayOrderData,
    isVerifyingOnlinePayment,
    paymentMethod,
    setPaymentMethod,
    checkoutError,
    setCheckoutError,
    isOnlinePaying,
    isPlacingOrder,
    activeAddress,
    deliveryEstimate,
    shippingAddress,
    preparedSummary,
    isPreparing,
    finalPayable,
    isPlaceOrderDisabled,
    handleSaveAddress,
    handleDeleteAddress,
    processCodOrderPlacement,
    handlePlaceOrder,
    handleNativePaymentSuccess,
    handleNativePaymentFailure,
  };
}
