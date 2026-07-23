import { describe, it, expect, beforeEach } from 'vitest';
import useAuthCartStore from '../authCartStore';

describe('authCartStore (Zustand)', () => {
  // Reset the store before each test
  beforeEach(() => {
    const { clearCart } = useAuthCartStore.getState();
    clearCart();
  });

  it('should initialize with an empty cart', () => {
    const state = useAuthCartStore.getState();
    expect(state.cart.items).toEqual([]);
    expect(state.cart.totalAmount).toBe(0);
    // Because it goes through normalizeCartPayload, we expect other standard fields
    expect(state.cart).toHaveProperty('itemCount');
    expect(state.cart).toHaveProperty('totalQuantity');
  });

  it('should allow setting a new cart', () => {
    const { setCart } = useAuthCartStore.getState();
    const newCart = {
      items: [{ productId: '123', price: 50, quantity: 2 }],
      totalAmount: 100,
    };
    
    setCart(newCart);
    const state = useAuthCartStore.getState();
    
    expect(state.cart.items).toHaveLength(1);
    expect(state.cart.items[0].productId).toBe('123');
    expect(state.cart.totalAmount).toBe(100);
  });

  it('should allow clearing the cart', () => {
    const { setCart, clearCart } = useAuthCartStore.getState();
    
    // Set some state
    setCart({ items: [{ productId: 'abc', price: 10, quantity: 1 }], totalAmount: 10 });
    expect(useAuthCartStore.getState().cart.items).toHaveLength(1);
    
    // Clear it
    clearCart();
    const state = useAuthCartStore.getState();
    
    expect(state.cart.items).toHaveLength(0);
    expect(state.cart.totalAmount).toBe(0);
  });
});
