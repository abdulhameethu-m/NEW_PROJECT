const mongoose = require("mongoose");
const { AppError } = require("../utils/AppError");
const cartRepo = require("../repositories/cart.repository");
const productRepo = require("../repositories/product.repository");
const orderRepo = require("../repositories/order.repository");
const payoutRepo = require("../repositories/payout.repository");
const vendorRepo = require("../repositories/vendor.repository");
const { getCommissionPercentage } = require("./finance-config.service");

function asObjectId(id, fieldName) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(`Invalid ${fieldName}`, 400, "VALIDATION_ERROR");
  return id;
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

function groupBySeller(items = []) {
  const map = new Map();
  for (const it of items) {
    const key = String(it.sellerId); // Use as map key only
    if (!map.has(key)) map.set(key, { sellerId: it.sellerId, items: [] }); // Store original ObjectId
    map.get(key).items.push(it);
  }
  return map;
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

class CheckoutService {
  async prepare(userId, { currency } = {}) {
    const cart = await cartRepo.findByUserId(userId);
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      throw new AppError("Cart is empty", 400, "EMPTY_CART");
    }

    // Validate & refresh prices
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
        productId: product._id,
        sellerId: resolvedSellerId,
        name: product.name,
        image:
          variant?.images?.find((image) => image.isPrimary)?.url ||
          variant?.images?.[0]?.url ||
          item.image ||
          (Array.isArray(product.images) && product.images.length ? product.images[0]?.url : undefined),
        quantity: item.quantity,
        price: Number(variant?.discountPrice || variant?.price || product.discountPrice || product.price || 0),
        maxAvailable: availableStock,
        variantId: variant?.variantId || item.variantId || "",
        variantSku: variant?.sku || item.variantSku || "",
        variantTitle: variant?.title || item.variantTitle || "",
        variantAttributes: variant?.attributes || item.variantAttributes || {},
      });
    }

    const bySeller = groupBySeller(validated);
    const sellers = Array.from(bySeller.entries()).map(([key, sellerData]) => {
      const items = sellerData.items;
      const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
      return { sellerId: sellerData.sellerId, items, subtotal };
    });

    const subtotal = sellers.reduce((sum, s) => sum + s.subtotal, 0);
    const shippingFee = 0;
    const taxAmount = 0;
    const totalAmount = subtotal + shippingFee + taxAmount;

    return {
      currency: currency || cart.currency || "INR",
      sellers,
      subtotal,
      shippingFee,
      taxAmount,
      totalAmount,
    };
  }

  async createOrder(userId, { shippingAddress, paymentMethod = "ONLINE" }) {
    // Validate required fields
    if (!shippingAddress) {
      throw new AppError("Shipping address is required", 400, "MISSING_ADDRESS");
    }

    if (!["ONLINE", "COD"].includes(paymentMethod)) {
      throw new AppError("Invalid payment method", 400, "INVALID_PAYMENT_METHOD");
    }

    const cart = await cartRepo.findByUserId(userId);
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      throw new AppError("Cart is empty", 400, "EMPTY_CART");
    }

    // Validate & refresh prices
    const validated = [];
    for (const item of cart.items) {
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
        productId: product._id,
        sellerId: resolvedSellerId,
        name: product.name,
        price: Number(variant?.discountPrice || variant?.price || product.discountPrice || product.price || 0),
        quantity: item.quantity,
        image:
          variant?.images?.find((image) => image.isPrimary)?.url ||
          variant?.images?.[0]?.url ||
          item.image ||
          (Array.isArray(product.images) && product.images.length ? product.images[0]?.url : undefined),
        variantId: variant?.variantId || item.variantId || "",
        variantSku: variant?.sku || item.variantSku || "",
        variantTitle: variant?.title || item.variantTitle || "",
        variantAttributes: variant?.attributes || item.variantAttributes || {},
      });
    }

    const bySeller = groupBySeller(validated);
    const orderPayloads = [];
    const payouts = [];
    const commissionPercentage = await getCommissionPercentage();

    for (const [sellerId, sellerData] of bySeller) {
      const items = sellerData.items;
      const originalSellerId = sellerData.sellerId;
      // Clean items to only include fields for Order schema
      const cleanedItems = items.map((it) => ({
        productId: it.productId,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        image: it.image,
        variantId: it.variantId,
        variantSku: it.variantSku,
        variantTitle: it.variantTitle,
        variantAttributes: it.variantAttributes,
      }));

      const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
      const shippingFee = 0; // Calculate per seller or global
      const taxAmount = 0;
      const totalAmount = subtotal + shippingFee + taxAmount;
      const commission = Number(((totalAmount * commissionPercentage) / 100).toFixed(2));
      const sellerAmount = Number((totalAmount - commission).toFixed(2));

      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      const orderData = {
        orderNumber,
        userId: new mongoose.Types.ObjectId(userId),
        sellerId: originalSellerId, // Use original ObjectId
        items: cleanedItems,
        subtotal,
        shippingFee,
        taxAmount,
        totalAmount,
        platformCommissionRate: commissionPercentage,
        platformCommissionAmount: commission,
        vendorEarning: sellerAmount,
        currency: "INR",
        status: "Placed",
        paymentStatus: "Pending", // For both COD and online until verified
        paymentMethod,
        shippingAddress,
        timeline: [{ status: "Placed", note: "Order placed" }],
      };

      orderPayloads.push(orderData);
    }

    // Create all orders at once
    const orders = await orderRepo.createMany(orderPayloads);

    // Create payout records
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const orderPayload = orderPayloads[i];
      const commission = orderPayload.platformCommissionAmount;
      const sellerAmount = orderPayload.vendorEarning;

      const payout = await payoutRepo.create({
        sellerId: order.sellerId,
        orderId: order._id,
        amount: sellerAmount,
        commission,
        status: "PENDING",
      });
      payouts.push(payout);
    }

    // Clear cart
    await cartRepo.clear(userId);

    return { orders, payouts };
  }
}

module.exports = new CheckoutService();

