/* eslint-disable no-unused-vars */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCart } from '../useCart';
import { useAuthStore } from '../../context/authStore';
import useGuestCartStore from '../../context/guestCartStore';
import { cartService } from '../../services/cartService';

// Mock the dependencies
vi.mock('../../context/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../../services/cartService', () => ({
  cartService: {
    validateItem: vi.fn(),
    addToCart: vi.fn(),
  },
}));

describe('useCart Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset guest cart store before each test
    const { clearCart } = useGuestCartStore.getState();
    clearCart();
  });

  it('should initialize as guest when not authenticated', () => {
    // Setup mock for guest user
    useAuthStore.mockImplementation((selector) => {
      // Mocking state.isAuthenticated to be false
      return false;
    });

    const { result } = renderHook(() => useCart());

    expect(result.current.isGuest).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.cart.items).toEqual([]);
    expect(result.current.cart.totalAmount).toBe(0);
  });

  it('should allow a guest to add an item to the cart', async () => {
    useAuthStore.mockImplementation(() => false);
    
    // Mock the validateItem service response
    cartService.validateItem.mockResolvedValueOnce({
      action: 'SUCCESS',
      addedItem: {
        productId: 'prod_123',
        price: 100,
        variantId: '',
        name: 'Test Product'
      }
    });

    const { result } = renderHook(() => useCart());

    // Call addItem and wait for it to complete
    await act(async () => {
      await result.current.addItem('prod_123', 2);
    });

    // The guest cart should now contain the item
    expect(result.current.cart.items).toHaveLength(1);
    expect(result.current.cart.items[0].productId).toBe('prod_123');
    expect(result.current.cart.items[0].quantity).toBe(2);
    expect(result.current.cart.totalAmount).toBe(200); // 100 * 2
  });
});
