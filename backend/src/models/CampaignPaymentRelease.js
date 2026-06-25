const mongoose = require("mongoose");

const releasedDeliverableSchema = new mongoose.Schema(
  {
    deliverableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CampaignDeliverable",
      required: true,
    },
    type: { type: String, trim: true, default: "" },
    title: { type: String, trim: true, default: "" },
    amount: { type: Number, min: 0, required: true },
    approvedAt: { type: Date },
    approvalNotes: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

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

    // Deterministic key for a single admin release request. This complements
    // (rather than replaces) the per-deliverable unique guard below: a retry of
    // the same batch is idempotent while an overlapping batch remains blocked.
    releaseKey: {
      type: String,
      trim: true,
      minlength: 64,
      maxlength: 64,
      unique: true,
      sparse: true,
    },

    // Deliverables being released
    deliverables: { type: [releasedDeliverableSchema], required: true, default: [] },

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
  {
    unique: true,
    // A cancelled claim may be retried, but every active release must retain
    // exclusive ownership of its deliverables.
    partialFilterExpression: { status: { $in: ["approved", "released", "settled"] } },
  }
);

module.exports = mongoose.model("CampaignPaymentRelease", campaignPaymentReleaseSchema);
