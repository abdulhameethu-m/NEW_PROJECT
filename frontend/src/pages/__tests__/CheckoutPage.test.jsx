import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

// 2. Mock Global Stores & Contexts
vi.mock('../../context/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../../context/BrandingContext', () => ({
  useBranding: vi.fn(),
}));

// 3. Mock Custom Hooks
vi.mock('../../hooks/useCart', () => ({
  useCart: vi.fn(),
}));

// 4. Mock Services & Utilities
vi.mock('../../services/checkoutService', () => ({
  prepareCheckout: vi.fn(),
  prepareGuestCheckout: vi.fn(),
  createOrder: vi.fn(),
}));

vi.mock('../../services/paymentService', () => ({
  verifyRazorpayPayment: vi.fn(),
  createCodAdvanceOrder: vi.fn(),
  createRazorpayOrder: vi.fn(),
}));

vi.mock('../../services/pricingService', () => ({
  getPricingConfig: vi.fn(),
  calculatePriceBreakdown: vi.fn(),
}));

vi.mock('../../services/recommendationService', () => ({
  getCheckoutRecommendations: vi.fn(),
  getFbtRecommendations: vi.fn(),
}));

vi.mock('../../services/userService', () => ({
  getUserAddresses: vi.fn(),
  createUserAddress: vi.fn(),
}));

vi.mock('../../services/influencerCommerceService', () => ({
  trackAffiliateEvent: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../utils/razorpayLoader', () => ({
  ensureRazorpay: vi.fn().mockResolvedValue(true),
}));

// Import the mocked hooks so we can override their return values
import { CheckoutPage } from '../CheckoutPage';
import { BrowserRouter } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { useBranding } from '../../context/BrandingContext';
import { useCart } from '../../hooks/useCart';
import * as checkoutService from '../../services/checkoutService';
import * as userService from '../../services/userService';
import * as pricingService from '../../services/pricingService';
import * as recommendationService from '../../services/recommendationService';

describe('CheckoutPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default implementations for hooks
    useBranding.mockReturnValue({ branding: { companyName: 'TestCo' } });
    
    useAuthStore.mockImplementation((selector) => {
      // Return true for isAuthenticated, null for user
      return selector.toString().includes('isAuthenticated') ? true : null;
    });

    useCart.mockReturnValue({
      cart: {
        items: [
          { productId: { _id: '1', name: 'Test Product' }, quantity: 1, price: 100 }
        ],
        totalAmount: 100
      },
      addItem: vi.fn(),
      updateItem: vi.fn(),
      removeItem: vi.fn(),
      validateCart: vi.fn(),
      refreshCart: vi.fn(),
      guestCartId: 'guest123',
    });

    checkoutService.prepareCheckout.mockResolvedValue({
      data: { subtotal: 100, chargesTotal: 10, total: 110, sellers: [] }
    });

    pricingService.getPricingConfig.mockResolvedValue({
      data: null
    });

    recommendationService.getCheckoutRecommendations.mockResolvedValue({ data: [] });
    recommendationService.getFbtRecommendations.mockResolvedValue({ data: null });

    userService.getUserAddresses.mockResolvedValue({
      data: [{
        _id: 'addr1',
        fullName: 'John Doe',
        phone: '1234567890',
        line1: '123 Test St',
        city: 'Testville',
        state: 'TS',
        postalCode: '12345',
        country: 'India',
        isDefault: true
      }]
    });
  });

  const renderComponent = () => render(
    <BrowserRouter>
      <CheckoutPage />
    </BrowserRouter>
  );

  it('renders the checkout page and loads checkout data', async () => {
    renderComponent();

    // Verify it renders the main structural elements
    // The page shows a loader initially, then renders the actual content
    await waitFor(() => {
      // It should display the Delivery Address section
      expect(screen.getByText(/Select delivery address/i)).toBeInTheDocument();
      // It should display Order Summary section
      expect(screen.getByText(/Review your order/i)).toBeInTheDocument();
      // It should display Payment options
      expect(screen.getByText(/Choose payment/i)).toBeInTheDocument();
    });
  });

  it('handles empty cart by showing empty state or redirecting', async () => {
    checkoutService.prepareCheckout.mockResolvedValue({ data: null });
    
    useCart.mockReturnValue({
      cart: { items: [], totalAmount: 0 },
      validateCart: vi.fn(),
      refreshCart: vi.fn(),
    });

    renderComponent();
    
    // Check for the specific empty text button
    expect(await screen.findByText(/Go to shopping/i)).toBeInTheDocument();
  });
});
