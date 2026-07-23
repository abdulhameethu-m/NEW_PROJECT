import { api } from "./api";
import { emitCartChanged, normalizeCartPayload } from "../utils/cartState";
import { logger } from "./logger/logger";

const CART_TIMEOUT_MS = 5000;

function guestCartHeaders() {
  try {
    const persisted = JSON.parse(window.localStorage.getItem("guest_cart") || "{}");
    const guestCartId = persisted?.state?.guestCartId;
    return guestCartId ? { "x-guest-cart-id": guestCartId } : {};
  } catch {
    return {};
  }
}

async function cartRequest(endpoint, payload, request) {
  const startedAt = performance.now();
  try {
    return await request();
  } catch (error) {
    logger.error("Cart API request failed", {
      endpoint,
      payload,
      status: error?.response?.status,
      code: error?.code,
      durationMs: Math.round(performance.now() - startedAt),
      message: error?.response?.data?.message || error?.message,
    });
    throw error;
  }
}

// ===== AUTHENTICATED USER ENDPOINTS =====

export async function getCart() {
  const { data } = await cartRequest("GET /api/cart", null, () => api.get("/api/cart", { timeout: CART_TIMEOUT_MS }));
  return normalizeCartPayload(data);
}

export async function addToCart(productId, quantity = 1, variantId = "", attribution = null) {
  const requestPayload = { productId, quantity, variantId };
  // A backend-issued tracking token is a JWT. Never send the public `ref`
  // query value as a token; it is resolved separately by /api/tracking/click.
  if (typeof attribution?.trackingToken === "string" && attribution.trackingToken.split(".").length === 3) {
    requestPayload.trackingToken = attribution.trackingToken;
  }
  if (attribution) {
    requestPayload.attribution = {
      reelId: attribution.reelId || "",
      ref: attribution.trackingCode || attribution.ref || "",
      campaignId: attribution.campaignId || "",
      influencerId: attribution.influencerId || "",
      affiliateLinkId: attribution.affiliateLinkId || "",
      clickId: attribution.clickId || "",
    };
  }
  const { data } = await cartRequest("POST /api/cart/add", requestPayload, () => api.post("/api/cart/add", requestPayload, { timeout: CART_TIMEOUT_MS }));
  const responsePayload = data?.data || data;
  const cart = normalizeCartPayload(responsePayload);
  emitCartChanged(cart);
  return { cart, addedItem: responsePayload?.addedItem || null };
}

export async function updateCartItem(productId, quantity, variantId = "") {
  const payload = { productId, quantity, variantId };
  const { data } = await cartRequest("PATCH /api/cart/update", payload, () => api.patch("/api/cart/update", payload, { timeout: CART_TIMEOUT_MS }));
  const cart = normalizeCartPayload(data);
  emitCartChanged(cart);
  return cart;
}

export async function removeCartItem(productId, variantId = "") {
  const payload = { productId, variantId };
  const { data } = await cartRequest("DELETE /api/cart/remove", payload, () => api.delete("/api/cart/remove", { data: payload, timeout: CART_TIMEOUT_MS }));
  const cart = normalizeCartPayload(data);
  emitCartChanged(cart);
  return cart;
}

export async function clearCart() {
  const { data } = await cartRequest("DELETE /api/cart/clear", null, () => api.delete("/api/cart/clear", { timeout: CART_TIMEOUT_MS }));
  const cart = normalizeCartPayload(data);
  emitCartChanged(cart);
  return cart;
}

// ===== GUEST CART VALIDATION ENDPOINTS =====

/**
 * Validate a single item before adding to guest cart
 * @param {string} productId
 * @param {number} quantity
 * @param {string} variantId
 * @returns {Promise<Object>} Enriched item with price, image, vendor info
 */
export async function validateItem(productId, quantity = 1, variantId = "", cartItems = []) {
  const payload = {
    productId,
    quantity,
    variantId,
    cartItems
  };
  const { data } = await cartRequest("POST /api/cart/validate-item", payload, () => api.post("/api/cart/validate-item", payload, { timeout: CART_TIMEOUT_MS, headers: guestCartHeaders() }));
  return data?.data || data;
}

/**
 * Validate multiple items in guest cart
 * @param {Array} items - Array of cart items
 * @returns {Promise<Object>} {validatedItems, errors, totalAmount}
 */
export async function validateCart(items = []) {
  const { data } = await api.post("/api/cart/validate", { items });
  return data?.data || data;
}

/**
 * Get cart summary for guest (item count, total, validation)
 * @param {Array} items - Array of cart items
 * @returns {Promise<Object>} Cart summary
 */
async function getCartSummary(items = []) {
  const { data } = await api.post("/api/cart/summary", { items });
  return data?.data || data;
}

// ===== CART MERGE ENDPOINTS (Called after login) =====

/**
 * Merge guest cart into authenticated user's cart
 * @param {Array} guestCartItems - Items from guest localStorage
 * @returns {Promise<Object>} Merge result with userCart
 */
export async function mergeGuestCart(guestCartItems = []) {
  const { data } = await api.post("/api/cart/merge", { guestCartItems });
  const payload = data?.data || data;
  const userCart = normalizeCartPayload(payload?.userCart);
  emitCartChanged(userCart);
  return payload;
}

/**
 * Get merge summary before actually merging
 * @param {Array} guestCartItems - Items from guest localStorage
 * @returns {Promise<Object>} Merge summary
 */
async function getMergeSummary(guestCartItems = []) {
  const { data } = await api.post("/api/cart/merge-summary", { guestCartItems });
  return data?.data || data;
}

export const cartService = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  validateItem,
  validateCart,
  getCartSummary,
  mergeGuestCart,
  getMergeSummary,
};


