/* eslint-disable no-unused-vars */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock('../../hooks/useCartDrawer', () => ({
  useCartDrawer: vi.fn(),
}));

vi.mock('../../hooks/useCart', () => ({
  useCart: vi.fn(),
}));

vi.mock('../../services/productService', () => ({
  getRelatedProducts: vi.fn().mockResolvedValue({ data: [] }),
}));

// We need to import the mocked hooks to change their return values in tests
import { CartDrawer } from '../CartDrawer';
import { BrowserRouter } from 'react-router-dom';
import { useCartDrawer } from '../../hooks/useCartDrawer';
import { useCart } from '../../hooks/useCart';
import { useNavigate } from 'react-router-dom';

describe('CartDrawer Component', () => {
  const mockCloseDrawer = vi.fn();
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);

    // Default mock implementation
    useCartDrawer.mockReturnValue({
      isRendered: true,
      isAnimating: true,
      openCount: 1,
      lastAddedProduct: null,
      lastAddedVariant: null,
      lastAddedQuantity: 1,
      closeDrawer: mockCloseDrawer,
      toast: null,
      showToast: vi.fn(),
      clearToast: vi.fn(),
      clearLastAddedItem: vi.fn(),
    });

    useCart.mockReturnValue({
      cart: { items: [], totalAmount: 0, totalQuantity: 0 },
      removeItem: vi.fn(),
      updateItem: vi.fn(),
    });
  });

  const renderComponent = () => render(
    <BrowserRouter>
      <CartDrawer />
    </BrowserRouter>
  );

  it('renders nothing when not rendered', () => {
    useCartDrawer.mockReturnValueOnce({
      isRendered: false,
    });
    
    const { container } = renderComponent();
    // Portal returns null or empty when not rendered
    expect(screen.queryByText('Added to Cart')).not.toBeInTheDocument();
  });

  it('renders the drawer when open', () => {
    renderComponent();
    
    expect(screen.getByText('Added to Cart')).toBeInTheDocument();
    expect(screen.getByText('Cart Summary')).toBeInTheDocument();
    expect(screen.getByText('View Cart')).toBeInTheDocument();
    expect(screen.getByText('Continue Shopping')).toBeInTheDocument();
    expect(screen.getByText('Checkout Now')).toBeInTheDocument();
  });

  it('closes the drawer when clicking the close button', () => {
    renderComponent();
    
    const closeBtn = screen.getByLabelText('Close cart drawer');
    fireEvent.click(closeBtn);
    
    expect(mockCloseDrawer).toHaveBeenCalledTimes(1);
  });

  it('displays cart items correctly', () => {
    useCart.mockReturnValueOnce({
      cart: {
        items: [
          {
            productId: 'p1',
            name: 'Test Product 1',
            price: 50,
            quantity: 2,
            image: 'test.jpg'
          }
        ],
        totalAmount: 100,
        totalQuantity: 2
      },
      removeItem: vi.fn(),
      updateItem: vi.fn(),
    });

    renderComponent();
    
    // Header should say 1 unique item, but quantity is handled in the UI
    expect(screen.getByText('Cart Items (1)')).toBeInTheDocument();
    expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    
    // Check if total amount is formatted (e.g. ₹100.00 assuming DEFAULT_LOCALE is INR)
    // The exact string depends on formatCurrency, we can just check if "100" is on screen
    expect(screen.getAllByText(/100/)).toHaveLength(2); // one for item total, one for cart summary
  });
});
