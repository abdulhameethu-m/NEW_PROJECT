const mongoose = require("mongoose");

const campaignPaymentReleaseSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },

    // Deliverables being released
    deliverables: [
      {
        _id: false,
        deliverableId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        type: String, // 'reel', 'post', 'story', etc.
        title: String,
        amount: Number, // Amount for this deliverable
        approvedAt: Date,
        approvalNotes: String,
      },
    ],

    // Release amounts
    totalAmount: {
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
    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Release status
    status: {
      type: String,
      enum: [
        "pending_approval",  // Awaiting vendor approval of deliverables
        "approved",          // Vendor approved, ready to release
        "released",          // Funds moved to influencer wallet
        "settled",           // Funds settled in influencer account
        "cancelled",         // Release cancelled
        "disputed",          // Under dispute
      ],
      default: "pending_approval",
      index: true,
    },

    // Approval workflow
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Vendor user who approved
    },
    approvalReason: {
      type: String,
      trim: true,
      default: "",
    },
    approvalNotes: {
      type: String,
      trim: true,
      default: "",
    },
    approvedAt: {
      type: Date,
    },

    // Release execution
    releasedAt: {
      type: Date,
    },
    walletTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InfluencerLedger",
    },

    // Settlement tracking
    settledAt: {
      type: Date,
    },

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

    // Partial/Full release tracking
    partialRelease: {
      type: Boolean,
      default: false,
    },
    relativeToTotal: {
      percentage: Number, // e.g., 50% of total budget
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
    collection: "campaign_payment_releases",
  }
);

// Indexes
campaignPaymentReleaseSchema.index({ campaignId: 1, influencerId: 1 });
campaignPaymentReleaseSchema.index({ vendorId: 1, createdAt: -1 });
campaignPaymentReleaseSchema.index({ influencerId: 1, status: 1 });
campaignPaymentReleaseSchema.index({ status: 1, createdAt: -1 });
campaignPaymentReleaseSchema.index({ escrowWalletId: 1 });
campaignPaymentReleaseSchema.index(
  { "deliverables.deliverableId": 1 },
  { unique: true }
);

module.exports = mongoose.model("CampaignPaymentRelease", campaignPaymentReleaseSchema);
