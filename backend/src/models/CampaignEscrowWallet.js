const mongoose = require("mongoose");

const campaignEscrowWalletSchema = new mongoose.Schema(
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
    paymentOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CampaignPaymentOrder",
      required: true,
    },

    // Budget tracking
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
    totalEscrowAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Amount tracking
    amountFunded: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    amountReleased: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    amountRefunded: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    amountRemaining: {
      type: Number,
      required: true,
      min: 0,
    },

    // Partial release tracking (for deliverable-based releases)
    partialReleases: [
      {
        _id: false,
        releaseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CampaignPaymentRelease",
        },
        deliverableId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        amount: Number,
        releasedAt: Date,
      },
    ],

    // Refund tracking
    refunds: [
      {
        _id: false,
        refundId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CampaignRefund",
        },
        amount: Number,
        reason: String,
        refundedAt: Date,
      },
    ],

    // Status tracking
    status: {
      type: String,
      enum: [
        "pending",           // Payment not yet received
        "funded",            // Payment received, funds locked in escrow
        "partially_released", // Some deliverables approved, partial funds released
        "fully_released",    // All deliverables approved, all funds released
        "refunded",          // Campaign cancelled, funds refunded
        "completed",         // Campaign completed normally
        "disputed",          // Payment/escrow under dispute
      ],
      default: "pending",
      index: true,
    },

    // Campaign execution tracking
    campaignStatus: {
      type: String,
      enum: ["draft", "active", "paused", "cancelled", "completed"],
      default: "draft",
      index: true,
    },

    // Timestamps
    fundedAt: {
      type: Date,
    },
    firstReleaseAt: {
      type: Date,
    },
    lastReleaseAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },

    // Metadata
    currency: {
      type: String,
      uppercase: true,
      default: "INR",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // Audit
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
    collection: "campaign_escrow_wallets",
  }
);

// Indexes
campaignEscrowWalletSchema.index({ vendorId: 1, createdAt: -1 });
campaignEscrowWalletSchema.index({ campaignId: 1, vendorId: 1 }, { unique: true });
campaignEscrowWalletSchema.index({ status: 1, campaignStatus: 1 });
campaignEscrowWalletSchema.index({ fundedAt: 1 });

module.exports = mongoose.model("CampaignEscrowWallet", campaignEscrowWalletSchema);
