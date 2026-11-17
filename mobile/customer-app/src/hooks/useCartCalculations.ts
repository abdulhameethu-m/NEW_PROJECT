import { useMemo } from 'react';
import { useCart } from './useCart';

export interface CalculationCartItem {
  price: number;
  quantity: number;
  discountPrice?: number;
}

export type DiscountType = 'FLAT' | 'PERCENTAGE';

export interface DiscountConfig {
  type: DiscountType;
  value: number; // e.g. 100 for ₹100 flat, or 10 for 10%
  maxDiscount?: number; // Maximum ceiling for percentage discounts
  minOrderValue?: number; // Minimum subtotal required for discount to apply
}

export interface TieredShippingConfig {
  freeShippingThreshold: number; // Default: 499
  standardShippingFee: number; // Default: 60 (for orders < Tier 1)
  tier1Threshold: number; // Default: 250
  tier1ShippingFee: number; // Default: 40 (for orders between Tier 1 and Free Shipping)
}

export interface CartCalculationOptions {
  items?: CalculationCartItem[];
  discount?: DiscountConfig | null;
  shippingConfig?: Partial<TieredShippingConfig>;
  taxRate?: number; // e.g. 0.05 for 5% GST/Tax, default 0
}

export interface CartCalculationResult {
  itemCount: number;
  totalQuantity: number;
  rawSubtotal: number;
  subtotal: number;
  savingsFromDiscountPrice: number;
  discountAmount: number;
  shippingFee: number;
  isFreeShipping: boolean;
  amountNeededForFreeShipping: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  formatCurrency: (val: number) => string;
}

export const DEFAULT_SHIPPING_CONFIG: TieredShippingConfig = {
  freeShippingThreshold: 499,
  tier1Threshold: 250,
  standardShippingFee: 60,
  tier1ShippingFee: 40,
};

/**
 * Rounds monetary amounts to 2 decimal places avoiding IEEE-754 floating point precision errors.
 */
export function roundCurrency(val: number): number {
  if (!Number.isFinite(val) || Number.isNaN(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Pure function: Calculates subtotal from cart items handling quantity, discount pricing, and float precision.
 */
export function calculateSubtotal(items: CalculationCartItem[] = []): {
  subtotal: number;
  rawSubtotal: number;
  savings: number;
  itemCount: number;
  totalQuantity: number;
} {
  let subtotal = 0;
  let rawSubtotal = 0;
  let totalQuantity = 0;

  for (const item of items) {
    const qty = Math.max(0, Math.floor(item.quantity || 0));
    if (qty <= 0) continue;

    const unitPrice = Math.max(0, item.discountPrice && item.discountPrice > 0 ? item.discountPrice : item.price || 0);
    const originalPrice = Math.max(0, item.price || 0);

    subtotal += unitPrice * qty;
    rawSubtotal += originalPrice * qty;
    totalQuantity += qty;
  }

  const roundedSubtotal = roundCurrency(subtotal);
  const roundedRawSubtotal = roundCurrency(rawSubtotal);
  const savings = roundCurrency(Math.max(0, roundedRawSubtotal - roundedSubtotal));

  return {
    subtotal: roundedSubtotal,
    rawSubtotal: roundedRawSubtotal,
    savings,
    itemCount: items.filter((i) => (i.quantity || 0) > 0).length,
    totalQuantity,
  };
}

/**
 * Pure function: Calculates discount deduction for flat and percentage coupons.
 */
export function calculateDiscount(
  subtotal: number,
  discount?: DiscountConfig | null
): number {
  if (!discount || subtotal <= 0) return 0;
  if (discount.minOrderValue && subtotal < discount.minOrderValue) return 0;

  let calculatedDiscount = 0;

  if (discount.type === 'FLAT') {
    calculatedDiscount = Math.max(0, discount.value || 0);
  } else if (discount.type === 'PERCENTAGE') {
    const pct = Math.max(0, Math.min(100, discount.value || 0));
    calculatedDiscount = (subtotal * pct) / 100;

    if (discount.maxDiscount && discount.maxDiscount > 0) {
      calculatedDiscount = Math.min(calculatedDiscount, discount.maxDiscount);
    }
  }

  // Discount cannot exceed the subtotal
  return roundCurrency(Math.min(subtotal, Math.max(0, calculatedDiscount)));
}

/**
 * Pure function: Tiered shipping fee calculation and free shipping progress.
 */
export function calculateTieredShipping(
  subtotal: number,
  config?: Partial<TieredShippingConfig>
): {
  fee: number;
  isFree: boolean;
  amountNeeded: number;
} {
  const cfg: TieredShippingConfig = {
    ...DEFAULT_SHIPPING_CONFIG,
    ...config,
  };

  if (subtotal <= 0) {
    return {
      fee: 0,
      isFree: false,
      amountNeeded: cfg.freeShippingThreshold,
    };
  }

  if (subtotal >= cfg.freeShippingThreshold) {
    return {
      fee: 0,
      isFree: true,
      amountNeeded: 0,
    };
  }

  const amountNeeded = roundCurrency(Math.max(0, cfg.freeShippingThreshold - subtotal));

  if (subtotal >= cfg.tier1Threshold) {
    return {
      fee: cfg.tier1ShippingFee,
      isFree: false,
      amountNeeded,
    };
  }

  return {
    fee: cfg.standardShippingFee,
    isFree: false,
    amountNeeded,
  };
}

/**
 * Master pure calculation helper combining subtotal, discounts, tiered shipping, and taxes.
 */
export function calculateCartTotals(options: CartCalculationOptions = {}): CartCalculationResult {
  const { items = [], discount, shippingConfig, taxRate = 0 } = options;

  const { subtotal, rawSubtotal, savings, itemCount, totalQuantity } = calculateSubtotal(items);
  const discountAmount = calculateDiscount(subtotal, discount);
  const postDiscountSubtotal = roundCurrency(Math.max(0, subtotal - discountAmount));

  // Shipping threshold check is based on original eligible subtotal
  const shipping = calculateTieredShipping(subtotal, shippingConfig);

  // Taxes (if any) applied on taxable post-discount merchandise
  const taxAmount = roundCurrency(postDiscountSubtotal * Math.max(0, taxRate));

  const totalAmount = roundCurrency(
    items.length === 0 ? 0 : Math.max(0, postDiscountSubtotal + shipping.fee + taxAmount)
  );

  return {
    itemCount,
    totalQuantity,
    rawSubtotal,
    subtotal,
    savingsFromDiscountPrice: savings,
    discountAmount,
    shippingFee: shipping.fee,
    isFreeShipping: shipping.isFree,
    amountNeededForFreeShipping: shipping.amountNeeded,
    taxableAmount: postDiscountSubtotal,
    taxAmount,
    totalAmount,
    formatCurrency: (val: number) => `₹${roundCurrency(val).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
  };
}

/**
 * React hook: Computes reactive cart pricing, coupon deductions, and tiered shipping.
 */
export function useCartCalculations(options: CartCalculationOptions = {}): CartCalculationResult {
  const { data: cart } = useCart();
  const optionsItems = options.items;
  const cartItems = cart?.items;
  const discount = options.discount;
  const shippingConfig = options.shippingConfig;
  const taxRate = options.taxRate;

  // If items are not passed explicitly, adapt items from useCart()
  const effectiveItems = useMemo<CalculationCartItem[]>(() => {
    if (optionsItems !== undefined) {
      return optionsItems;
    }
    if (!cartItems) return [];

    return cartItems.map((ci) => ({
      price: ci.price,
      quantity: ci.quantity,
      discountPrice: typeof ci.productId === 'object' ? ci.productId?.discountPrice : undefined,
    }));
  }, [optionsItems, cartItems]);

  return useMemo(() => {
    return calculateCartTotals({
      discount,
      shippingConfig,
      taxRate,
      items: effectiveItems,
    });
  }, [effectiveItems, discount, shippingConfig, taxRate]);
}
