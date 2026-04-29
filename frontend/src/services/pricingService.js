import { api } from "./api";
import { adminHttp } from "./adminHttp";

/**
 * PUBLIC APIs - No authentication required
 */

/**
 * Get current pricing configuration for checkout calculations
 */
export async function getPricingConfig() {
  const { data } = await api.get("/api/pricing");
  return data;
}

/**
 * ADMIN APIs - Admin authentication required
 */

/**
 * Get pricing configuration (admin view)
 */
export async function getAdminPricingConfig() {
  const { data } = await adminHttp.get("/api/admin/pricing");
  return data;
}

/**
 * Update pricing configuration
 */
export async function updatePricingConfig(id, updates) {
  const { data } = await adminHttp.put(`/api/admin/pricing/${id}`, updates);
  return data;
}

/**
 * Initialize default pricing configuration (one-time setup)
 */
export async function initializePricingConfig() {
  const { data } = await adminHttp.post("/api/admin/pricing/initialize");
  return data;
}

/**
 * Calculate price breakdown for checkout
 * 
 * Applies pricing configuration to order items
 * @param {Object} params
 * @param {number} params.subtotal - Subtotal before fees and tax
 * @param {number} params.discount - Applied discount amount
 * @param {Object} params.pricingConfig - Current pricing configuration
 * @returns {Object} Breakdown object
 */
export function calculatePriceBreakdown(params) {
  const {
    subtotal = 0,
    discount = 0,
    itemCount = 1,
    pricingConfig = {},
  } = params;

  // Get config values with defaults
  const deliveryFee = Number(pricingConfig.deliveryFee || 50);
  const deliveryFreeAbove = Number(pricingConfig.deliveryFreeAbove || 500);
  const platformFeePercentage = Number(pricingConfig.platformFeePercentage || 5);
  const handlingFee = Number(pricingConfig.handlingFee || 0);
  const taxPercentage = Number(pricingConfig.taxPercentage || 18);
  const taxableBasis = pricingConfig.taxableBasis || "subtotal";

  // MRP is original price before discount
  const mrp = subtotal + discount;

  // Determine applicable delivery fee
  let appliedDeliveryFee = 0;
  if (mrp < deliveryFreeAbove) {
    appliedDeliveryFee = deliveryFee;
  }

  // Platform fee (usually 5% of product price)
  const platformFee = (subtotal * platformFeePercentage) / 100;

  // Calculate taxable amount based on configuration
  let taxableAmount = 0;
  switch (taxableBasis) {
    case "subtotal":
      taxableAmount = subtotal;
      break;
    case "subtotalWithoutDiscount":
      taxableAmount = mrp;
      break;
    case "subtotalWithFees":
      taxableAmount = subtotal + appliedDeliveryFee + handlingFee;
      break;
    default:
      taxableAmount = subtotal;
  }

  // Calculate tax
  const taxAmount = (taxableAmount * taxPercentage) / 100;

  // Calculate total
  const totalAmount =
    subtotal +
    appliedDeliveryFee +
    platformFee +
    handlingFee +
    taxAmount -
    discount;

  // Total savings
  const totalSavings = discount;

  return {
    mrp: Math.round(mrp * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    deliveryFee: Math.round(appliedDeliveryFee * 100) / 100,
    platformFee: Math.round(platformFee * 100) / 100,
    handlingFee: Math.round(handlingFee * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalSavings: Math.round(totalSavings * 100) / 100,
    itemCount,
  };
}
