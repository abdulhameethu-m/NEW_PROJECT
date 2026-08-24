const mongoose = require("mongoose");

// ================================================================
// RETURN REQUEST STATUS STATE MACHINE
// ================================================================
// REQUESTED → ADMIN_REVIEW → ADMIN_APPROVED | ADMIN_REJECTED
// ADMIN_APPROVED → RETURN_PICKUP_PENDING → RETURN_IN_TRANSIT → VENDOR_RECEIVED
// VENDOR_RECEIVED → VENDOR_INSPECTION → ACCEPTED | VENDOR_DISPUTED
// ACCEPTED → REFUND_PENDING → REFUND_INITIATED → REFUNDED
// VENDOR_DISPUTED → ADMIN_DISPUTE_REVIEW → REFUND_PENDING | RETURN_REJECTED
// ================================================================

const RETURN_REQUEST_STATUS = [
  "REQUESTED",
  "ADMIN_REVIEW",
  "ADMIN_APPROVED",
  "ADMIN_REJECTED",
  "RETURN_PICKUP_PENDING",
  "RETURN_IN_TRANSIT",
  "VENDOR_RECEIVED",
  "VENDOR_INSPECTION",
  "ACCEPTED",
  "VENDOR_DISPUTED",
  "ADMIN_DISPUTE_REVIEW",
  "REFUND_PENDING",
  "REFUND_INITIATED",
  "REFUNDED",
  "RETURN_REJECTED",
];

// Legacy statuses kept for backward-compatibility
const LEGACY_STATUS_MAP = {
  APPROVED: "ADMIN_APPROVED",
  REJECTED: "ADMIN_REJECTED",
};

const ALLOWED_TRANSITIONS = {
  REQUESTED: ["ADMIN_REVIEW", "ADMIN_APPROVED", "ADMIN_REJECTED"],
  ADMIN_REVIEW: ["ADMIN_APPROVED", "ADMIN_REJECTED"],
  ADMIN_APPROVED: ["RETURN_PICKUP_PENDING", "RETURN_IN_TRANSIT", "VENDOR_RECEIVED"],
  RETURN_PICKUP_PENDING: ["RETURN_IN_TRANSIT", "VENDOR_RECEIVED"],
  RETURN_IN_TRANSIT: ["VENDOR_RECEIVED"],
  VENDOR_RECEIVED: ["VENDOR_INSPECTION", "ACCEPTED", "VENDOR_DISPUTED"],
  VENDOR_INSPECTION: ["ACCEPTED", "VENDOR_DISPUTED"],
  ACCEPTED: ["REFUND_PENDING"],
  VENDOR_DISPUTED: ["ADMIN_DISPUTE_REVIEW", "REFUND_PENDING", "RETURN_REJECTED"],
  ADMIN_DISPUTE_REVIEW: ["REFUND_PENDING", "RETURN_REJECTED"],
  REFUND_PENDING: ["REFUND_INITIATED"],
  REFUND_INITIATED: ["REFUNDED"],
  REFUNDED: [],
  ADMIN_REJECTED: [],
  RETURN_REJECTED: [],
};

const REASON_CODES = [
  "DAMAGED",
  "DEFECTIVE",
  "WRONG_ITEM",
  "WRONG_VARIANT",
  "NOT_AS_DESCRIBED",
  "MISSING_ITEM",
  "QUALITY_ISSUE",
  "SIZE_ISSUE",
  "OTHER",
];

const VENDOR_DISPUTE_REASON_CODES = [
  "CUSTOMER_DAMAGED",
  "WRONG_PRODUCT_RETURNED",
  "MISSING_PARTS",
  "USED_PRODUCT",
  "TAMPERED_PRODUCT",
  "WRONG_VARIANT_RETURNED",
  "OTHER",
];

// Statuses visible to the Vendor panel (Admin must have approved first)
const VENDOR_VISIBLE_STATUSES = [
  "ADMIN_APPROVED",
  "RETURN_PICKUP_PENDING",
  "RETURN_IN_TRANSIT",
  "VENDOR_RECEIVED",
  "VENDOR_INSPECTION",
  "ACCEPTED",
  "VENDOR_DISPUTED",
  "ADMIN_DISPUTE_REVIEW",
  "REFUND_PENDING",
  "REFUND_INITIATED",
  "REFUNDED",
  "RETURN_REJECTED",
];

const timelineEventSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    previousStatus: { type: String, trim: true, default: "" },
    newStatus: { type: String, trim: true, default: "" },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorRole: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, maxlength: 1000, default: "" },
    reason: { type: String, trim: true, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const returnRequestSchema = new mongoose.Schema(
  {
    // ── Order & Item Reference ──────────────────────────────────
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    // Item-level reference — orderItemSchema has _id:false so we track by productId+variantSku
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    variantId: { type: String, trim: true, default: "" },
    variantSku: { type: String, trim: true, default: "" },
    variantTitle: { type: String, trim: true, default: "" },
    productName: { type: String, trim: true, default: "" },
    productImage: { type: String, trim: true, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },

    // ── Parties ────────────────────────────────────────────────
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ── Customer Return Reason ─────────────────────────────────
    reasonCode: {
      type: String,
      enum: REASON_CODES,
      required: true,
    },
    customerDescription: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    customerEvidence: {
      type: [String], // Cloudinary secure URLs
      default: [],
      validate: {
        validator: (arr) => arr.length <= 5,
        message: "Maximum 5 evidence photos allowed",
      },
    },

    // ── Status ─────────────────────────────────────────────────
    status: {
      type: String,
      enum: RETURN_REQUEST_STATUS,
      default: "REQUESTED",
      index: true,
    },

    // ── Admin Decision ─────────────────────────────────────────
    adminDecision: {
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      at: { type: Date },
      note: { type: String, trim: true, maxlength: 1000, default: "" },
      decision: { type: String, enum: ["APPROVED", "REJECTED", ""], default: "" },
    },

    // ── Vendor Inspection & Decision ──────────────────────────
    vendorInspection: {
      receivedAt: { type: Date },
      receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      inspectedAt: { type: Date },
      notes: { type: String, trim: true, maxlength: 1000, default: "" },
    },
    vendorDecision: {
      decision: { type: String, enum: ["ACCEPTED", "DISPUTED", ""], default: "" },
      reasonCode: {
        type: String,
        enum: [...VENDOR_DISPUTE_REASON_CODES, ""],
        default: "",
      },
      description: { type: String, trim: true, maxlength: 2000, default: "" },
      evidence: {
        type: [String],
        default: [],
        validate: {
          validator: (arr) => arr.length <= 5,
          message: "Maximum 5 vendor evidence photos allowed",
        },
      },
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      at: { type: Date },
    },

    // ── Dispute Resolution ─────────────────────────────────────
    disputeResolution: {
      decision: {
        type: String,
        enum: ["CUSTOMER_WINS", "VENDOR_WINS", ""],
        default: "",
      },
      reason: { type: String, trim: true, maxlength: 1000, default: "" },
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      at: { type: Date },
    },

    // ── Refund Link ────────────────────────────────────────────
    refundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Refund",
      index: true,
    },
    refundAmount: { type: Number, min: 0, default: 0 },
    idempotencyKey: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
      unique: true,
    },

    // ── Immutable Audit Timeline ───────────────────────────────
    timeline: {
      type: [timelineEventSchema],
      default: [],
    },

    // ── Legacy fields (backward-compat) ──────────────────────
    reason: { type: String, trim: true, maxlength: 1000, default: "" }, // kept for old records
    resolutionNote: { type: String, trim: true, maxlength: 1000, default: "" }, // kept for old records
    requestedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes
returnRequestSchema.index({ vendorId: 1, status: 1, createdAt: -1 });
returnRequestSchema.index({ customerId: 1, status: 1, createdAt: -1 });
returnRequestSchema.index({ orderId: 1, productId: 1, variantSku: 1 });
returnRequestSchema.index({ status: 1, createdAt: -1 });
returnRequestSchema.index({ refundId: 1 });

module.exports = {
  ReturnRequest: mongoose.models.ReturnRequest || mongoose.model("ReturnRequest", returnRequestSchema),
  RETURN_REQUEST_STATUS,
  ALLOWED_TRANSITIONS,
  REASON_CODES,
  VENDOR_DISPUTE_REASON_CODES,
  VENDOR_VISIBLE_STATUSES,
  LEGACY_STATUS_MAP,
};
