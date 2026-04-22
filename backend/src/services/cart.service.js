const mongoose = require("mongoose");
const { AppError } = require("../utils/AppError");
const cartRepo = require("../repositories/cart.repository");
const productRepo = require("../repositories/product.repository");
const vendorRepo = require("../repositories/vendor.repository");

function computeTotal(items = []) {
  return items.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0), 0);
}

function asObjectId(id, fieldName) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(`Invalid ${fieldName}`, 400, "VALIDATION_ERROR");
  return id;
}

function getVariantForProduct(product, variantId) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return null;
  if (!variantId) {
    return (
      variants.find((item) => item.isDefault && item.isActive && item.stock > 0) ||
      variants.find((item) => item.isActive && item.stock > 0) ||
      variants.find((item) => item.isActive) ||
      null
    );
  }
  return variants.find((item) => item.variantId === variantId && item.isActive) || null;
}

function getItemKey(productId, variantId = "") {
  return `${String(productId)}::${String(variantId || "")}`;
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

class CartService {
  async getCart(userId) {
    await cartRepo.upsertEmpty(userId);
    const cart = await cartRepo.findByUserId(userId);
    return cart;
  }

  async addItem(userId, { productId, quantity = 1, variantId = "" }) {
    asObjectId(productId, "productId");
    const qty = Number(quantity || 1);
    if (!Number.isFinite(qty) || qty < 1) throw new AppError("Quantity must be >= 1", 400, "VALIDATION_ERROR");

    const product = await productRepo.findById(productId);
    if (!product) throw new AppError("Product not found", 404, "NOT_FOUND");
    if (product.status !== "APPROVED" || product.isActive !== true) {
      throw new AppError("Product not available", 400, "NOT_AVAILABLE");
    }
    const variant = getVariantForProduct(product, variantId);
    const availableStock = variant ? Number(variant.stock || 0) : Number(product.stock || 0);
    if (!variant && Array.isArray(product?.variants) && product.variants.length && variantId) {
      throw new AppError("Selected variant is not available", 400, "NOT_AVAILABLE");
    }
    if (availableStock < qty) throw new AppError("Insufficient stock", 400, "INSUFFICIENT_STOCK");
    const resolvedSellerId = await resolveSellerIdForProduct(product);
    if (!resolvedSellerId) throw new AppError("Seller not found for product", 400, "INVALID_PRODUCT");

    const unitPrice = Number(variant?.discountPrice || variant?.price || product.discountPrice || product.price || 0);
    const itemKey = getItemKey(productId, variant?.variantId || variantId);

    const cart = await cartRepo.upsertEmpty(userId);
    const existingIdx = cart.items.findIndex((x) => getItemKey(x.productId, x.variantId) === itemKey);

    if (existingIdx >= 0) {
      const nextQty = Number(cart.items[existingIdx].quantity || 0) + qty;
      if (availableStock < nextQty) throw new AppError("Insufficient stock", 400, "INSUFFICIENT_STOCK");
      cart.items[existingIdx].quantity = nextQty;
      cart.items[existingIdx].price = unitPrice; // refresh snapshot to latest
      cart.items[existingIdx].sellerId = resolvedSellerId;
      cart.items[existingIdx].image =
        variant?.images?.find((image) => image.isPrimary)?.url ||
        variant?.images?.[0]?.url ||
        product.images?.find((image) => image.isPrimary)?.url ||
        product.images?.[0]?.url ||
        "";
      cart.items[existingIdx].variantId = variant?.variantId || "";
      cart.items[existingIdx].variantSku = variant?.sku || "";
      cart.items[existingIdx].variantTitle = variant?.title || "";
      cart.items[existingIdx].variantAttributes = variant?.attributes || {};
    } else {
      cart.items.push({
        productId,
        sellerId: resolvedSellerId,
        quantity: qty,
        price: unitPrice,
        image:
          variant?.images?.find((image) => image.isPrimary)?.url ||
          variant?.images?.[0]?.url ||
          product.images?.find((image) => image.isPrimary)?.url ||
          product.images?.[0]?.url ||
          "",
        variantId: variant?.variantId || "",
        variantSku: variant?.sku || "",
        variantTitle: variant?.title || "",
        variantAttributes: variant?.attributes || {},
      });
    }

    cart.totalAmount = computeTotal(cart.items);
    await cartRepo.save(cart);
    return await cartRepo.findByUserId(userId);
  }

  async updateItem(userId, { productId, quantity, variantId = "" }) {
    asObjectId(productId, "productId");
    const qty = Number(quantity);
    if (!Number.isFinite(qty)) throw new AppError("Quantity is required", 400, "VALIDATION_ERROR");

    const cart = await cartRepo.upsertEmpty(userId);
    const idx = cart.items.findIndex((x) => getItemKey(x.productId, x.variantId) === getItemKey(productId, variantId));
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
    const variant = getVariantForProduct(product, variantId || cart.items[idx].variantId);
    const availableStock = variant ? Number(variant.stock || 0) : Number(product.stock || 0);
    if (availableStock < qty) throw new AppError("Insufficient stock", 400, "INSUFFICIENT_STOCK");
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
    cart.items[idx].variantAttributes = variant?.attributes || {};

    cart.totalAmount = computeTotal(cart.items);
    await cartRepo.save(cart);
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
    return await cartRepo.findByUserId(userId);
  }

  async clearCart(userId) {
    await cartRepo.upsertEmpty(userId);
    return await cartRepo.clear(userId);
  }
}

module.exports = new CartService();

