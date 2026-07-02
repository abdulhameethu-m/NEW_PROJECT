const mongoose = require("mongoose");

const campaignRefundSchema = new mongoose.Schema(
  {
    // Core identifiers
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    escrowWalletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CampaignEscrowWallet",
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    influencerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InfluencerProfile",
      index: true,
    },
    paymentOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CampaignPaymentOrder",
    },
    refundId: { type: String, trim: true, index: true, sparse: true },
    paymentModel: { type: String, enum: ["fixed", "hybrid"], index: true },
    escrowAmount: { type: Number, min: 0, default: 0 },
    releasedAmount: { type: Number, min: 0, default: 0 },
    refundAmount: { type: Number, min: 0, default: 0 },

    // Refund amounts
    budgetAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFeeAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    gatewayFeeAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    taxAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalRefundAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    grossRefundAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    processingFeeAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    partialRefundFeeAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    feeConfigurationSnapshot: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    fundingAllocationIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "CampaignDeliverableFunding",
    }],

    // Fee handling
    refundPlatformFee: {
      type: Boolean,
      default: false, // Whether to refund platform fee
    },
    refundGatewayFee: {
      type: Boolean,
      default: false, // Whether to refund gateway fee
    },
    refundTax: {
      type: Boolean,
      default: false, // Whether to refund tax
    },

    // Refund reason
    reason: {
      type: String,
      enum: [
        "campaign_cancelled_before_acceptance",
        "campaign_cancelled_no_deliverables",
        "partial_completion_cancelled",
        "vendor_request",
        "campaign_expired",
        "influencer_no_show",
        "rejected_deliverables",
        "vendor_cancelled",
        "mutual_cancellation",
        "admin_decision",
        "submission_deadline_expired",
        "campaign_expired_no_upload",
        "influencer_rejected",
        "influencer_inactive",
        "admin_terminated",
        "pending_sla_breached",
        "platform_decision",
        "dispute_resolution",
        "other",
      ],
      required: true,
      index: true,
    },
    refundReason: { type: String, trim: true, default: "" },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    // Refund status
    status: {
      type: String,
      enum: [
        "requested",        // Refund requested by vendor
        "approved",         // Admin approved refund
        "rejected",         // Admin rejected refund
        "processing",       // Processing back to vendor
        "completed",        // Refunded to vendor
        "failed",           // Gateway or reconciliation failure
        "cancelled",        // Refund cancelled
        "disputed",         // Under dispute
      ],
      default: "requested",
      index: true,
    },
    refundStatus: {
      type: String,
      enum: [
        "awaiting_upload",
        "upload_expired",
        "refund_eligible",
        "refund_requested",
        "refund_approved",
        "refund_processing",
        "refund_completed",
        "refund_failed",
        "refund_rejected",
      ],
      default: "refund_requested",
      index: true,
    },

    // Approval workflow
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvalReason: {
      type: String,
      trim: true,
      default: "",
    },
    approvedAt: {
      type: Date,
    },

    // Rejection (if applicable)
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },
    rejectedAt: {
      type: Date,
    },

    // Processing
    processingStartedAt: {
      type: Date,
    },

    // Completion
    completedAt: {
      type: Date,
    },
    razorpayRefundId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    gatewayRefundId: { type: String, trim: true, index: true, sparse: true },
    gatewayPaymentId: { type: String, trim: true, default: "" },
    failureReason: { type: String, trim: true, default: "" },
    transactionId: {
      type: String,
      trim: true,
      default: "",
    },

    // Refund method
    refundMethod: {
      type: String,
      enum: ["original_payment_method", "bank_transfer", "wallet_credit"],
      default: "original_payment_method",
    },

    // Cancellation tracking (released funds that were approved but not yet settled)
    releasedFundsReturned: [
      {
        _id: false,
        releaseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CampaignPaymentRelease",
        },
        amount: Number,
        returnedAt: Date,
      },
    ],

    // Currency
    currency: {
      type: String,
      uppercase: true,
      default: "INR",
    },

    // Metadata
    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // Audit trail
    auditLog: [
      {
        _id: false,
        action: String,
        actor: mongoose.Schema.Types.ObjectId,
        actorRole: String,
        timestamp: { type: Date, default: Date.now },
        details: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
    collection: "campaign_refunds",
  }
);

// Indexes
campaignRefundSchema.index({ campaignId: 1, vendorId: 1 });
campaignRefundSchema.index({ vendorId: 1, createdAt: -1 });
campaignRefundSchema.index({ status: 1, createdAt: -1 });
campaignRefundSchema.index({ reason: 1, status: 1 });
campaignRefundSchema.index({ escrowWalletId: 1 });

module.exports = mongoose.model("CampaignRefund", campaignRefundSchema);
