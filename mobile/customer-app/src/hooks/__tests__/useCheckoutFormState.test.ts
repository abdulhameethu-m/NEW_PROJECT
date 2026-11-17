import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useCheckoutFormState } from '../useCheckoutFormState';
import { useAddresses } from '../useAddresses';
import { usePrepareCheckout } from '../useCheckout';
import { createRazorpayOrder, verifyRazorpayPayment } from '../../api/checkout';
import { getActiveTrackingToken, clearAttribution } from '../../utils/attributionStorage';
import { hapticFeedback } from '../../utils/haptics';
import { BackHandler } from 'react-native';

const mockRouter = {
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
};

const mockQueryClient = {
  setQueryData: jest.fn(),
  invalidateQueries: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mockQueryClient,
}));

jest.mock('../../stores/authStore', () => ({
  useAuthStore: jest.fn(() => ({
    status: 'AUTHENTICATED',
    user: { _id: 'user_1', name: 'John Doe', email: 'john@example.com' },
  })),
}));

const mockCartData = {
  _id: 'cart_1',
  items: [
    { productId: 'prod_1', title: 'Running Shoes', price: 1500, quantity: 1 },
  ],
  totalAmount: 1500,
  itemCount: 1,
};

jest.mock('../useCart', () => ({
  useCart: jest.fn(() => ({
    data: mockCartData,
    isLoading: false,
  })),
  CART_QUERY_KEY: ['cart'],
}));

const mockAddressesList = [
  {
    _id: 'addr_metro',
    name: 'John Doe',
    phone: '9876543210',
    addressLine: '123 Marine Drive',
    district: 'Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    country: 'India',
    isDefault: true,
  },
  {
    _id: 'addr_remote',
    name: 'Jane Doe',
    phone: '9876543210',
    addressLine: '456 Valley Road',
    district: 'Srinagar',
    city: 'Srinagar',
    state: 'Jammu & Kashmir',
    pincode: '190001',
    country: 'India',
    isDefault: false,
  },
];

const mockCreateAddressMutation = jest.fn();
const mockDeleteAddressMutation = jest.fn();

jest.mock('../useAddresses', () => ({
  useAddresses: jest.fn(() => ({
    data: mockAddressesList,
    isLoading: false,
  })),
  useCreateAddress: jest.fn(() => ({
    mutateAsync: mockCreateAddressMutation,
    isPending: false,
  })),
  useDeleteAddress: jest.fn(() => ({
    mutate: mockDeleteAddressMutation,
  })),
}));

const mockPreparedSummaryData: any = {
  subtotal: 1500,
  shippingFee: 0,
  totalAmount: 1500,
  codAvailability: {
    codAvailable: true,
    reasons: [],
  },
};

const mockPlaceOrderMutation = jest.fn();

jest.mock('../useCheckout', () => ({
  usePrepareCheckout: jest.fn(() => ({
    data: mockPreparedSummaryData,
    isLoading: false,
  })),
  useCreateOrder: jest.fn(() => ({
    mutateAsync: mockPlaceOrderMutation,
    isPending: false,
  })),
}));

jest.mock('../../api/checkout', () => ({
  createRazorpayOrder: jest.fn(),
  verifyRazorpayPayment: jest.fn(),
}));

jest.mock('../../utils/attributionStorage', () => ({
  getActiveTrackingToken: jest.fn(),
  clearAttribution: jest.fn(),
}));

jest.mock('../../utils/haptics', () => ({
  hapticFeedback: {
    paymentSuccess: jest.fn(),
    paymentError: jest.fn(),
  },
}));

describe('useCheckoutFormState Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getActiveTrackingToken as jest.Mock).mockResolvedValue('affiliate_influencer_token_xyz');
    (clearAttribution as jest.Mock).mockResolvedValue(undefined);
    (useAddresses as jest.Mock).mockReturnValue({
      data: mockAddressesList,
      isLoading: false,
    });
    (usePrepareCheckout as jest.Mock).mockReturnValue({
      data: { ...mockPreparedSummaryData, codAvailability: { codAvailable: true, reasons: [] } },
      isLoading: false,
    });
  });

  describe('Address Auto-Selection & Switching', () => {
    it('automatically selects default address on initial load', async () => {
      const { result } = await renderHook(() => useCheckoutFormState());

      await waitFor(() => {
        expect(result.current?.selectedAddressId).toBe('addr_metro');
      });

      expect(result.current.activeAddress?._id).toBe('addr_metro');
      expect(result.current.activeAddress?.city).toBe('Mumbai');
    });

    it('falls back to the first address if no address is flagged as default', async () => {
      const nonDefaultAddresses = [
        { ...mockAddressesList[1], _id: 'addr_first', isDefault: false },
        { ...mockAddressesList[0], _id: 'addr_second', isDefault: false },
      ];
      (useAddresses as jest.Mock).mockReturnValue({
        data: nonDefaultAddresses,
        isLoading: false,
      });

      const { result } = await renderHook(() => useCheckoutFormState());

      await waitFor(() => {
        expect(result.current?.selectedAddressId).toBe('addr_first');
      });

      expect(result.current.activeAddress?._id).toBe('addr_first');
    });

    it('handles empty address list with null activeAddress', async () => {
      (useAddresses as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
      });

      const { result } = await renderHook(() => useCheckoutFormState());

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(result.current.selectedAddressId).toBe('');
      expect(result.current.activeAddress).toBeNull();
    });

    it('allows manually switching selected address', async () => {
      const { result } = await renderHook(() => useCheckoutFormState());

      await waitFor(() => {
        expect(result.current?.selectedAddressId).toBe('addr_metro');
      });

      await act(async () => {
        result.current.setSelectedAddressId('addr_remote');
      });

      expect(result.current.selectedAddressId).toBe('addr_remote');
      expect(result.current.activeAddress?._id).toBe('addr_remote');
      expect(result.current.activeAddress?.city).toBe('Srinagar');
    });
  });

  describe('Dynamic Delivery Estimates', () => {
    it('calculates 2-day delivery estimate for Mumbai Metro pincode (400001)', async () => {
      const { result } = await renderHook(() => useCheckoutFormState());

      await waitFor(() => {
        expect(result.current?.activeAddress?.pincode).toBe('400001');
      });

      expect(result.current.deliveryEstimate.transitDays).toBeLessThanOrEqual(3);
      expect(result.current.deliveryEstimate.codAvailable).toBe(true);
      expect(result.current.deliveryEstimate.formattedDate).toBeDefined();
    });

    it('updates delivery estimate dynamically when switching to remote pincode (190001)', async () => {
      const { result } = await renderHook(() => useCheckoutFormState());

      await waitFor(() => {
        expect(result.current?.activeAddress?.pincode).toBe('400001');
      });

      await act(async () => {
        result.current.setSelectedAddressId('addr_remote');
      });

      expect(result.current.activeAddress?.pincode).toBe('190001');
      expect(result.current.deliveryEstimate.transitDays).toBeGreaterThanOrEqual(5);
      expect(result.current.deliveryEstimate.isEligibleForFastDelivery).toBe(false);
    });
  });

  describe('Payment Method Toggling', () => {
    it('initializes with COD as default payment method', async () => {
      const { result } = await renderHook(() => useCheckoutFormState());

      await waitFor(() => {
        expect(result.current?.selectedAddressId).toBe('addr_metro');
      });

      expect(result.current.paymentMethod).toBe('COD');
    });

    it('toggles payment method between COD and ONLINE', async () => {
      const { result } = await renderHook(() => useCheckoutFormState());

      await waitFor(() => {
        expect(result.current?.selectedAddressId).toBe('addr_metro');
      });

      await act(async () => {
        result.current.setPaymentMethod('ONLINE');
      });
      expect(result.current.paymentMethod).toBe('ONLINE');

      await act(async () => {
        result.current.setPaymentMethod('COD');
      });
      expect(result.current.paymentMethod).toBe('COD');
    });
  });

  describe('Place Order Disabling Conditions', () => {
    it('disables Place Order button when no address is available', async () => {
      (useAddresses as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
      });

      const { result } = await renderHook(() => useCheckoutFormState());

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      expect(result.current.isPlaceOrderDisabled).toBe(true);
    });

    it('disables Place Order button when COD is selected but not available for address', async () => {
      (usePrepareCheckout as jest.Mock).mockReturnValue({
        data: {
          ...mockPreparedSummaryData,
          codAvailability: {
            codAvailable: false,
            reasons: ['Cash on delivery is disabled for this pincode by courier partner.'],
          },
        },
        isLoading: false,
      });

      const { result } = await renderHook(() => useCheckoutFormState());

      await waitFor(() => {
        expect(result.current?.selectedAddressId).toBe('addr_metro');
      });

      expect(result.current.paymentMethod).toBe('COD');
      expect(result.current.isPlaceOrderDisabled).toBe(true);

      // Switching to ONLINE should re-enable Place Order
      await act(async () => {
        result.current.setPaymentMethod('ONLINE');
      });

      expect(result.current.isPlaceOrderDisabled).toBe(false);
    });

    it('sets checkoutError and prevents COD modal if handlePlaceOrder called when COD restricted', async () => {
      (usePrepareCheckout as jest.Mock).mockReturnValue({
        data: {
          ...mockPreparedSummaryData,
          codAvailability: {
            codAvailable: false,
            reasons: ['Cash on delivery restricted.'],
          },
        },
        isLoading: false,
      });

      const { result } = await renderHook(() => useCheckoutFormState());

      await waitFor(() => {
        expect(result.current?.selectedAddressId).toBe('addr_metro');
      });

      await act(async () => {
        await result.current.handlePlaceOrder();
      });

      expect(result.current.checkoutError).toBe('Cash on delivery restricted.');
      expect(result.current.isCodModalVisible).toBe(false);
    });
  });

  describe('Attribution Tracking Token & Order Placement', () => {
    it('extracts attribution tracking token on mount', async () => {
      await renderHook(() => useCheckoutFormState());

      await waitFor(() => {
        expect(getActiveTrackingToken).toHaveBeenCalledTimes(1);
      });
    });

    it('processes COD order placement, clears attribution, and navigates to order-success', async () => {
      mockPlaceOrderMutation.mockResolvedValueOnce({
        orderGroupId: 'GRP_123',
        orders: [
          {
            _id: 'ord_1',
            orderNumber: 'ORD-9999',
            totalAmount: 1500,
          },
        ],
      });

      const { result } = await renderHook(() => useCheckoutFormState());

      await waitFor(() => {
        expect(result.current?.selectedAddressId).toBe('addr_metro');
      });

      await act(async () => {
        await result.current.processCodOrderPlacement();
      });

      expect(mockPlaceOrderMutation).toHaveBeenCalledWith({
        shippingAddress: expect.objectContaining({
          fullName: 'John Doe',
          city: 'Mumbai',
          postalCode: '400001',
        }),
        paymentMethod: 'COD',
        trackingToken: 'affiliate_influencer_token_xyz',
      });

      expect(clearAttribution).toHaveBeenCalledTimes(1);
      expect(hapticFeedback.paymentSuccess).toHaveBeenCalledTimes(1);
      expect(result.current.isCodModalVisible).toBe(false);

      expect(mockRouter.replace).toHaveBeenCalledWith({
        pathname: '/order-success',
        params: expect.objectContaining({
          orderId: 'ord_1',
          orderNumber: 'ORD-9999',
          paymentMethod: 'COD',
          totalAmount: '1500',
        }),
      });
    });

    it('handles native online payment initiation and sheet visibility', async () => {
      (createRazorpayOrder as jest.Mock).mockResolvedValueOnce({
        key_id: 'rzp_test_key_123',
        razorpay_order_id: 'order_rzp_777',
        amount: 150000,
        currency: 'INR',
      });

      const { result } = await renderHook(() => useCheckoutFormState());

      await waitFor(() => {
        expect(result.current?.selectedAddressId).toBe('addr_metro');
      });

      await act(async () => {
        result.current.setPaymentMethod('ONLINE');
      });

      await act(async () => {
        await result.current.handlePlaceOrder();
      });

      expect(createRazorpayOrder).toHaveBeenCalledWith({
        shippingAddress: expect.objectContaining({
          city: 'Mumbai',
        }),
        trackingToken: 'affiliate_influencer_token_xyz',
      });

      expect(result.current.isPaymentSheetVisible).toBe(true);
      expect(result.current.razorpayOrderData?.razorpay_order_id).toBe('order_rzp_777');
    });

    it('verifies online payment success, purges cart cache, clears attribution, and redirects', async () => {
      (verifyRazorpayPayment as jest.Mock).mockResolvedValueOnce({
        orderGroupId: 'GRP_ONLINE_555',
        orders: [
          {
            _id: 'ord_online_1',
            orderNumber: 'ORD-ONLINE-100',
            totalAmount: 1500,
          },
        ],
      });

      const { result } = await renderHook(() => useCheckoutFormState());

      await waitFor(() => {
        expect(result.current?.selectedAddressId).toBe('addr_metro');
      });

      await act(async () => {
        await result.current.handleNativePaymentSuccess({
          razorpay_payment_id: 'pay_999',
          razorpay_order_id: 'order_rzp_777',
          razorpay_signature: 'signature_abc',
        });
      });

      expect(verifyRazorpayPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          razorpay_order_id: 'order_rzp_777',
          razorpay_payment_id: 'pay_999',
          razorpay_signature: 'signature_abc',
        })
      );

      expect(clearAttribution).toHaveBeenCalledTimes(1);
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(['cart'], expect.any(Object));
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['cart'] });
      expect(hapticFeedback.paymentSuccess).toHaveBeenCalledTimes(1);
      expect(result.current.isPaymentSheetVisible).toBe(false);

      expect(mockRouter.replace).toHaveBeenCalledWith({
        pathname: '/order-success',
        params: expect.objectContaining({
          orderNumber: 'ORD-ONLINE-100',
          paymentMethod: 'ONLINE',
        }),
      });
    });

    it('handles online payment failure callback', async () => {
      const { result } = await renderHook(() => useCheckoutFormState());

      await waitFor(() => {
        expect(result.current?.selectedAddressId).toBe('addr_metro');
      });

      await act(async () => {
        result.current.handleNativePaymentFailure('User cancelled payment');
      });

      expect(hapticFeedback.paymentError).toHaveBeenCalledTimes(1);
      expect(result.current.isPaymentSheetVisible).toBe(false);
      expect(result.current.checkoutError).toBe('User cancelled payment');
    });
  });

  describe('Hardware BackHandler Locks During Payment', () => {
    it('registers hardware back listener when online payment flow is active', async () => {
      const addEventListenerSpy = jest.spyOn(BackHandler, 'addEventListener');

      const { result } = await renderHook(() => useCheckoutFormState());

      await waitFor(() => {
        expect(result.current?.selectedAddressId).toBe('addr_metro');
      });

      await act(async () => {
        result.current.setIsPaymentSheetVisible(true);
      });

      expect(addEventListenerSpy).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function));
    });
  });
});
