const mongoose = require("mongoose");
const { AppError } = require("../utils/AppError");
const cartRepo = require("../repositories/cart.repository");
const productRepo = require("../repositories/product.repository");
const vendorRepo = require("../repositories/vendor.repository");
const { resolveBestVariant, resolveNextAvailableVariant } = require("./variantResolver.service");
const trackingService = require("../modules/tracking/service");
const { logger } = require("../utils/logger");
const cartAllocationService = require("./cartAllocation.service");

function computeTotal(items = []) {
  return items.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0), 0);
}

const LEGACY_VARIANT_ID = "__default__";

function normalizeCartVariantId(variantId = "") {
  const value = String(variantId || "").trim();
  return value === LEGACY_VARIANT_ID ? "" : value;
}

function getItemKey(productId, variantId = "") {
  return `${String(productId)}::${normalizeCartVariantId(variantId)}`;
}

function buildCartItemCounts(cartItems = []) {
  const counts = new Map();
  for (const item of Array.isArray(cartItems) ? cartItems : []) {
    const productId = item?.productId?._id || item?.productId;
    const variantId = normalizeCartVariantId(item?.variantId || item?.variant?.variantId || "");
    const quantity = Number(item?.quantity || 0);
    if (!productId || quantity <= 0) continue;
    const key = getItemKey(productId, variantId);
    counts.set(key, (counts.get(key) || 0) + quantity);
  }
  return counts;
}

function getVariantAvailableQuantity(productId, variant, cartItems = []) {
  const key = getItemKey(productId || "", variant?.variantId || "");
  const inCartQty = Number(buildCartItemCounts(cartItems).get(key) || 0);
  const stock = Number(variant.stock || 0);
  const reservedStock = Number(variant.reservedStock || 0);
  return Math.max(0, stock - reservedStock - inCartQty);
}

function getAvailableLegacyQuantity(product, cartItems = []) {
  const key = getItemKey(product?._id || product?.id || "", "");
  const inCartQty = Number(buildCartItemCounts(cartItems).get(key) || 0);
  const stock = Number(product.stock || 0);
  const reservedStock = Number(product.reservedStock || 0);
  return Math.max(0, stock - reservedStock - inCartQty);
}

function asObjectId(id, fieldName) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(`Invalid ${fieldName}`, 400, "VALIDATION_ERROR");
  return id;
}

function getVariantForProduct(product, variantId) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return null;
  const normalizedVariantId = normalizeCartVariantId(variantId);
  if (!normalizedVariantId) {
    return resolveBestVariant(product);
  }
  return variants.find((item) => item.variantId === normalizedVariantId && item.isActive) || null;
}

function normalizeVariantAttributes(attributes = {}) {
  const normalized = {};
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) return normalized;

  for (const [rawKey, rawValue] of Object.entries(attributes)) {
    const key = String(rawKey || "").trim().replace(/\./g, "_");
    if (!key || key.startsWith("$") || key === "__proto__" || key === "constructor" || key === "prototype") continue;
    if (rawValue === null || rawValue === undefined) continue;
    const value = typeof rawValue === "object" ? JSON.stringify(rawValue) : String(rawValue);
    normalized[key.slice(0, 80)] = value.slice(0, 200);
  }

  return normalized;
}

async function resolveSellerIdForProduct(product) {
  if (product?.sellerId) return product.sellerId;
  if (product?.creatorType === "ADMIN" && product?.createdBy?._id) {
    const vendor = await vendorRepo.upsertByUserId(product.createdBy._id, {
      status: "approved",
      stepCompleted: 4,
      companyName: "Platform Store",
      shopName: "Platform Store",
      storeDescription: "Products sold directly by the platform.",
    });
    return vendor._id;
  }
  return null;
}

function invalidatePreparedCheckoutCacheForUser(userId) {
  try {
    const checkoutService = require("./checkout.service");
    checkoutService.invalidatePreparedCheckoutCacheForUser?.(userId);
  } catch {
    // Ignore cache invalidation failures and still persist the cart change.
  }
}

async function resolveCartAttribution({ userId, productId, trackingToken }) {
  if (!trackingToken) return undefined;
  let trackingContext;
  try {
    trackingContext = await trackingService.validateTrackingToken(trackingToken, userId);
  } catch (error) {
    // Attribution is never allowed to turn a normal commerce action into a
    // failure. Tokens can expire while a customer keeps a product tab open.
    logger.warn("Ignoring invalid cart attribution token", {
      userId: String(userId),
      productId: String(productId),
      code: error?.code,
      message: error?.message,
    });
    return undefined;
  }
  const session = trackingContext?.session;
  if (!session) return undefined;
  if (String(session.productId) !== String(productId)) {
    logger.warn("Ignoring cart attribution with mismatched product", {
      userId: String(userId),
      productId: String(productId),
      attributedProductId: String(session.productId),
    });
    return undefined;
  }
  return {
    campaignId: session.campaignId || undefined,
    influencerId: session.influencerId || undefined,
    productId: session.productId,
    trackingSessionId: session._id,
    trackingToken,
    trackingTokenId: session.trackingTokenId || "",
    reelId: session.reelId || undefined,
    postId: session.postId || undefined,
    storefrontId: session.storefrontId || undefined,
    collectionId: session.collectionId || undefined,
    source: session.surface || "affiliate",
    addedAt: new Date(),
  };
}

class CartService {
  async getCart(userId) {
    await cartRepo.upsertEmpty(userId);
    const cart = await cartRepo.findByUserId(userId);
    return cart;
  }

  async addItem(userId, { productId, quantity = 1, variantId = "", trackingToken = "" }) {
    asObjectId(productId, "productId");
    const qty = Number(quantity || 1);
    if (!Number.isFinite(qty) || qty < 1) throw new AppError("Quantity must be >= 1", 400, "VALIDATION_ERROR");

    const product = await productRepo.findById(productId);
    if (!product) throw new AppError("Product not found", 404, "NOT_FOUND");
    if (product.status !== "APPROVED" || product.isActive !== true) {
      throw new AppError("Product not available", 400, "NOT_AVAILABLE");
    }

    const cart = await cartRepo.upsertEmpty(userId);
    const allocationResult = cartAllocationService.allocate(product, cart.items, qty, normalizeCartVariantId(variantId));
    const variant = allocationResult.variant;

    if (["MAXIMUM_STOCK_REACHED", "OUT_OF_STOCK", "INVALID_VARIANT"].includes(allocationResult.action)) {
      return {
        action: allocationResult.action,
        message: allocationResult.message,
        allocatedVariant: null,
        originalVariant: normalizeCartVariantId(variantId) ? { id: normalizeCartVariantId(variantId) } : null,
        cart,
        addedItem: null
      };
    }

    const resolvedSellerId = await resolveSellerIdForProduct(product);
    if (!resolvedSellerId) throw new AppError("Seller not found for product", 400, "INVALID_PRODUCT");

    const itemImage =
      variant?.images?.find((image) => image.isPrimary)?.url ||
      variant?.images?.[0]?.url ||
      product.images?.find((image) => image.isPrimary)?.url ||
      product.images?.[0]?.url ||
      "";
    const itemPrice = Number(variant?.discountPrice || variant?.price || product.discountPrice || product.price || 0);
    const attribution = await resolveCartAttribution({ userId, productId, trackingToken });
    const itemKey = getItemKey(productId, variant?.variantId || "");
    const existingIdx = cart.items.findIndex((x) => getItemKey(x.productId, x.variantId) === itemKey);
    const newItem = {
      productId,
      sellerId: resolvedSellerId,
      quantity: qty,
      price: itemPrice,
      image: itemImage,
      variantId: variant?.variantId || "",
      variantSku: variant?.sku || "",
      variantTitle: variant?.title || "",
      variantAttributes: normalizeVariantAttributes(variant?.attributes),
      attribution,
    };

    if (existingIdx >= 0) {
      const nextQty = Number(cart.items[existingIdx].quantity || 0) + qty;
      cart.items[existingIdx].quantity = nextQty;
      cart.items[existingIdx].price = itemPrice;
      cart.items[existingIdx].sellerId = resolvedSellerId;
      cart.items[existingIdx].image = itemImage;
      cart.items[existingIdx].variantId = variant?.variantId || "";
      cart.items[existingIdx].variantSku = variant?.sku || "";
      cart.items[existingIdx].variantTitle = variant?.title || "";
      cart.items[existingIdx].variantAttributes = normalizeVariantAttributes(variant?.attributes);
      if (attribution) cart.items[existingIdx].attribution = attribution;
      newItem.quantity = nextQty;
    } else {
      cart.items.push(newItem);
    }

    cart.totalAmount = computeTotal(cart.items);
    await cartRepo.save(cart);
    invalidatePreparedCheckoutCacheForUser(userId);
    const savedCart = await cartRepo.findByUserId(userId);
    
    return {
      action: allocationResult.action,
      message: allocationResult.message,
      allocatedVariant: variant ? { id: variant.variantId, name: variant.title } : null,
      originalVariant: normalizeCartVariantId(variantId) ? { id: normalizeCartVariantId(variantId) } : null,
      cart: savedCart,
      addedItem: newItem
    };
  }

  async updateItem(userId, { productId, quantity, variantId = "" }) {
    asObjectId(productId, "productId");
    const qty = Number(quantity);
    if (!Number.isFinite(qty)) throw new AppError("Quantity is required", 400, "VALIDATION_ERROR");
    const normalizedVariantId = normalizeCartVariantId(variantId);

    const cart = await cartRepo.upsertEmpty(userId);
    const idx = cart.items.findIndex((x) => getItemKey(x.productId, x.variantId) === getItemKey(productId, normalizedVariantId));
    if (idx < 0) throw new AppError("Item not found in cart", 404, "NOT_FOUND");

    if (qty <= 0) {
      cart.items.splice(idx, 1);
      cart.totalAmount = computeTotal(cart.items);
      await cartRepo.save(cart);
      return await cartRepo.findByUserId(userId);
    }

    const product = await productRepo.findById(productId);
    if (!product) throw new AppError("Product not found", 404, "NOT_FOUND");
    if (product.status !== "APPROVED" || product.isActive !== true) {
      throw new AppError("Product not available", 400, "NOT_AVAILABLE");
    }
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const storedVariantId = normalizeCartVariantId(cart.items[idx].variantId);
    const requestedVariantId = normalizedVariantId || storedVariantId;
    const variant = getVariantForProduct(product, requestedVariantId);
    if (!variant && variants.length) {
      throw new AppError("Selected variant is not available", 400, "NOT_AVAILABLE");
    }

    const currentQty = Number(cart.items[idx].quantity || 0);
    const availableExtra = variant
      ? getVariantAvailableQuantity(productId, variant, cart.items)
      : getAvailableLegacyQuantity(product, cart.items);
    const maxAllowedQuantity = currentQty + availableExtra;

    if (availableExtra <= 0 && qty > currentQty) {
      throw new AppError("Product is out of stock", 400, "OUT_OF_STOCK");
    }
    if (qty > maxAllowedQuantity) {
      throw new AppError(`Only ${maxAllowedQuantity} item${maxAllowedQuantity === 1 ? "" : "s"} available`, 400, "INSUFFICIENT_STOCK");
    }
    const resolvedSellerId = await resolveSellerIdForProduct(product);
    if (!resolvedSellerId) throw new AppError("Seller not found for product", 400, "INVALID_PRODUCT");

    cart.items[idx].quantity = qty;
    cart.items[idx].price = Number(variant?.discountPrice || variant?.price || product.discountPrice || product.price || 0);
    cart.items[idx].sellerId = resolvedSellerId;
    cart.items[idx].image =
      variant?.images?.find((image) => image.isPrimary)?.url ||
      variant?.images?.[0]?.url ||
      product.images?.find((image) => image.isPrimary)?.url ||
      product.images?.[0]?.url ||
      "";
    cart.items[idx].variantId = variant?.variantId || "";
    cart.items[idx].variantSku = variant?.sku || "";
    cart.items[idx].variantTitle = variant?.title || "";
    cart.items[idx].variantAttributes = normalizeVariantAttributes(variant?.attributes);

    cart.totalAmount = computeTotal(cart.items);
    await cartRepo.save(cart);
    invalidatePreparedCheckoutCacheForUser(userId);
    return await cartRepo.findByUserId(userId);
  }

  async removeItem(userId, { productId, variantId = "" }) {
    asObjectId(productId, "productId");

    const cart = await cartRepo.upsertEmpty(userId);
    const before = cart.items.length;
    cart.items = cart.items.filter((x) => getItemKey(x.productId, x.variantId) !== getItemKey(productId, variantId));
    if (cart.items.length === before) throw new AppError("Item not found in cart", 404, "NOT_FOUND");

    cart.totalAmount = computeTotal(cart.items);
    await cartRepo.save(cart);
    invalidatePreparedCheckoutCacheForUser(userId);
    return await cartRepo.findByUserId(userId);
  }

  async clearCart(userId) {
    await cartRepo.upsertEmpty(userId);
    const clearedCart = await cartRepo.clear(userId);
    invalidatePreparedCheckoutCacheForUser(userId);
    return clearedCart;
  }
}

module.exports = new CartService();

