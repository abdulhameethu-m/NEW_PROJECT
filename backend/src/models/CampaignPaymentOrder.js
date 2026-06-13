const mongoose = require("mongoose");

const campaignPaymentOrderSchema = new mongoose.Schema(
  {
    // Core identifiers
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },

    // Payment details
    razorpayOrderId: {
      type: String,
      trim: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
    },

    // Amount breakdown
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
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Payment status
    status: {
      type: String,
      enum: ["pending", "authorized", "paid", "failed", "cancelled"],
      default: "pending",
      index: true,
    },

    // Payment timestamps
    initiatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    authorizedAt: {
      type: Date,
    },
    paidAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },

    // Failure details
    failureReason: {
      type: String,
      trim: true,
      default: "",
    },
    failureCode: {
      type: String,
      trim: true,
      default: "",
    },

    // Payment metadata
    currency: {
      type: String,
      uppercase: true,
      default: "INR",
    },
    paymentMethod: {
      type: String,
      trim: true,
      default: "razorpay",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // Verification
    signatureVerified: {
      type: Boolean,
      default: false,
    },
    signatureVerifiedAt: {
      type: Date,
    },
    verificationDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Retry tracking
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastRetryAt: {
      type: Date,
    },

    // Audit trail
    ipAddress: {
      type: String,
      trim: true,
      default: "",
    },
    userAgent: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    collection: "campaign_payment_orders",
  }
);

// Indexes
campaignPaymentOrderSchema.index({ vendorId: 1, createdAt: -1 });
campaignPaymentOrderSchema.index({ status: 1, createdAt: -1 });
campaignPaymentOrderSchema.index({ campaignId: 1, vendorId: 1 }, { unique: true });
campaignPaymentOrderSchema.index({ razorpayOrderId: 1 }, { sparse: true });
campaignPaymentOrderSchema.index({ razorpayPaymentId: 1 }, { sparse: true });

module.exports = mongoose.model("CampaignPaymentOrder", campaignPaymentOrderSchema);
