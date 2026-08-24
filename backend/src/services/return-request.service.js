const crypto = require("crypto");
const mongoose = require("mongoose");
const { AppError } = require("../utils/AppError");
const { Order } = require("../models/Order");
const { ReturnRequest, ALLOWED_TRANSITIONS, VENDOR_VISIBLE_STATUSES, REASON_CODES, VENDOR_DISPUTE_REASON_CODES } = require("../models/ReturnRequest");
const { ReturnRule } = require("../models/ReturnRule");
const { Refund } = require("../models/Refund");
const auditService = require("./audit.service");
const notificationService = require("./notification.service");

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function assertTransition(current, next) {
  const allowed = ALLOWED_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    throw new AppError(
      `Invalid status transition: ${current} → ${next}`,
      409,
      "INVALID_TRANSITION"
    );
  }
}

function buildIdempotencyKey(returnRequestId) {
  return crypto
    .createHash("sha256")
    .update(`return:${String(returnRequestId)}`)
    .digest("hex")
    .slice(0, 48);
}

function addTimelineEvent(doc, { action, previousStatus, newStatus, actorId, actorRole, note = "", reason = "" }) {
  if (!doc.timeline) doc.timeline = [];
  doc.timeline.push({
    action,
    previousStatus: previousStatus || "",
    newStatus: newStatus || "",
    actorId: actorId || null,
    actorRole: actorRole || "",
    note,
    reason,
    timestamp: new Date(),
  });
}

// ──────────────────────────────────────────────────────────────
// Eligibility Helpers
// ──────────────────────────────────────────────────────────────

async function validateOrderEligibility(orderId, customerId) {
  if (!mongoose.isValidObjectId(orderId)) {
    throw new AppError("Invalid orderId", 400, "VALIDATION_ERROR");
  }

  const order = await Order.findById(orderId)
    .select("userId sellerId items status deliveredAt")
    .lean();

  if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");

  const ownerId = String(order.userId?._id || order.userId);
  if (ownerId !== String(customerId)) {
    throw new AppError("Forbidden: this order does not belong to you", 403, "FORBIDDEN");
  }

  if (order.status !== "Delivered") {
    throw new AppError(
      `Cannot raise return request: order status is '${order.status}'. Only Delivered orders are eligible.`,
      409,
      "ORDER_NOT_DELIVERED"
    );
  }

  return order;
}

async function validateReturnWindow(order, productId, subCategoryId) {
  if (!order.deliveredAt) return; // No delivery date — skip window check gracefully

  // Look up the rule by subcategory (if provided via product lookup)
  if (subCategoryId) {
    const rule = await ReturnRule.findOne({ subCategoryId }).lean();
    if (rule) {
      if (rule.ruleType === "no_return") {
        throw new AppError("This product cannot be returned based on its return policy", 409, "RETURN_NOT_ALLOWED");
      }
      if (rule.returnDays > 0) {
        const windowMs = rule.returnDays * 24 * 60 * 60 * 1000;
        const deadlineMs = new Date(order.deliveredAt).getTime() + windowMs;
        if (Date.now() > deadlineMs) {
          throw new AppError(
            `Return window of ${rule.returnDays} days has expired`,
            409,
            "RETURN_WINDOW_EXPIRED"
          );
        }
      }
    }
  }
}

async function findOrderItem(order, productId, variantSku) {
  const item = (order.items || []).find(
    (i) =>
      String(i.productId?._id || i.productId) === String(productId) &&
      (variantSku ? i.variantSku === variantSku : true)
  );
  if (!item) {
    throw new AppError("Product item not found in this order", 404, "ITEM_NOT_FOUND");
  }
  return item;
}

async function checkDuplicateReturn(orderId, productId, variantSku, requestedQty) {
  const activeStatuses = [
    "REQUESTED", "ADMIN_REVIEW", "ADMIN_APPROVED",
    "RETURN_PICKUP_PENDING", "RETURN_IN_TRANSIT",
    "VENDOR_RECEIVED", "VENDOR_INSPECTION",
    "ACCEPTED", "VENDOR_DISPUTED", "ADMIN_DISPUTE_REVIEW",
    "REFUND_PENDING", "REFUND_INITIATED",
  ];

  const existing = await ReturnRequest.find({
    orderId,
    productId,
    variantSku: variantSku || "",
    status: { $in: activeStatuses },
  })
    .select("quantity")
    .lean();

  const alreadyRequested = existing.reduce((sum, r) => sum + (r.quantity || 0), 0);
  if (alreadyRequested > 0) {
    throw new AppError(
      `An active return request already exists for this item (quantity: ${alreadyRequested})`,
      409,
      "DUPLICATE_RETURN"
    );
  }
}

// ──────────────────────────────────────────────────────────────
// Service Class
// ──────────────────────────────────────────────────────────────

class ReturnRequestService {

  // ── Admin Dashboard Stats ─────────────────────────────────

  async getAdminStats() {
    const statuses = [
      "REQUESTED", "ADMIN_REVIEW", "ADMIN_APPROVED", "ADMIN_REJECTED",
      "RETURN_PICKUP_PENDING", "RETURN_IN_TRANSIT",
      "VENDOR_RECEIVED", "VENDOR_INSPECTION",
      "ACCEPTED", "VENDOR_DISPUTED", "ADMIN_DISPUTE_REVIEW",
      "REFUND_PENDING", "REFUND_INITIATED", "REFUNDED", "RETURN_REJECTED",
    ];

    const agg = await ReturnRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const map = {};
    for (const s of statuses) map[s] = 0;
    for (const row of agg) {
      if (map[row._id] !== undefined) map[row._id] = row.count;
    }

    return {
      pendingReview: map.REQUESTED + map.ADMIN_REVIEW,
      approved: map.ADMIN_APPROVED + map.RETURN_PICKUP_PENDING + map.RETURN_IN_TRANSIT,
      vendorInspection: map.VENDOR_RECEIVED + map.VENDOR_INSPECTION + map.ACCEPTED,
      disputes: map.VENDOR_DISPUTED + map.ADMIN_DISPUTE_REVIEW,
      refundPending: map.REFUND_PENDING + map.REFUND_INITIATED,
      refunded: map.REFUNDED,
      rejected: map.ADMIN_REJECTED + map.RETURN_REJECTED,
    };
  }

  // ── Admin List ────────────────────────────────────────────

  async getAdminList({ status, vendorId, customerId, orderId, reasonCode, page = 1, limit = 20, startDate, endDate } = {}) {
    const query = {};
    if (status) query.status = status;
    if (vendorId && mongoose.isValidObjectId(vendorId)) query.vendorId = vendorId;
    if (customerId && mongoose.isValidObjectId(customerId)) query.customerId = customerId;
    if (orderId && mongoose.isValidObjectId(orderId)) query.orderId = orderId;
    if (reasonCode) query.reasonCode = reasonCode;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [returns, total] = await Promise.all([
      ReturnRequest.find(query)
        .populate("customerId", "name email phone")
        .populate("vendorId", "businessName")
        .populate("productId", "name images")
        .populate("orderId", "orderNumber totalAmount")
        .populate("refundId", "status amount refundMethod")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ReturnRequest.countDocuments(query),
    ]);

    return {
      returns,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    };
  }

  // ── Admin Dispute Queue ───────────────────────────────────

  async getAdminDisputeQueue({ page = 1, limit = 20 } = {}) {
    return this.getAdminList({ status: "VENDOR_DISPUTED", page, limit });
  }

  // ── Customer Create Return ────────────────────────────────

  async createReturnRequest({ orderId, productId, variantSku = "", quantity, reasonCode, customerDescription = "", customerEvidence = [], actor, subCategoryId = null }) {
    if (!REASON_CODES.includes(reasonCode)) {
      throw new AppError(`Invalid reasonCode: ${reasonCode}`, 400, "VALIDATION_ERROR");
    }
    if (!quantity || Number(quantity) < 1) {
      throw new AppError("Quantity must be at least 1", 400, "VALIDATION_ERROR");
    }
    if (customerEvidence.length > 5) {
      throw new AppError("Maximum 5 evidence photos allowed", 400, "VALIDATION_ERROR");
    }

    const customerId = actor?.sub || actor?._id;

    const order = await validateOrderEligibility(orderId, customerId);
    await validateReturnWindow(order, productId, subCategoryId);
    const item = await findOrderItem(order, productId, variantSku);
    await checkDuplicateReturn(orderId, productId, variantSku, Number(quantity));

    if (Number(quantity) > item.quantity) {
      throw new AppError(
        `Cannot return more than purchased quantity (${item.quantity})`,
        400,
        "QUANTITY_EXCEEDED"
      );
    }

    const vendorId = order.sellerId?._id || order.sellerId;
    const unitPrice = roundMoney(item.price);
    const refundAmount = roundMoney(unitPrice * Number(quantity));

    const returnRequest = await ReturnRequest.create({
      orderId,
      productId: item.productId?._id || item.productId,
      variantId: item.variantId || "",
      variantSku: item.variantSku || variantSku,
      variantTitle: item.variantTitle || "",
      productName: item.name || "",
      productImage: (item.image) || "",
      quantity: Number(quantity),
      unitPrice,
      vendorId,
      customerId,
      reasonCode,
      customerDescription: String(customerDescription || "").trim(),
      customerEvidence: customerEvidence || [],
      refundAmount,
      reason: String(reasonCode), // legacy compat
      requestedAt: new Date(),
      timeline: [
        {
          action: "RETURN_REQUESTED",
          previousStatus: "",
          newStatus: "REQUESTED",
          actorId: customerId,
          actorRole: "user",
          note: `Return requested for: ${item.name || productId}`,
          timestamp: new Date(),
        },
      ],
    });

    // Link to Order
    await Order.updateOne(
      { _id: orderId },
      { $set: { returnId: returnRequest._id, status: "Return Requested" }, $push: { timeline: { status: "Return Requested", note: `Return request raised (${returnRequest._id})`, timestamp: new Date() } } }
    ).catch(() => null);

    await auditService.log({
      actor,
      action: "return.customer.requested",
      entityType: "ReturnRequest",
      entityId: returnRequest._id,
      metadata: { orderId, productId, quantity, reasonCode },
    }).catch(() => null);

    await notificationService.notifyAdmins("RETURN_REQUESTED", {
      returnId: returnRequest._id,
      orderId,
      customerId,
    }).catch(() => null);

    return returnRequest;
  }

  // ── Customer Get Own Returns ──────────────────────────────

  async getCustomerReturns(customerId, { page = 1, limit = 10 } = {}) {
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [returns, total] = await Promise.all([
      ReturnRequest.find({ customerId })
        .populate("orderId", "orderNumber")
        .populate("productId", "name images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ReturnRequest.countDocuments({ customerId }),
    ]);
    return { returns, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
  }

  // ── Get Single (ownership-scoped) ─────────────────────────

  async getById(returnId, actor) {
    if (!mongoose.isValidObjectId(returnId)) {
      throw new AppError("Invalid returnId", 400, "VALIDATION_ERROR");
    }

    const doc = await ReturnRequest.findById(returnId)
      .populate("customerId", "name email phone")
      .populate("vendorId", "businessName email")
      .populate("productId", "name images")
      .populate("orderId", "orderNumber totalAmount deliveredAt")
      .populate("refundId", "status amount refundMethod processedAt")
      .populate("adminDecision.by", "name email")
      .populate("vendorDecision.by", "name email")
      .populate("disputeResolution.by", "name email")
      .lean();

    if (!doc) throw new AppError("Return request not found", 404, "NOT_FOUND");

    const role = actor?.role;
    if (role === "user") {
      if (String(doc.customerId?._id || doc.customerId) !== String(actor?.sub || actor?._id)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
      }
    }
    if (role === "vendor") {
      const vendorId = actor?.vendorId || actor?.vendor?._id;
      if (String(doc.vendorId?._id || doc.vendorId) !== String(vendorId)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
      }
    }

    return doc;
  }

  // ── Admin Approve ─────────────────────────────────────────

  async adminApprove(returnId, actor, note = "") {
    const doc = await ReturnRequest.findById(returnId);
    if (!doc) throw new AppError("Return request not found", 404, "NOT_FOUND");

    assertTransition(doc.status, "ADMIN_APPROVED");
    const previous = doc.status;

    doc.status = "ADMIN_APPROVED";
    doc.adminDecision = {
      by: actor?.sub || actor?._id,
      at: new Date(),
      note: String(note || "").trim(),
      decision: "APPROVED",
    };
    doc.resolvedAt = null; // still in progress
    addTimelineEvent(doc, {
      action: "ADMIN_APPROVED",
      previousStatus: previous,
      newStatus: "ADMIN_APPROVED",
      actorId: actor?.sub || actor?._id,
      actorRole: actor?.role || "admin",
      note: String(note || ""),
    });

    await doc.save();

    await auditService.log({
      actor,
      action: "return.admin.approved",
      entityType: "ReturnRequest",
      entityId: returnId,
      metadata: { previousStatus: previous, note },
    }).catch(() => null);

    await notificationService.notifyVendorUser(doc.vendorId, "RETURN_APPROVED", { returnId }).catch(() => null);

    return doc;
  }

  // ── Admin Reject ──────────────────────────────────────────

  async adminReject(returnId, actor, reason) {
    if (!reason || !String(reason).trim()) {
      throw new AppError("Rejection reason is required", 400, "VALIDATION_ERROR");
    }

    const doc = await ReturnRequest.findById(returnId);
    if (!doc) throw new AppError("Return request not found", 404, "NOT_FOUND");

    assertTransition(doc.status, "ADMIN_REJECTED");
    const previous = doc.status;

    doc.status = "ADMIN_REJECTED";
    doc.adminDecision = {
      by: actor?.sub || actor?._id,
      at: new Date(),
      note: String(reason).trim(),
      decision: "REJECTED",
    };
    doc.resolvedAt = new Date();
    addTimelineEvent(doc, {
      action: "ADMIN_REJECTED",
      previousStatus: previous,
      newStatus: "ADMIN_REJECTED",
      actorId: actor?.sub || actor?._id,
      actorRole: actor?.role || "admin",
      reason: String(reason),
    });

    await doc.save();

    await auditService.log({
      actor,
      action: "return.admin.rejected",
      entityType: "ReturnRequest",
      entityId: returnId,
      metadata: { previousStatus: previous, reason },
    }).catch(() => null);

    return doc;
  }

  // ── Vendor List (scoped) ──────────────────────────────────

  async getVendorReturns(vendorId, { status, page = 1, limit = 20, startDate, endDate } = {}) {
    const query = {
      vendorId,
      status: { $in: VENDOR_VISIBLE_STATUSES },
    };
    if (status && VENDOR_VISIBLE_STATUSES.includes(status)) {
      query.status = status;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [returns, total] = await Promise.all([
      ReturnRequest.find(query)
        .populate("customerId", "name email")
        .populate("productId", "name images")
        .populate("orderId", "orderNumber")
        .populate("refundId", "status amount")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ReturnRequest.countDocuments(query),
    ]);

    return {
      returns,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    };
  }

  // ── Vendor Mark Received ──────────────────────────────────

  async vendorMarkReceived(returnId, actor) {
    const vendorId = actor?.vendorId || actor?.vendor?._id;
    const doc = await ReturnRequest.findById(returnId);
    if (!doc) throw new AppError("Return request not found", 404, "NOT_FOUND");

    if (String(doc.vendorId) !== String(vendorId)) {
      throw new AppError("Forbidden: this return does not belong to your store", 403, "FORBIDDEN");
    }

    assertTransition(doc.status, "VENDOR_RECEIVED");
    const previous = doc.status;

    doc.status = "VENDOR_RECEIVED";
    doc.vendorInspection = {
      receivedAt: new Date(),
      receivedBy: actor?.sub || actor?._id,
    };
    addTimelineEvent(doc, {
      action: "VENDOR_RECEIVED",
      previousStatus: previous,
      newStatus: "VENDOR_RECEIVED",
      actorId: actor?.sub || actor?._id,
      actorRole: "vendor",
    });

    await doc.save();
    await auditService.log({ actor, action: "return.vendor.received", entityType: "ReturnRequest", entityId: returnId, metadata: { previousStatus: previous } }).catch(() => null);

    return doc;
  }

  // ── Vendor Accept ─────────────────────────────────────────

  async vendorAccept(returnId, actor, notes = "") {
    const vendorId = actor?.vendorId || actor?.vendor?._id;
    const doc = await ReturnRequest.findById(returnId);
    if (!doc) throw new AppError("Return request not found", 404, "NOT_FOUND");

    if (String(doc.vendorId) !== String(vendorId)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    // Allow from VENDOR_RECEIVED or VENDOR_INSPECTION
    if (!["VENDOR_RECEIVED", "VENDOR_INSPECTION"].includes(doc.status)) {
      assertTransition(doc.status, "ACCEPTED");
    }

    const previous = doc.status;

    doc.status = "ACCEPTED";
    doc.vendorDecision = {
      decision: "ACCEPTED",
      reasonCode: "",
      description: String(notes || "").trim(),
      by: actor?.sub || actor?._id,
      at: new Date(),
    };
    if (doc.vendorInspection) doc.vendorInspection.inspectedAt = new Date();

    addTimelineEvent(doc, {
      action: "VENDOR_ACCEPTED",
      previousStatus: previous,
      newStatus: "ACCEPTED",
      actorId: actor?.sub || actor?._id,
      actorRole: "vendor",
      note: notes || "",
    });

    await doc.save();

    // Transition to REFUND_PENDING and create a Refund record
    await this._transitionToRefundPending(doc, actor);

    await auditService.log({ actor, action: "return.vendor.accepted", entityType: "ReturnRequest", entityId: returnId, metadata: { previousStatus: previous } }).catch(() => null);

    return doc;
  }

  // ── Vendor Dispute ────────────────────────────────────────

  async vendorDispute(returnId, actor, { reasonCode, description, evidence = [] }) {
    if (!VENDOR_DISPUTE_REASON_CODES.includes(reasonCode)) {
      throw new AppError(`Invalid dispute reasonCode: ${reasonCode}`, 400, "VALIDATION_ERROR");
    }
    if (!description || !String(description).trim()) {
      throw new AppError("Dispute description is required", 400, "VALIDATION_ERROR");
    }
    if (evidence.length > 5) {
      throw new AppError("Maximum 5 evidence photos allowed", 400, "VALIDATION_ERROR");
    }

    const vendorId = actor?.vendorId || actor?.vendor?._id;
    const doc = await ReturnRequest.findById(returnId);
    if (!doc) throw new AppError("Return request not found", 404, "NOT_FOUND");

    if (String(doc.vendorId) !== String(vendorId)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    if (!["VENDOR_RECEIVED", "VENDOR_INSPECTION"].includes(doc.status)) {
      assertTransition(doc.status, "VENDOR_DISPUTED");
    }

    const previous = doc.status;

    doc.status = "VENDOR_DISPUTED";
    doc.vendorDecision = {
      decision: "DISPUTED",
      reasonCode: reasonCode,
      description: String(description).trim(),
      evidence: evidence || [],
      by: actor?.sub || actor?._id,
      at: new Date(),
    };
    if (doc.vendorInspection) doc.vendorInspection.inspectedAt = new Date();

    addTimelineEvent(doc, {
      action: "VENDOR_DISPUTED",
      previousStatus: previous,
      newStatus: "VENDOR_DISPUTED",
      actorId: actor?.sub || actor?._id,
      actorRole: "vendor",
      reason: `${reasonCode}: ${description}`,
    });

    await doc.save();

    await auditService.log({ actor, action: "return.vendor.disputed", entityType: "ReturnRequest", entityId: returnId, metadata: { previousStatus: previous, reasonCode, description } }).catch(() => null);

    await notificationService.notifyAdmins("VENDOR_DISPUTED", { returnId, vendorId }).catch(() => null);

    return doc;
  }

  // ── Admin Resolve Dispute ─────────────────────────────────

  async adminResolveDispute(returnId, actor, { decision, reason }) {
    if (!["CUSTOMER_WINS", "VENDOR_WINS"].includes(decision)) {
      throw new AppError("Decision must be CUSTOMER_WINS or VENDOR_WINS", 400, "VALIDATION_ERROR");
    }
    if (!reason || !String(reason).trim()) {
      throw new AppError("Resolution reason is required", 400, "VALIDATION_ERROR");
    }

    const doc = await ReturnRequest.findById(returnId);
    if (!doc) throw new AppError("Return request not found", 404, "NOT_FOUND");

    if (!["VENDOR_DISPUTED", "ADMIN_DISPUTE_REVIEW"].includes(doc.status)) {
      throw new AppError("This return is not in a disputable state", 409, "INVALID_STATE");
    }

    const previous = doc.status;
    const newStatus = decision === "CUSTOMER_WINS" ? "REFUND_PENDING" : "RETURN_REJECTED";

    doc.status = newStatus;
    doc.disputeResolution = {
      decision,
      reason: String(reason).trim(),
      by: actor?.sub || actor?._id,
      at: new Date(),
    };
    if (newStatus === "RETURN_REJECTED") {
      doc.resolvedAt = new Date();
    }

    addTimelineEvent(doc, {
      action: decision === "CUSTOMER_WINS" ? "DISPUTE_RESOLVED_CUSTOMER_WINS" : "DISPUTE_RESOLVED_VENDOR_WINS",
      previousStatus: previous,
      newStatus,
      actorId: actor?.sub || actor?._id,
      actorRole: actor?.role || "admin",
      reason: String(reason),
    });

    await doc.save();

    if (decision === "CUSTOMER_WINS") {
      await this._createReturnRefund(doc, actor);
    }

    await auditService.log({ actor, action: "return.admin.dispute_resolved", entityType: "ReturnRequest", entityId: returnId, metadata: { decision, reason, previousStatus: previous, newStatus } }).catch(() => null);

    return doc;
  }

  // ── Internal: Transition to REFUND_PENDING ────────────────

  async _transitionToRefundPending(doc, actor) {
    assertTransition(doc.status, "REFUND_PENDING");
    const previous = doc.status;
    doc.status = "REFUND_PENDING";
    addTimelineEvent(doc, {
      action: "REFUND_PENDING",
      previousStatus: previous,
      newStatus: "REFUND_PENDING",
      actorId: actor?.sub || actor?._id,
      actorRole: actor?.role || "system",
    });
    await doc.save();
    await this._createReturnRefund(doc, actor);
  }

  // ── Internal: Create Refund (idempotent) ──────────────────

  async _createReturnRefund(doc, actor) {
    // Idempotency: check if refund already exists
    const key = buildIdempotencyKey(doc._id);

    const existing = await Refund.findOne({ idempotencyKey: key }).lean();
    if (existing) {
      // Already created — link and return
      if (!doc.refundId) {
        await ReturnRequest.updateOne({ _id: doc._id }, { $set: { refundId: existing._id } });
      }
      return existing;
    }

    // Compute backend-authoritative refund amount
    const refundAmount = roundMoney(doc.refundAmount || (doc.unitPrice * doc.quantity));

    const refund = await Refund.create([{
      orderId: doc.orderId,
      idempotencyKey: key,
      amount: refundAmount,
      deductionAmount: 0,
      grossAmount: refundAmount,
      status: "PENDING",
      reason: `Return request: ${doc.reasonCode}`,
      gateway: "",
      refundMethod: "",
      recommendedRefundMethod: "RAZORPAY",
      refundType: "RETURN",
      returnId: doc._id,
      requestedByRole: actor?.role || "system",
      requestedById: actor?.sub || actor?._id || null,
      paymentMethod: "ONLINE",
      breakdown: {
        refundAmount,
      },
      notes: `ReturnRequest ID: ${doc._id}`,
    }]);

    const refundDoc = Array.isArray(refund) ? refund[0] : refund;

    // Link refund to return request
    await ReturnRequest.updateOne(
      { _id: doc._id },
      { $set: { refundId: refundDoc._id } }
    );

    addTimelineEvent(doc, {
      action: "REFUND_CREATED",
      previousStatus: "REFUND_PENDING",
      newStatus: "REFUND_PENDING",
      actorId: actor?.sub || actor?._id,
      actorRole: "system",
      note: `Refund document ${refundDoc._id} created`,
    });

    await auditService.log({
      actor,
      action: "return.refund.created",
      entityType: "ReturnRequest",
      entityId: doc._id,
      metadata: { refundId: refundDoc._id, refundAmount },
    }).catch(() => null);

    return refundDoc;
  }
}

module.exports = new ReturnRequestService();
