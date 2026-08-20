const mongoose = require("mongoose");
const { AppError } = require("../utils/AppError");
const orderRepo = require("../repositories/order.repository");
const payoutRepo = require("../repositories/payout.repository");
const vendorRepo = require("../repositories/vendor.repository");
const productService = require("./product.service");
const { ORDER_STATUS, PAYMENT_STATUS } = require("../models/Order");
const checkoutService = require("./checkout.service");
const inventoryService = require("./inventory.service");
const productAnalyticsService = require("./product-analytics.service");
const cancellationRefundService = require("./cancellation-refund.service");
const pricingBreakdownEngine = require("./pricing-breakdown-engine.service");

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

function asObjectId(id, fieldName) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(`Invalid ${fieldName}`, 400, "VALIDATION_ERROR");
  return id;
}

class OrderService {
  async attachReturnEligibility(order) {
    let returnEligible = false;
    let returnEligibilityMessage = "";

    const enrichedOrder = typeof order.toObject === "function" ? order.toObject() : { ...order };

    if (enrichedOrder.status === "Delivered") {
      const { ReturnRule } = require("../models/ReturnRule");
      const subCategoryIds = (enrichedOrder.items || []).map(item => item.productId?.subCategoryId).filter(Boolean);
      
      if (subCategoryIds.length > 0) {
        const rules = await ReturnRule.find({ subCategoryId: { $in: subCategoryIds } });
        let allReturnable = true;
        let applicableDays = Infinity;

        for (const item of enrichedOrder.items) {
           const subCatId = String(item.productId?.subCategoryId || "");
           const rule = rules.find(r => String(r.subCategoryId) === subCatId);
           console.log('DEBUG item subCatId:', subCatId, 'Found rule:', !!rule, 'ruleType:', rule?.ruleType);
           
           if (!rule || rule.ruleType === "no_return") {
             allReturnable = false;
             break;
           } else if (rule.returnDays) {
             applicableDays = Math.min(applicableDays, rule.returnDays);
           }
        }
        
        if (allReturnable && applicableDays !== Infinity) {
          const deliveredAt = enrichedOrder.deliveredAt || enrichedOrder.updatedAt;
          const daysSinceDelivery = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 3600 * 24);
          if (daysSinceDelivery <= applicableDays) {
            returnEligible = true;
            returnEligibilityMessage = "";
          } else {
             returnEligibilityMessage = `Return period of ${applicableDays} days has expired.`;
          }
        } else if (!allReturnable) {
           returnEligibilityMessage = "One or more items in this order are non-returnable.";
        }
      } else {
        returnEligible = true; // Fallback rule if subCategories missing
      }
    } else {
       returnEligibilityMessage = "Order must be delivered to request a return.";
    }

    enrichedOrder.returnEligible = returnEligible;
    enrichedOrder.returnEligibilityMessage = returnEligibilityMessage;
    return enrichedOrder;
  }

  async createFromCart(userId, { address, currency } = {}) {
    const shippingAddress = normalizeAddress(address);
    if (!shippingAddress?.fullName || !shippingAddress?.line1 || !shippingAddress?.postalCode) {
      throw new AppError("Shipping address is required", 400, "MISSING_ADDRESS");
    }

    return await checkoutService.createOrder(userId, {
      shippingAddress,
      paymentMethod: "COD",
      currency,
    });
  }

  async listForUser(userId, { page, limit, status } = {}) {
    const result = await orderRepo.listByUserId({
      userId,
      page: Number(page || 1),
      limit: Number(limit || 20),
      ...(status ? { status } : {}),
    });
    
    const ordersWithReturn = await Promise.all(
      (result.orders || []).map(order => this.attachReturnEligibility(order))
    );

    return {
      ...result,
      orders: ordersWithReturn.map((order) => pricingBreakdownEngine.attachToOrder(order)),
    };
  }

  async getForUser(userId, orderId) {
    asObjectId(orderId, "orderId");
    let order = await orderRepo.findByIdForUser(orderId, userId);
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    order = await this.attachReturnEligibility(order);
    return pricingBreakdownEngine.attachToOrder(order);
  }

  async cancelForUser(userId, orderId) {
    return await cancellationRefundService.processOrderCancellation({
      orderId,
      actor: { sub: userId, role: "user" },
      meta: {},
      reason: "Order cancelled by customer",
    });
  }

  async requestReturnForUser(userId, orderId) {
    asObjectId(orderId, "orderId");
    let order = await orderRepo.findByIdForUser(orderId, userId);
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    
    order = await this.attachReturnEligibility(order);
    
    if (!order.returnEligible) {
      throw new AppError(order.returnEligibilityMessage || "Return not allowed", 400, "INVALID_OPERATION");
    }
    const payouts = await payoutRepo.findByOrderId(order._id);
    if (payouts.some((payout) => ["PROCESSING", "PAID"].includes(payout.status))) {
      throw new AppError(
        "This delivered order has already entered vendor settlement and needs manual support review",
        400,
        "MANUAL_REVIEW_REQUIRED"
      );
    }

    if (order.paymentStatus === "Partially Refunded") {
      throw new AppError("This order already has a partial refund and needs manual review", 400, "MANUAL_REVIEW_REQUIRED");
    }

    if (order.paymentStatus === "Paid" && order.paymentRecordId) {
      const paymentService = require("./payment.service");
      await paymentService.processRefund({
        orderId: order._id,
        paymentId: order.paymentRecordId._id || order.paymentRecordId,
        amount: Number(order.totalAmount || 0),
        reason: "Order returned by customer",
        actorRole: "system",
        notes: "Auto-refund triggered during return processing.",
      });
    }

    if (!order.inventoryRestoredAt) {
      for (const item of order.items || []) {
        await inventoryService.restoreStock(
          item.productId?._id || item.productId,
          item.variantId || "",
          Number(item.quantity || 0),
          order.returnId || null,
          order._id,
          order.sellerId?._id || order.sellerId,
          userId,
          "Customer return processed"
        );
      }
    }

    await Promise.all(
      payouts
        .filter((payout) => ["ON_HOLD", "PENDING", "QUEUED"].includes(payout.status))
        .map((payout) =>
          payoutRepo.updateById(payout._id, {
            $set: {
              status: "CANCELLED",
              notes: "Cancelled because the order was returned before payout settlement.",
            },
          })
        )
    );

    const updated = await orderRepo.updateById(orderId, {
      status: "Returned",
      inventoryRestoredAt: new Date(),
    });
    await productAnalyticsService.refreshForOrder(orderId);
    return updated;
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
      const updated = await orderRepo.updateStatus(orderId, status);
      await productAnalyticsService.refreshForOrder(orderId);
      return updated;
    }

    if (actor.role === "vendor") {
      const vendor = await vendorRepo.findByUserId(actor.sub);
      if (!vendor) throw new AppError("Vendor profile not found", 400, "VENDOR_NOT_FOUND");
      if (String(order.sellerId) !== String(vendor._id)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
      }
      const updated = await orderRepo.updateStatus(orderId, status);
      await productAnalyticsService.refreshForOrder(orderId);
      return updated;
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

