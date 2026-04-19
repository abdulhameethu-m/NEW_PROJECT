const { AppError } = require("../utils/AppError");
const vendorRepo = require("../repositories/vendor.repository");
const userRepo = require("../repositories/user.repository");
const productRepo = require("../repositories/product.repository");
const orderRepo = require("../repositories/order.repository");
const { ORDER_STATUS, PAYMENT_STATUS } = require("../models/Order");
const auditService = require("./audit.service");
const productService = require("./product.service");
const { queueWhatsAppMessage } = require("./whatsapp.service");
const { logger } = require("../utils/logger");

async function getDashboardOverview() {
  const [totalUsers, totalSellers, totalOrders, revenue, pendingProducts, pendingSellers] = await Promise.all([
    userRepo.countUsers({ role: "user" }),
    vendorRepo.countVendors(),
    orderRepo.countDocuments(),
    orderRepo.sumRevenue(),
    productRepo.countDocuments({ status: "PENDING" }),
    vendorRepo.countVendors({ status: "pending" }),
  ]);

  return {
    totals: {
      users: totalUsers,
      sellers: totalSellers,
      orders: totalOrders,
      revenue,
    },
    queues: {
      pendingProducts,
      pendingSellers,
    },
  };
}

async function getAnalytics() {
  const [salesOverview, topProducts, orderCount, deliveredOrders, approvedProducts, users, sellers, revenue] = await Promise.all([
    orderRepo.getMonthlyRevenue(6),
    productRepo.getTopProducts(5),
    orderRepo.countDocuments(),
    orderRepo.countDocuments({ status: "Delivered" }),
    productRepo.countDocuments({ status: "APPROVED", isActive: true }),
    userRepo.countUsers({ role: "user" }),
    vendorRepo.countVendors({ status: "approved" }),
    orderRepo.sumRevenue(),
  ]);

  return {
    salesOverview,
    topProducts,
    stats: {
      totalOrders: orderCount,
      deliveredOrders,
      approvedProducts,
      users,
      sellers,
      revenue,
    },
  };
}

async function getDailyRevenue(days = 7) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  const orders = await orderRepo.findWithDateRange(startDate, endDate);

  // Group by day
  const dailyData = {};
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    dailyData[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
  }

  // Populate data from orders
  for (const order of orders) {
    const dateStr = order.createdAt.toISOString().split("T")[0];
    if (dailyData[dateStr]) {
      if (["Delivered", "Shipped", "Packed"].includes(order.status)) {
        dailyData[dateStr].revenue += order.totalAmount || 0;
      }
      dailyData[dateStr].orders += 1;
    }
  }

  return Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));
}

async function listVendors({ status } = {}) {
  return await vendorRepo.listVendors({ status });
}

async function getVendorDetails(vendorId) {
  const vendor = await vendorRepo.findById(vendorId);
  if (!vendor) throw new AppError("Vendor not found", 404, "NOT_FOUND");
  return vendor;
}

async function listUsers({ role } = {}) {
  return await userRepo.listUsers({ role });
}

async function listAuditLogs(filters = {}) {
  return await auditService.list(filters);
}

async function setUserStatus(userId, status, actor, meta) {
  if (!["active", "disabled"].includes(status)) {
    throw new AppError("Invalid user status", 400, "VALIDATION_ERROR");
  }
  const user = await userRepo.updateById(userId, { status });
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  await auditService.log({
    actor,
    action: "admin.user.status_updated",
    entityType: "User",
    entityId: user._id,
    metadata: { status },
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  });
  return user;
}

async function toggleUserBlocked(userId, actor, meta) {
  const user = await userRepo.findById(userId);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  if (["admin", "super_admin", "support_admin", "finance_admin"].includes(user.role)) {
    throw new AppError("Admin accounts cannot be blocked", 400, "INVALID_OPERATION");
  }

  const nextStatus = user.status === "disabled" ? "active" : "disabled";
  const updated = await userRepo.updateById(userId, { status: nextStatus });
  await auditService.log({
    actor,
    action: "admin.user.block_toggled",
    entityType: "User",
    entityId: updated._id,
    metadata: { status: nextStatus },
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  });
  return updated;
}

async function deleteUser(userId, actor, meta) {
  const user = await userRepo.findById(userId);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  if (["admin", "super_admin", "support_admin", "finance_admin"].includes(user.role)) {
    throw new AppError("Admin accounts cannot be deleted", 400, "INVALID_OPERATION");
  }

  const vendor = user.role === "vendor" ? await vendorRepo.findByUserId(userId) : null;
  if (vendor) {
    await vendorRepo.deleteById(vendor._id);
  }

  await userRepo.deleteById(userId);
  await auditService.log({
    actor,
    action: "admin.user.deleted",
    entityType: "User",
    entityId: userId,
    metadata: { role: user.role },
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  });
  return { _id: userId };
}

async function approveVendor(vendorId, actor, meta) {
  const vendor = await vendorRepo.findById(vendorId);
  if (!vendor) throw new AppError("Vendor not found", 404, "NOT_FOUND");
  if (vendor.status === "approved") return vendor;

  const updated = await vendorRepo.updateById(vendorId, {
    status: "approved",
    rejectionReason: null,
  });
  await auditService.log({
    actor,
    action: "admin.vendor.approved",
    entityType: "Vendor",
    entityId: updated._id,
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  });
  return updated;
}

async function rejectVendor(vendorId, { reason } = {}, actor, meta) {
  const vendor = await vendorRepo.findById(vendorId);
  if (!vendor) throw new AppError("Vendor not found", 404, "NOT_FOUND");

  const updated = await vendorRepo.updateById(vendorId, {
    status: "rejected",
    rejectionReason: reason || "Rejected by admin",
  });
  await auditService.log({
    actor,
    action: "admin.vendor.rejected",
    entityType: "Vendor",
    entityId: updated._id,
    metadata: { reason: reason || "Rejected by admin" },
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  });
  return updated;
}

async function removeVendor(vendorId, actor, meta) {
  const vendor = await vendorRepo.findById(vendorId);
  if (!vendor) throw new AppError("Vendor not found", 404, "NOT_FOUND");

  const userId = vendor.userId?._id || vendor.userId;
  if (!userId) throw new AppError("Linked user not found", 500, "INTERNAL_ERROR");

  await vendorRepo.deleteById(vendorId);

  const updatedUser = await userRepo.updateById(userId, { role: "user" });
  if (!updatedUser) throw new AppError("Linked user not found", 404, "NOT_FOUND");

  await auditService.log({
    actor,
    action: "admin.vendor.removed",
    entityType: "Vendor",
    entityId: vendorId,
    metadata: { linkedUserId: String(userId) },
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  });
  return { user: updatedUser };
}

async function listOrders(filters = {}) {
  return await orderRepo.list(filters);
}

function toStoredOrderStatus(value) {
  if (!value) return null;
  const v = String(value).trim();
  const upper = v.toUpperCase().replace(/\s+/g, "_");
  const map = {
    PLACED: "Placed",
    PACKED: "Packed",
    SHIPPED: "Shipped",
    OUT_FOR_DELIVERY: "Out for Delivery",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
    RETURNED: "Returned",
  };
  if (map[upper]) return map[upper];
  // allow existing stored labels too
  return v;
}

function toStoredPaymentStatus(value) {
  if (!value) return null;
  const v = String(value).trim();
  const upper = v.toUpperCase();
  const map = { PENDING: "Pending", PAID: "Paid", FAILED: "Failed" };
  if (map[upper]) return map[upper];
  return v;
}

function assertValidOrderFlow(currentStatus, nextStatus) {
  // enforce monotonic forward flow; allow Cancelled/Returned from certain states
  const flow = ["Placed", "Packed", "Shipped", "Out for Delivery", "Delivered"];
  const cur = currentStatus === "Pending" ? "Placed" : currentStatus;
  const next = nextStatus === "Pending" ? "Placed" : nextStatus;

  if (next === cur) return;
  if (next === "Cancelled") {
    if (["Delivered", "Returned"].includes(cur)) {
      throw new AppError("Cannot cancel a delivered/returned order", 400, "INVALID_STATUS_FLOW");
    }
    return;
  }
  if (next === "Returned") {
    if (cur !== "Delivered") {
      throw new AppError("Only delivered orders can be returned", 400, "INVALID_STATUS_FLOW");
    }
    return;
  }

  const curIdx = flow.indexOf(cur);
  const nextIdx = flow.indexOf(next);
  if (curIdx < 0 || nextIdx < 0) {
    throw new AppError("Invalid order status transition", 400, "INVALID_STATUS_FLOW");
  }
  if (nextIdx < curIdx) {
    throw new AppError("Order status cannot move backwards", 400, "INVALID_STATUS_FLOW");
  }
}

async function getOrderById(orderId) {
  const order = await orderRepo.findById(orderId);
  if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
  return order;
}

async function createOrder(payload, actor, meta) {
  const { userId, items, paymentMethod, paymentStatus, orderStatus, address, deliveryDetails } = payload || {};
  if (!userId) throw new AppError("userId is required", 400, "VALIDATION_ERROR");
  if (!Array.isArray(items) || items.length === 0) throw new AppError("items are required", 400, "VALIDATION_ERROR");

  const user = await userRepo.findById(userId);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");

  // Validate products, compute totals, resolve seller, and decrement stock
  const validated = [];
  for (const it of items) {
    const product = await productRepo.findById(it.productId);
    if (!product) throw new AppError("Product not found", 404, "NOT_FOUND");
    const qty = Number(it.quantity || 0);
    if (!Number.isFinite(qty) || qty < 1) throw new AppError("Invalid quantity", 400, "VALIDATION_ERROR");
    if (product.stock < qty) throw new AppError(`Insufficient stock: ${product.name}`, 400, "INSUFFICIENT_STOCK");

    // Resolve sellerId for admin-created products
    let sellerId = product.sellerId;
    if (!sellerId && product.creatorType === "ADMIN" && product.createdBy?._id) {
      const platformVendor = await vendorRepo.upsertByUserId(product.createdBy._id, {
        status: "approved",
        stepCompleted: 4,
        companyName: "Platform Store",
        shopName: "Platform Store",
        storeDescription: "Products sold directly by the platform.",
      });
      sellerId = platformVendor._id;
    }
    if (!sellerId) throw new AppError("Seller not found for product", 400, "INVALID_PRODUCT");

    const price = Number(product.discountPrice || product.price || 0);
    validated.push({
      product,
      productId: product._id,
      sellerId,
      name: product.name,
      price,
      quantity: qty,
      image: Array.isArray(product.images) && product.images.length ? product.images[0]?.url : undefined,
    });
  }

  // decrement stock and record revenue
  for (const it of validated) {
    await productService.recordSale(it.productId, it.quantity, it.price * it.quantity);
  }

  // group by seller and create one order per seller (consistent with current checkout design)
  const bySeller = new Map();
  for (const it of validated) {
    const key = String(it.sellerId);
    if (!bySeller.has(key)) bySeller.set(key, { sellerId: it.sellerId, items: [] });
    bySeller.get(key).items.push(it);
  }

  const storedStatus = toStoredOrderStatus(orderStatus || "PLACED") || "Placed";
  const storedPaymentStatus = toStoredPaymentStatus(paymentStatus || "PENDING") || "Pending";
  if (!ORDER_STATUS.includes(storedStatus)) throw new AppError("Invalid order status", 400, "VALIDATION_ERROR");
  if (!PAYMENT_STATUS.includes(storedPaymentStatus)) throw new AppError("Invalid payment status", 400, "VALIDATION_ERROR");
  if (!["ONLINE", "COD"].includes(paymentMethod)) throw new AppError("Invalid payment method", 400, "VALIDATION_ERROR");

  const ordersPayloads = Array.from(bySeller.values()).map((sellerGroup) => {
    const cleanedItems = sellerGroup.items.map((x) => ({
      productId: x.productId,
      name: x.name,
      price: x.price,
      quantity: x.quantity,
      image: x.image,
    }));
    const subtotal = cleanedItems.reduce((sum, x) => sum + x.price * x.quantity, 0);
    const totalAmount = subtotal;
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;

    return {
      orderNumber,
      userId,
      sellerId: sellerGroup.sellerId,
      items: cleanedItems,
      subtotal,
      shippingFee: 0,
      taxAmount: 0,
      totalAmount,
      currency: "INR",
      status: storedStatus,
      paymentStatus: storedPaymentStatus,
      paymentMethod,
      shippingAddress: address,
      deliveryPartner: deliveryDetails?.partner,
      trackingId: deliveryDetails?.trackingId,
      trackingUrl: deliveryDetails?.trackingUrl,
      timeline: [{ status: storedStatus, note: "Order created by admin" }],
      isActive: true,
    };
  });

  const created = await orderRepo.createMany(ordersPayloads);
  await auditService.log({
    actor,
    action: "admin.order.created",
    entityType: "Order",
    entityId: created?.[0]?._id,
    metadata: { count: created.length, userId: String(userId) },
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  });
  return { orders: created };
}

async function updateOrder(orderId, patch, actor, meta) {
  const oldOrder = await orderRepo.findById(orderId);
  if (!oldOrder) throw new AppError("Order not found", 404, "NOT_FOUND");

  const nextStatus = patch?.orderStatus ? toStoredOrderStatus(patch.orderStatus) : null;
  const deliveryDetails = patch?.deliveryDetails;

  if (nextStatus && !ORDER_STATUS.includes(nextStatus)) {
    throw new AppError("Invalid order status", 400, "VALIDATION_ERROR");
  }

  if (nextStatus) {
    assertValidOrderFlow(oldOrder.status, nextStatus);
  }

  const updateData = {};
  if (nextStatus) updateData.status = nextStatus;
  if (deliveryDetails) {
    if (deliveryDetails.trackingId !== undefined) updateData.trackingId = deliveryDetails.trackingId?.trim() || undefined;
    if (deliveryDetails.partner !== undefined) updateData.deliveryPartner = deliveryDetails.partner?.trim() || undefined;
    if (deliveryDetails.trackingUrl !== undefined) updateData.trackingUrl = deliveryDetails.trackingUrl?.trim() || undefined;
  }

  const nextTrackingId = updateData.trackingId !== undefined ? updateData.trackingId : oldOrder.trackingId;
  const nextTrackingUrl = updateData.trackingUrl !== undefined ? updateData.trackingUrl : oldOrder.trackingUrl;
  const hadTrackingAssigned = Boolean(oldOrder.trackingId && oldOrder.trackingUrl);
  const hasTrackingAssignedNow = Boolean(nextTrackingId && nextTrackingUrl);
  const isFirstTrackingAssignment = !hadTrackingAssigned && hasTrackingAssignedNow;

  if (isFirstTrackingAssignment) {
    updateData.trackingAssignedAt = new Date();
    updateData.deliveryStatus = "SHIPPED";
    if (!nextStatus && !["Shipped", "Out for Delivery", "Delivered", "Returned", "Cancelled"].includes(oldOrder.status)) {
      updateData.status = "Shipped";
    }
  }

  const updated = await orderRepo.updateById(orderId, updateData);

  const shouldSendWhatsApp = Boolean(
    isFirstTrackingAssignment &&
      updated?.trackingId &&
      updated?.trackingUrl &&
      !updated?.whatsappSent
  );

  if (shouldSendWhatsApp) {
    const recipientPhone = resolveShipmentPhone(updated);

    if (recipientPhone) {
      const fallbackBody = [
        "Your order has been shipped!",
        "",
        `Order ID: ${updated.orderNumber || updated._id}`,
        `Tracking ID: ${updated.trackingId}`,
        `Track here: ${updated.trackingUrl}`,
        "",
        "Thank you for shopping with us.",
      ].join("\n");

      const message = process.env.TWILIO_ORDER_SHIPPED_CONTENT_SID
        ? {
            contentSid: process.env.TWILIO_ORDER_SHIPPED_CONTENT_SID,
            contentVariables: {
              1: updated.orderNumber || String(updated._id),
              2: updated.trackingId,
              3: updated.trackingUrl,
            },
            fallbackBody,
          }
        : fallbackBody;

      queueWhatsAppMessage(
        recipientPhone,
        message,
        {
          orderId: String(updated._id),
          orderNumber: updated.orderNumber,
          userId: String(updated.userId?._id || ""),
          recipientPhone,
        },
        {
          onSuccess: async () => {
            await orderRepo.markWhatsAppSent(orderId);
          },
          onError: async (error) => {
            logger.error("Failed to send shipment WhatsApp notification", {
              orderId,
              orderNumber: updated.orderNumber,
              recipientPhone,
              error: error.message,
            });
          },
        }
      );
    } else {
      logger.warn("Skipping WhatsApp shipment notification because no recipient phone is available", {
        orderId: String(updated._id),
        orderNumber: updated.orderNumber,
      });
    }
  }

  await auditService.log({
    actor,
    action: "admin.order.updated",
    entityType: "Order",
    entityId: updated._id,
    metadata: {
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(deliveryDetails ? { deliveryDetails } : {}),
      ...(shouldSendWhatsApp ? { whatsappTriggered: true } : {}),
    },
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  });
  return shouldSendWhatsApp ? { ...updated.toObject(), whatsappSent: true } : updated;
}

function resolveShipmentPhone(order) {
  return order?.shippingAddress?.phone || order?.userId?.phone || "";
}

async function softDeleteOrder(orderId, actor, meta) {
  const order = await orderRepo.findById(orderId);
  if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
  const updated = await orderRepo.softDeleteById(orderId, { note: "Soft deleted by admin" });
  await auditService.log({
    actor,
    action: "admin.order.deleted",
    entityType: "Order",
    entityId: updated._id,
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  });
  return updated;
}

async function updateOrderStatus(orderId, status, actor, meta) {
  if (!ORDER_STATUS.includes(status)) {
    throw new AppError("Invalid order status", 400, "VALIDATION_ERROR");
  }

  const order = await orderRepo.findById(orderId);
  if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");

  const updated = await orderRepo.updateStatus(orderId, status);
  await auditService.log({
    actor,
    action: "admin.order.status_updated",
    entityType: "Order",
    entityId: updated._id,
    metadata: { status },
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  });
  return updated;
}

module.exports = {
  getDashboardOverview,
  getAnalytics,
  getDailyRevenue,
  listVendors,
  getVendorDetails,
  listUsers,
  listAuditLogs,
  setUserStatus,
  toggleUserBlocked,
  deleteUser,
  approveVendor,
  rejectVendor,
  removeVendor,
  listOrders,
  getOrderById,
  createOrder,
  updateOrder,
  softDeleteOrder,
  updateOrderStatus,
};
