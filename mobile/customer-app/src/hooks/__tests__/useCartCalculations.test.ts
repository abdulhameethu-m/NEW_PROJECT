import { renderHook } from '@testing-library/react-native';
import {
  calculateSubtotal,
  calculateDiscount,
  calculateTieredShipping,
  calculateCartTotals,
  roundCurrency,
  useCartCalculations,
} from '../useCartCalculations';
import { useCart } from '../useCart';

jest.mock('../useCart', () => ({
  useCart: jest.fn(() => ({
    data: {
      items: [],
      totalAmount: 0,
    },
    isLoading: false,
  })),
}));

describe('Cart Pricing & Calculations (useCartCalculations)', () => {
  describe('roundCurrency Helper', () => {
    it('rounds numbers correctly to 2 decimal places', () => {
      expect(roundCurrency(19.99)).toBe(19.99);
      expect(roundCurrency(19.994)).toBe(19.99);
      expect(roundCurrency(19.995)).toBe(20.0);
      expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
    });

    it('handles NaN, Infinity, and invalid numbers safely', () => {
      expect(roundCurrency(NaN)).toBe(0);
      expect(roundCurrency(Infinity)).toBe(0);
      expect(roundCurrency(-Infinity)).toBe(0);
    });
  });

  describe('Multi-Item Subtotal & Floating-Point Edge Cases', () => {
    it('calculates zero subtotal and zero quantities for empty cart', () => {
      const result = calculateSubtotal([]);
      expect(result.subtotal).toBe(0);
      expect(result.rawSubtotal).toBe(0);
      expect(result.savings).toBe(0);
      expect(result.itemCount).toBe(0);
      expect(result.totalQuantity).toBe(0);
    });

    it('calculates subtotal for single item with multiple quantities', () => {
      const items = [{ price: 499, quantity: 3 }];
      const result = calculateSubtotal(items);

      expect(result.subtotal).toBe(1497);
      expect(result.rawSubtotal).toBe(1497);
      expect(result.itemCount).toBe(1);
      expect(result.totalQuantity).toBe(3);
    });

    it('calculates multi-item cart correctly without floating-point drift', () => {
      // 19.99 * 3 = 59.97
      // 9.95 * 2 = 19.90
      // 0.10 * 1 = 0.10
      // Expected total: 79.97 (in raw JS this drifts to 79.97000000000001)
      const items = [
        { price: 19.99, quantity: 3 },
        { price: 9.95, quantity: 2 },
        { price: 0.1, quantity: 1 },
      ];

      const result = calculateSubtotal(items);
      expect(result.subtotal).toBe(79.97);
      expect(result.itemCount).toBe(3);
      expect(result.totalQuantity).toBe(6);
    });

    it('prioritizes discountPrice over original price and tracks total savings', () => {
      const items = [
        { price: 1000, discountPrice: 799, quantity: 2 }, // savings: (1000 - 799) * 2 = 402
        { price: 500, quantity: 1 }, // savings: 0
      ];

      const result = calculateSubtotal(items);
      expect(result.subtotal).toBe(799 * 2 + 500); // 2098
      expect(result.rawSubtotal).toBe(2500);
      expect(result.savings).toBe(402);
      expect(result.totalQuantity).toBe(3);
    });

    it('ignores zero or negative quantity items safely', () => {
      const items = [
        { price: 299, quantity: 2 },
        { price: 599, quantity: 0 },
        { price: 999, quantity: -3 },
      ];

      const result = calculateSubtotal(items);
      expect(result.subtotal).toBe(598);
      expect(result.itemCount).toBe(1);
      expect(result.totalQuantity).toBe(2);
    });
  });

  describe('Flat and Percentage Discount Deductions', () => {
    it('applies flat discount deduction correctly', () => {
      const subtotal = 1000;
      const discount = calculateDiscount(subtotal, {
        type: 'FLAT',
        value: 150,
      });

      expect(discount).toBe(150);
    });

    it('caps flat discount so it cannot exceed the cart subtotal', () => {
      const subtotal = 200;
      const discount = calculateDiscount(subtotal, {
        type: 'FLAT',
        value: 500,
      });

      expect(discount).toBe(200); // Capped at subtotal, cannot make total negative
    });

    it('applies percentage discount calculation with exact float precision', () => {
      const subtotal = 399; // 15% of 399 = 59.85
      const discount = calculateDiscount(subtotal, {
        type: 'PERCENTAGE',
        value: 15,
      });

      expect(discount).toBe(59.85);
    });

    it('enforces maxDiscount cap for percentage discounts', () => {
      const subtotal = 2000;
      // 50% of 2000 is 1000, but capped at maxDiscount 250
      const discount = calculateDiscount(subtotal, {
        type: 'PERCENTAGE',
        value: 50,
        maxDiscount: 250,
      });

      expect(discount).toBe(250);
    });

    it('enforces minOrderValue requirements for coupons', () => {
      const discountConfig = {
        type: 'FLAT' as const,
        value: 100,
        minOrderValue: 999,
      };

      // Below minimum order value
      expect(calculateDiscount(500, discountConfig)).toBe(0);

      // Meets or exceeds minimum order value
      expect(calculateDiscount(999, discountConfig)).toBe(100);
      expect(calculateDiscount(1500, discountConfig)).toBe(100);
    });

    it('returns zero discount for null, undefined, or empty coupon', () => {
      expect(calculateDiscount(1000, null)).toBe(0);
      expect(calculateDiscount(1000, undefined)).toBe(0);
      expect(calculateDiscount(0, { type: 'FLAT', value: 100 })).toBe(0);
    });
  });

  describe('Tiered Shipping Fee & Free Shipping Threshold', () => {
    it('returns zero shipping for empty cart', () => {
      const shipping = calculateTieredShipping(0);
      expect(shipping.fee).toBe(0);
      expect(shipping.isFree).toBe(false);
      expect(shipping.amountNeeded).toBe(499);
    });

    it('charges standard shipping (₹60) for orders under Tier 1 (under ₹250)', () => {
      const shipping = calculateTieredShipping(199);
      expect(shipping.fee).toBe(60);
      expect(shipping.isFree).toBe(false);
      expect(shipping.amountNeeded).toBe(300); // 499 - 199 = 300
    });

    it('charges reduced Tier 1 shipping (₹40) for orders between ₹250 and ₹499', () => {
      const shipping = calculateTieredShipping(350);
      expect(shipping.fee).toBe(40);
      expect(shipping.isFree).toBe(false);
      expect(shipping.amountNeeded).toBe(149); // 499 - 350 = 149
    });

    it('grants free shipping (₹0) when reaching exact free shipping threshold (₹499)', () => {
      const shipping = calculateTieredShipping(499);
      expect(shipping.fee).toBe(0);
      expect(shipping.isFree).toBe(true);
      expect(shipping.amountNeeded).toBe(0);
    });

    it('grants free shipping for large orders above threshold', () => {
      const shipping = calculateTieredShipping(2499);
      expect(shipping.fee).toBe(0);
      expect(shipping.isFree).toBe(true);
      expect(shipping.amountNeeded).toBe(0);
    });

    it('supports custom tiered shipping configurations', () => {
      const customConfig = {
        freeShippingThreshold: 999,
        tier1Threshold: 500,
        standardShippingFee: 100,
        tier1ShippingFee: 50,
      };

      const order1 = calculateTieredShipping(300, customConfig);
      expect(order1.fee).toBe(100);
      expect(order1.amountNeeded).toBe(699);

      const order2 = calculateTieredShipping(600, customConfig);
      expect(order2.fee).toBe(50);
      expect(order2.amountNeeded).toBe(399);

      const order3 = calculateTieredShipping(1000, customConfig);
      expect(order3.fee).toBe(0);
      expect(order3.isFree).toBe(true);
      expect(order3.amountNeeded).toBe(0);
    });
  });

  describe('Comprehensive calculateCartTotals Scenarios', () => {
    it('calculates full checkout breakdown with items, discount, tiered shipping, and tax', () => {
      const result = calculateCartTotals({
        items: [
          { price: 200, quantity: 1 },
          { price: 100, quantity: 1 },
        ], // Subtotal: 300
        discount: {
          type: 'FLAT',
          value: 50,
        }, // Post-discount subtotal: 250
        taxRate: 0.18, // 18% GST on 250 = 45
      });

      expect(result.subtotal).toBe(300);
      expect(result.discountAmount).toBe(50);
      expect(result.taxableAmount).toBe(250);
      // Shipping tier for 300 subtotal is ₹40
      expect(result.shippingFee).toBe(40);
      expect(result.taxAmount).toBe(45);
      // Total: 250 (merchandise) + 40 (shipping) + 45 (tax) = 335
      expect(result.totalAmount).toBe(335);
      expect(result.formatCurrency(result.totalAmount)).toContain('335');
    });

    it('formats Indian currency strings correctly', () => {
      const result = calculateCartTotals({ items: [] });
      expect(result.formatCurrency(123456.78)).toBe('₹1,23,456.78');
      expect(result.formatCurrency(500)).toBe('₹500');
    });
  });

  describe('useCartCalculations Hook Integration', () => {
    it('reads items from useCart() store when items are not explicitly passed', async () => {
      (useCart as jest.Mock).mockReturnValue({
        data: {
          items: [
            {
              price: 299,
              quantity: 2,
              productId: { _id: 'p1', discountPrice: 249 },
            },
          ],
        },
        isLoading: false,
      });

      const { result } = await renderHook(() => useCartCalculations());

      expect(result.current.itemCount).toBe(1);
      expect(result.current.totalQuantity).toBe(2);
      expect(result.current.subtotal).toBe(498); // 249 * 2
      expect(result.current.rawSubtotal).toBe(598); // 299 * 2
      expect(result.current.savingsFromDiscountPrice).toBe(100);
      expect(result.current.isFreeShipping).toBe(false);
      expect(result.current.shippingFee).toBe(40); // 498 >= 250
    });

    it('allows overriding items explicitly via hook options', async () => {
      const { result } = await renderHook(() =>
        useCartCalculations({
          items: [{ price: 600, quantity: 1 }],
        })
      );

      expect(result.current.subtotal).toBe(600);
      expect(result.current.isFreeShipping).toBe(true);
      expect(result.current.shippingFee).toBe(0);
    });
  });
});
