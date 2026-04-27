const mongoose = require("mongoose");
const { AppError } = require("../utils/AppError");
const cartRepo = require("../repositories/cart.repository");
const orderRepo = require("../repositories/order.repository");
const productRepo = require("../repositories/product.repository");
const vendorRepo = require("../repositories/vendor.repository");
const productService = require("./product.service");
const { ORDER_STATUS, PAYMENT_STATUS } = require("../models/Order");
const { resolveVendorShippingModes } = require("./shipping.service");

function asObjectId(id, fieldName) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(`Invalid ${fieldName}`, 400, "VALIDATION_ERROR");
  return id;
}

function generateOrderNumber() {
  const ts = Date.now();
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

function groupBySeller(items = []) {
  const map = new Map();
  for (const it of items) {
    const key = String(it.sellerId);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(it);
  }
  return map;
}

function normalizeAddress(address) {
  const a = address || {};
  // Keep schema-compatible shape. We don't enforce strict validation here to avoid breaking current UX.
  return {
    fullName: a.fullName,
    phone: a.phone,
    line1: a.line1 || a.addressLine || a.address,
    line2: a.line2,
    city: a.city,
    state: a.state,
    postalCode: a.postalCode || a.zip,
    country: a.country,
  };
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

function resolveVariant(product, variantId = "") {
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

class OrderService {
  async createFromCart(userId, { address, currency } = {}) {
    const cart = await cartRepo.findByUserId(userId);
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      throw new AppError("Cart is empty", 400, "EMPTY_CART");
    }

    // Validate stock & product availability for each item (fresh read).
    const validated = [];
    for (const item of cart.items) {
      asObjectId(item.productId, "productId");
      const product = await productRepo.findById(item.productId);
      if (!product) throw new AppError("Product not found", 404, "NOT_FOUND");
      if (product.status !== "APPROVED" || product.isActive !== true) {
        throw new AppError(`Product not available: ${product.name}`, 400, "NOT_AVAILABLE");
      }
      const variant = resolveVariant(product, item.variantId);
      const availableStock = variant ? Number(variant.stock || 0) : Number(product.stock || 0);
      if (availableStock < item.quantity) {
        throw new AppError(`Out of stock: ${product.name}`, 400, "INSUFFICIENT_STOCK");
      }
      const resolvedSellerId = await resolveSellerIdForProduct(product);
      if (!resolvedSellerId) throw new AppError("Seller not found for product", 400, "INVALID_PRODUCT");

      validated.push({
        product,
        productId: product._id,
        sellerId: resolvedSellerId,
        quantity: item.quantity,
        // snapshot price (refresh to current unit price at checkout time)
        price: Number(variant?.discountPrice || variant?.price || product.discountPrice || product.price || 0),
        variantId: variant?.variantId || item.variantId || "",
        variantSku: variant?.sku || item.variantSku || "",
        variantTitle: variant?.title || item.variantTitle || "",
        variantAttributes: variant?.attributes || item.variantAttributes || {},
      });
    }

    // "Lock" inventory by decrementing stock right away (simple and consistent with current schema).
    // If any decrement fails mid-way, we fail fast (no transaction). In production you'd use a Mongo transaction or stock reservations.
    for (const it of validated) {
      await productService.recordSale(it.productId, it.quantity, it.price * it.quantity, it.variantId);
    }

    const bySeller = groupBySeller(validated);
    const now = new Date();

    const orderPayloads = Array.from(bySeller.entries()).map(([sellerId, items]) => {
      const sellerItems = { sellerId, items };
      return sellerItems;
    });

    const preparedPayloads = [];
    for (const sellerGroup of orderPayloads) {
      const vendor = await vendorRepo.findById(sellerGroup.sellerId);
      const vendorShipping = await resolveVendorShippingModes(vendor);
      const items = sellerGroup.items;
      const orderItems = items.map((it) => ({
        productId: it.productId,
        name: it.product.name,
        price: it.price,
        quantity: it.quantity,
        image:
          it.product.variants?.find((variant) => variant.variantId === it.variantId)?.images?.find((image) => image.isPrimary)?.url ||
          it.product.variants?.find((variant) => variant.variantId === it.variantId)?.images?.[0]?.url ||
          (Array.isArray(it.product.images) && it.product.images.length ? it.product.images[0]?.url : undefined),
        variantId: it.variantId,
        variantSku: it.variantSku,
        variantTitle: it.variantTitle,
        variantAttributes: it.variantAttributes,
      }));

      const subtotal = orderItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
      preparedPayloads.push({
        orderNumber: generateOrderNumber(),
        userId,
        sellerId: sellerGroup.sellerId,
        items: orderItems,
        subtotal,
        shippingFee: 0,
        taxAmount: 0,
        totalAmount: subtotal,
        currency: currency || cart.currency || "INR",
        status: "Pending",
        paymentStatus: "Pending",
        shippingMode: vendorShipping.defaultShippingMode,
        shippingStatus: "NOT_SHIPPED",
        pickupStatus: "NOT_REQUESTED",
        shippingAddress: normalizeAddress(address),
        timeline: [{ status: "Pending", note: "Order placed", changedAt: now }],
      });
    }

    const created = await orderRepo.createMany(preparedPayloads);

    // Clear cart after successful order writes.
    await cartRepo.clear(userId);

    return created;
  }

  async listForUser(userId, { page, limit, status } = {}) {
    return await orderRepo.listByUserId({
      userId,
      page: Number(page || 1),
      limit: Number(limit || 20),
      ...(status ? { status } : {}),
    });
  }

  async getForUser(userId, orderId) {
    asObjectId(orderId, "orderId");
    const order = await orderRepo.findByIdForUser(orderId, userId);
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    return order;
  }

  async cancelForUser(userId, orderId) {
    asObjectId(orderId, "orderId");
    const order = await orderRepo.findByIdForUser(orderId, userId);
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    if (!["Pending", "Placed"].includes(order.status)) {
      throw new AppError("Order cannot be cancelled at this stage", 400, "INVALID_OPERATION");
    }
    return await orderRepo.updateStatus(orderId, "Cancelled");
  }

  async requestReturnForUser(userId, orderId) {
    asObjectId(orderId, "orderId");
    const order = await orderRepo.findByIdForUser(orderId, userId);
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    if (order.status !== "Delivered") {
      throw new AppError("Only delivered orders can be returned", 400, "INVALID_OPERATION");
    }
    return await orderRepo.updateStatus(orderId, "Returned");
  }

  async listForSeller(userId, { page, limit, status } = {}) {
    const vendor = await vendorRepo.findByUserId(userId);
    if (!vendor) throw new AppError("Vendor profile not found", 400, "VENDOR_NOT_FOUND");

    return await orderRepo.listBySellerId({
      sellerId: vendor._id,
      page: Number(page || 1),
      limit: Number(limit || 20),
      ...(status ? { status } : {}),
    });
  }

  async updateStatusAsSellerOrAdmin({ actor, orderId, status }) {
    asObjectId(orderId, "orderId");
    if (!ORDER_STATUS.includes(status)) throw new AppError("Invalid order status", 400, "VALIDATION_ERROR");

    const order = await orderRepo.findById(orderId);
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");

    if (actor.role === "admin") {
      return await orderRepo.updateStatus(orderId, status);
    }

    if (actor.role === "vendor") {
      const vendor = await vendorRepo.findByUserId(actor.sub);
      if (!vendor) throw new AppError("Vendor profile not found", 400, "VENDOR_NOT_FOUND");
      if (String(order.sellerId) !== String(vendor._id)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
      }
      return await orderRepo.updateStatus(orderId, status);
    }

    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }

  async updatePaymentStatus({ userId, orderId, paymentStatus }) {
    asObjectId(orderId, "orderId");
    if (!PAYMENT_STATUS.includes(paymentStatus)) {
      throw new AppError("Invalid payment status", 400, "VALIDATION_ERROR");
    }
    const order = await orderRepo.findByIdForUser(orderId, userId);
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    return await orderRepo.updatePaymentStatus(orderId, paymentStatus);
  }
}

module.exports = new OrderService();

