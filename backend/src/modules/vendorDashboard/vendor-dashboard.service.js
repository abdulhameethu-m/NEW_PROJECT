const { AppError } = require("../../utils/AppError");
const productService = require("../../services/product.service");
const orderRepo = require("../../repositories/order.repository");
const productRepo = require("../../repositories/product.repository");
const vendorRepo = require("../../repositories/vendor.repository");
const { Order } = require("../../models/Order");
const { Payout } = require("../../models/Payout");
const { Product } = require("../../models/Product");
const { VendorNotification } = require("../../models/VendorNotification");
const { Review } = require("../../models/Review");
const { ReturnRequest, RETURN_REQUEST_STATUS } = require("../../models/ReturnRequest");
const { Offer } = require("../../models/Offer");
const { SupportTicket } = require("../../models/SupportTicket");

const VENDOR_ORDER_FLOW = ["Placed", "Packed", "Shipped", "Delivered", "Cancelled"];

function normalizePagination(query = {}) {
  return {
    page: Math.max(Number(query.page) || 1, 1),
    limit: Math.min(Math.max(Number(query.limit) || 10, 1), 100),
  };
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

class VendorDashboardService {
  async getVendorContext(userId) {
    const vendor = await vendorRepo.findByUserId(userId);
    if (!vendor) {
      throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
    }

    await vendorRepo.updateById(vendor._id, { lastActiveAt: new Date() });
    return vendor;
  }

  async createNotification(vendorId, payload) {
    return await VendorNotification.create({ vendorId, ...payload });
  }

  async getDashboard(userId) {
    const vendor = await this.getVendorContext(userId);
    const todayMatch = { sellerId: vendor._id, createdAt: { $gte: startOfToday(), $lte: endOfToday() } };

    const [todayOrders, pendingOrders, shippedOrders, revenueAggregate, lowStockProducts, unreadNotifications] = await Promise.all([
      Order.countDocuments(todayMatch),
      Order.countDocuments({ sellerId: vendor._id, status: { $in: ["Pending", "Placed", "Packed"] } }),
      Order.countDocuments({ sellerId: vendor._id, status: "Shipped" }),
      Order.aggregate([
        { $match: { sellerId: vendor._id, status: { $in: ["Shipped", "Delivered"] } } },
        { $group: { _id: null, revenue: { $sum: "$totalAmount" } } },
      ]),
      Product.countDocuments({
        sellerId: vendor._id,
        isActive: true,
        $expr: { $lte: ["$stock", "$lowStockThreshold"] },
      }),
      VendorNotification.countDocuments({ vendorId: vendor._id, isRead: false }),
    ]);

    const [recentOrders, topProducts] = await Promise.all([
      Order.find({ sellerId: vendor._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("orderNumber totalAmount status paymentStatus createdAt deliveryStatus"),
      Product.find({ sellerId: vendor._id })
        .sort({ "analytics.totalRevenue": -1, "analytics.salesCount": -1, createdAt: -1 })
        .limit(5)
        .select("name status stock analytics price discountPrice"),
    ]);

    return {
      vendor: {
        id: vendor._id,
        shopName: vendor.shopName,
        status: vendor.status,
        payoutSchedule: vendor.payoutSchedule,
      },
      stats: {
        ordersToday: todayOrders,
        pendingOrders,
        shippedOrders,
        totalRevenue: revenueAggregate[0]?.revenue || 0,
        lowStockProducts,
        unreadNotifications,
      },
      recentOrders,
      topProducts,
    };
  }

  async listProducts(userId, query) {
    const vendor = await this.getVendorContext(userId);
    const { page, limit } = normalizePagination(query);
    return await productRepo.list({
      page,
      limit,
      sellerId: vendor._id,
      status: query.status,
      search: query.search,
      sortBy: query.sortBy || "createdAt",
      sortOrder: query.sortOrder === "asc" ? 1 : -1,
      category: query.category,
    });
  }

  async createProduct(userId, payload) {
    const vendor = await this.getVendorContext(userId);
    const product = await productService.createProduct(payload, userId, "seller", vendor._id);
    await this.createNotification(vendor._id, {
      type: "PRODUCT",
      title: "Product submitted",
      message: `${product.name} was submitted for approval.`,
      entityType: "Product",
      entityId: product._id,
    });
    return product;
  }

  async updateProduct(userId, productId, payload) {
    const vendor = await this.getVendorContext(userId);
    const product = await productService.updateProduct(productId, payload, userId, "seller", vendor._id);
    await this.createNotification(vendor._id, {
      type: "PRODUCT",
      title: "Product updated",
      message: `${product.name} was updated.`,
      entityType: "Product",
      entityId: product._id,
    });
    return product;
  }

  async deleteProduct(userId, productId) {
    const vendor = await this.getVendorContext(userId);
    return await productService.deleteProduct(productId, userId, "seller", vendor._id);
  }

  async listOrders(userId, query) {
    const vendor = await this.getVendorContext(userId);
    const { page, limit } = normalizePagination(query);
    return await orderRepo.listBySellerId({
      sellerId: vendor._id,
      page,
      limit,
      status: query.status,
      sortBy: query.sortBy || "createdAt",
      sortOrder: query.sortOrder === "asc" ? 1 : -1,
    });
  }

  async updateOrderStatus(userId, orderId, status) {
    const vendor = await this.getVendorContext(userId);
    if (!VENDOR_ORDER_FLOW.includes(status)) {
      throw new AppError("Invalid vendor order status", 400, "VALIDATION_ERROR");
    }

    const order = await Order.findById(orderId);
    if (!order || String(order.sellerId) !== String(vendor._id)) {
      throw new AppError("Order not found", 404, "NOT_FOUND");
    }

    const allowedTransitions = {
      Pending: ["Placed", "Packed", "Cancelled"],
      Placed: ["Packed", "Cancelled"],
      Packed: ["Shipped", "Cancelled"],
      Shipped: ["Delivered"],
      Delivered: [],
      Cancelled: [],
    };

    const nextAllowed = allowedTransitions[order.status] || [];
    if (!nextAllowed.includes(status)) {
      throw new AppError(`Cannot change order from ${order.status} to ${status}`, 400, "INVALID_STATUS_TRANSITION");
    }

    const updated = await orderRepo.updateStatus(orderId, status);
    const deliveryStatus =
      status === "Shipped"
        ? "SHIPPED"
        : status === "Delivered"
          ? "DELIVERED"
          : order.deliveryStatus;

    if (deliveryStatus !== updated.deliveryStatus) {
      updated.deliveryStatus = deliveryStatus;
      await updated.save();
    }

    await this.createNotification(vendor._id, {
      type: "ORDER",
      title: "Order status updated",
      message: `Order ${updated.orderNumber} moved to ${status}.`,
      entityType: "Order",
      entityId: updated._id,
    });

    return updated;
  }

  async getInventory(userId, query) {
    const vendor = await this.getVendorContext(userId);
    const { page, limit } = normalizePagination(query);
    const result = await productRepo.list({
      sellerId: vendor._id,
      page,
      limit,
      search: query.search,
      sortBy: query.sortBy || "stock",
      sortOrder: query.sortOrder === "desc" ? -1 : 1,
    });

    return {
      ...result,
      products: result.products.map((product) => ({
        ...product.toObject(),
        lowStock: product.stock <= (product.lowStockThreshold || vendor.lowStockThreshold || 10),
      })),
    };
  }

  async updateInventory(userId, productId, payload) {
    const vendor = await this.getVendorContext(userId);
    const product = await Product.findOne({ _id: productId, sellerId: vendor._id });
    if (!product) {
      throw new AppError("Product not found", 404, "NOT_FOUND");
    }

    if (payload.stock != null) product.stock = Number(payload.stock);
    if (payload.lowStockThreshold != null) product.lowStockThreshold = Number(payload.lowStockThreshold);
    await product.save();

    if (product.stock <= product.lowStockThreshold) {
      await this.createNotification(vendor._id, {
        type: "PRODUCT",
        title: "Low stock alert",
        message: `${product.name} is running low with ${product.stock} units left.`,
        entityType: "Product",
        entityId: product._id,
        priority: "high",
      });
    }

    return product;
  }

  async getAnalytics(userId) {
    const vendor = await this.getVendorContext(userId);

    const [salesTrend, topProducts, statusBreakdown] = await Promise.all([
      Order.aggregate([
        { $match: { sellerId: vendor._id } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            revenue: { $sum: "$totalAmount" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
        {
          $project: {
            _id: 0,
            label: {
              $concat: [
                { $toString: "$_id.year" },
                "-",
                {
                  $cond: [
                    { $lt: ["$_id.month", 10] },
                    { $concat: ["0", { $toString: "$_id.month" }] },
                    { $toString: "$_id.month" },
                  ],
                },
              ],
            },
            revenue: 1,
            orders: 1,
          },
        },
      ]),
      Product.find({ sellerId: vendor._id })
        .sort({ "analytics.totalRevenue": -1, "analytics.salesCount": -1 })
        .limit(10)
        .select("name analytics stock status"),
      Order.aggregate([
        { $match: { sellerId: vendor._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return { salesTrend, topProducts, statusBreakdown };
  }

  async getPayouts(userId) {
    const vendor = await this.getVendorContext(userId);
    const [pending, history, aggregates] = await Promise.all([
      Payout.find({ sellerId: vendor._id, status: "PENDING" }).sort({ createdAt: -1 }).populate("orderId", "orderNumber totalAmount status createdAt"),
      Payout.find({ sellerId: vendor._id }).sort({ createdAt: -1 }).limit(20).populate("orderId", "orderNumber totalAmount status createdAt"),
      Payout.aggregate([
        { $match: { sellerId: vendor._id } },
        {
          $group: {
            _id: "$status",
            amount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const earnings = aggregates.reduce(
      (acc, item) => {
        acc[item._id.toLowerCase()] = item.amount;
        return acc;
      },
      { pending: 0, paid: 0, failed: 0 }
    );

    return {
      overview: {
        pendingAmount: earnings.pending || 0,
        paidAmount: earnings.paid || 0,
        failedAmount: earnings.failed || 0,
      },
      pending,
      history,
    };
  }

  async getDelivery(userId, query) {
    const vendor = await this.getVendorContext(userId);
    const { page, limit } = normalizePagination(query);
    const skip = (page - 1) * limit;
    const filter = { sellerId: vendor._id };
    if (query.deliveryStatus) filter.deliveryStatus = query.deliveryStatus;

    const [shipments, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("orderNumber status deliveryPartner trackingId trackingUrl deliveryStatus createdAt shippingAddress"),
      Order.countDocuments(filter),
    ]);

    return {
      shipments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateDelivery(userId, orderId, payload) {
    const vendor = await this.getVendorContext(userId);
    const order = await Order.findOne({ _id: orderId, sellerId: vendor._id });
    if (!order) {
      throw new AppError("Order not found", 404, "NOT_FOUND");
    }

    if (payload.deliveryPartner) order.deliveryPartner = payload.deliveryPartner;
    if (payload.trackingId) order.trackingId = payload.trackingId;
    if (payload.trackingUrl) order.trackingUrl = payload.trackingUrl;
    if (payload.deliveryStatus) order.deliveryStatus = payload.deliveryStatus;
    await order.save();
    return order;
  }

  async getSettings(userId) {
    return await this.getVendorContext(userId);
  }

  async updateSettings(userId, payload) {
    const vendor = await this.getVendorContext(userId);
    const updatable = {
      companyName: payload.companyName,
      shopName: payload.shopName,
      storeSlug: payload.storeSlug,
      storeDescription: payload.storeDescription,
      supportEmail: payload.supportEmail,
      supportPhone: payload.supportPhone,
      logoUrl: payload.logoUrl,
      bannerUrl: payload.bannerUrl,
      payoutSchedule: payload.payoutSchedule,
      defaultCourier: payload.defaultCourier,
      lowStockThreshold: payload.lowStockThreshold,
      bankDetails: payload.bankDetails,
      address: payload.address,
      notificationPreferences: payload.notificationPreferences,
    };

    Object.keys(updatable).forEach((key) => updatable[key] === undefined && delete updatable[key]);
    return await vendorRepo.updateById(vendor._id, updatable);
  }

  async getNotifications(userId, query) {
    const vendor = await this.getVendorContext(userId);
    const { page, limit } = normalizePagination(query);
    const skip = (page - 1) * limit;
    const filter = { vendorId: vendor._id };
    if (query.type) filter.type = query.type;
    if (query.isRead != null) filter.isRead = query.isRead === "true";

    const [notifications, total, unreadCount] = await Promise.all([
      VendorNotification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      VendorNotification.countDocuments(filter),
      VendorNotification.countDocuments({ vendorId: vendor._id, isRead: false }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async markNotificationRead(userId, notificationId) {
    const vendor = await this.getVendorContext(userId);
    const notification = await VendorNotification.findOneAndUpdate(
      { _id: notificationId, vendorId: vendor._id },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );
    if (!notification) {
      throw new AppError("Notification not found", 404, "NOT_FOUND");
    }
    return notification;
  }

  async getReviews(userId, query) {
    const vendor = await this.getVendorContext(userId);
    const { page, limit } = normalizePagination(query);
    const skip = (page - 1) * limit;
    const filter = { vendorId: vendor._id };
    if (query.rating) filter.rating = Number(query.rating);

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("productId", "name images")
        .populate("userId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(filter),
    ]);

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async respondToReview(userId, reviewId, message) {
    const vendor = await this.getVendorContext(userId);
    const review = await Review.findOneAndUpdate(
      { _id: reviewId, vendorId: vendor._id },
      {
        $set: {
          sellerResponse: {
            message,
            respondedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!review) {
      throw new AppError("Review not found", 404, "NOT_FOUND");
    }

    return review;
  }

  async getReturns(userId, query) {
    const vendor = await this.getVendorContext(userId);
    const { page, limit } = normalizePagination(query);
    const skip = (page - 1) * limit;
    const filter = { vendorId: vendor._id };
    if (query.status) filter.status = query.status;

    const [requests, total] = await Promise.all([
      ReturnRequest.find(filter)
        .populate("orderId", "orderNumber totalAmount status")
        .populate("customerId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ReturnRequest.countDocuments(filter),
    ]);

    return {
      returns: requests,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateReturnStatus(userId, returnId, payload) {
    const vendor = await this.getVendorContext(userId);
    if (!RETURN_REQUEST_STATUS.includes(payload.status)) {
      throw new AppError("Invalid return status", 400, "VALIDATION_ERROR");
    }

    const request = await ReturnRequest.findOne({ _id: returnId, vendorId: vendor._id });
    if (!request) {
      throw new AppError("Return request not found", 404, "NOT_FOUND");
    }

    request.status = payload.status;
    request.resolutionNote = payload.resolutionNote;
    request.refundAmount = payload.refundAmount ?? request.refundAmount;
    request.resolvedAt = new Date();
    await request.save();
    return request;
  }

  async getOffers(userId, query) {
    const vendor = await this.getVendorContext(userId);
    const { page, limit } = normalizePagination(query);
    const skip = (page - 1) * limit;
    const filter = { vendorId: vendor._id };
    if (query.isActive != null) filter.isActive = query.isActive === "true";

    const [offers, total] = await Promise.all([
      Offer.find(filter)
        .populate("productIds", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Offer.countDocuments(filter),
    ]);

    return {
      offers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async createOffer(userId, payload) {
    const vendor = await this.getVendorContext(userId);
    return await Offer.create({
      vendorId: vendor._id,
      title: payload.title,
      code: payload.code,
      description: payload.description,
      type: payload.type,
      value: payload.value,
      minOrderValue: payload.minOrderValue,
      usageLimit: payload.usageLimit,
      productIds: payload.productIds || [],
      isActive: payload.isActive !== false,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
    });
  }

  async updateOffer(userId, offerId, payload) {
    const vendor = await this.getVendorContext(userId);
    const offer = await Offer.findOneAndUpdate(
      { _id: offerId, vendorId: vendor._id },
      { $set: payload },
      { new: true, runValidators: true }
    );
    if (!offer) {
      throw new AppError("Offer not found", 404, "NOT_FOUND");
    }
    return offer;
  }

  async getSupportTickets(userId, query) {
    const vendor = await this.getVendorContext(userId);
    const { page, limit } = normalizePagination(query);
    const skip = (page - 1) * limit;
    const filter = { vendorId: vendor._id };
    if (query.status) filter.status = query.status;

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      SupportTicket.countDocuments(filter),
    ]);

    return {
      tickets,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async createSupportTicket(userId, payload) {
    const vendor = await this.getVendorContext(userId);
    return await SupportTicket.create({
      vendorId: vendor._id,
      subject: payload.subject,
      category: payload.category,
      priority: payload.priority || "medium",
      messages: [
        {
          senderType: "VENDOR",
          message: payload.message,
        },
      ],
    });
  }

  async replyToSupportTicket(userId, ticketId, message) {
    const vendor = await this.getVendorContext(userId);
    const ticket = await SupportTicket.findOne({ _id: ticketId, vendorId: vendor._id });
    if (!ticket) {
      throw new AppError("Support ticket not found", 404, "NOT_FOUND");
    }
    ticket.messages.push({ senderType: "VENDOR", message });
    if (["RESOLVED", "CLOSED"].includes(ticket.status)) {
      ticket.status = "OPEN";
    }
    await ticket.save();
    return ticket;
  }
}

module.exports = new VendorDashboardService();
