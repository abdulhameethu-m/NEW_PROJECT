const mongoose = require("mongoose");
const {
  CAMPAIGN_ACCEPTANCE_STATUSES,
  CAMPAIGN_INVITATION_STATUSES,
  CAMPAIGN_STATES,
  CAMPAIGN_WORKFLOW_STATUSES,
  FIXED_PAYMENT_WORKFLOW_STATUSES,
} = require("../shared/constants");

const CAMPAIGN_LIFECYCLE_STATUSES = [
  "DRAFT",
  "INVITATION_PENDING",
  "INVITATION_EXPIRED",
  "CONTENT_CREATION",
  "UNDER_REVIEW",
  "READY_FOR_PUBLISH",
  "PUBLISH_SCHEDULED",
  "LIVE",
  "CONTENT_DEADLINE_MISSED",
  "COMPLETED",
  "REFUND_PENDING",
  "REFUNDED",
  "CANCELLED",
];

const campaignSchema = new mongoose.Schema(
  {
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
    title: { type: String, trim: true, maxlength: 180, default: "" },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    banner: { type: String, trim: true, default: "" },
    campaignType: {
      type: String,
      enum: ["affiliate", "sponsored", "product_review", "ugc", "video", "live_commerce", "brand_ambassador", "custom"],
      default: "affiliate",
      index: true,
    },
    category: { type: String, trim: true, default: "", index: true },
    country: { type: String, trim: true, default: "" },
    language: { type: String, trim: true, default: "en" },
    marketplace: {
      public: { type: Boolean, default: false, index: true },
      applicationDeadline: { type: Date, index: true },
      availableSlots: { type: Number, min: 0, default: 1 },
      requiredDeliverables: { type: [String], default: [] },
      assets: { type: [mongoose.Schema.Types.Mixed], default: [] },
      savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "InfluencerProfile" }],
    },
    applications: {
      type: [{
        influencerId: { type: mongoose.Schema.Types.ObjectId, ref: "InfluencerProfile", index: true },
        status: { type: String, enum: ["draft", "submitted", "pending_review", "shortlisted", "approved", "rejected", "withdrawn"], default: "submitted", index: true },
        profileSummary: { type: String, trim: true, default: "" },
        audienceStats: { type: mongoose.Schema.Types.Mixed, default: {} },
        portfolio: { type: String, trim: true, default: "" },
        attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },
        expectedEarnings: { type: Number, min: 0, default: 0 },
        submittedAt: { type: Date, default: Date.now },
        reviewedAt: { type: Date },
      }],
      default: [],
    },
    deliverables: {
      type: [{
        influencerId: { type: mongoose.Schema.Types.ObjectId, ref: "InfluencerProfile", index: true },
        type: { type: String, trim: true, default: "video" },
        title: { type: String, trim: true, default: "" },
        dueDate: { type: Date },
        contentId: { type: mongoose.Schema.Types.ObjectId, ref: "Reel" },
        status: { type: String, enum: ["draft", "submitted", "under_review", "approved", "rejected"], default: "draft" },
        notes: { type: String, trim: true, default: "" },
        submittedAt: { type: Date },
      }],
      default: [],
    },
    analytics: {
      views: { type: Number, min: 0, default: 0 },
      clicks: { type: Number, min: 0, default: 0 },
      orders: { type: Number, min: 0, default: 0 },
      revenue: { type: Number, min: 0, default: 0 },
      commission: { type: Number, min: 0, default: 0 },
      engagement: { type: Number, min: 0, default: 0 },
    },
    productIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "Campaign requires at least one product",
      },
    },
    commissionPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 50,
    },
    fixedFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    paymentType: {
      type: String,
      enum: ["fixed", "commission", "hybrid", "free_product"],
      default: "commission",
      index: true,
    },
    fixedPaymentWorkflow: {
      status: {
        type: String,
        enum: FIXED_PAYMENT_WORKFLOW_STATUSES,
      },
      contentEnabled: { type: Boolean, default: false },
      acceptedAt: { type: Date },
      fundingStartedAt: { type: Date },
      fundedAt: { type: Date },
      lastTransitionAt: { type: Date },
    },
    commissionWorkflow: {
      contentEnabled: { type: Boolean, default: false },
      publishEnabled: { type: Boolean, default: false },
      trackingActive: { type: Boolean, default: false },
      contentApprovedAt: { type: Date },
      trackingActivatedAt: { type: Date },
      autoStopEnabled: { type: Boolean, default: true },
      closedAt: { type: Date },
      closedReason: { type: String, trim: true, maxlength: 500, default: "" },
    },
    commissionConfig: {
      commissionPercentage: { type: Number, min: 0, max: 50, default: 0 },
      attributionWindowDays: { type: Number, min: 0, default: 0 },
      deliverableCommissionRates: { type: [mongoose.Schema.Types.Mixed], default: [] },
      returnWindowDays: { type: Number, min: 0, default: 0 },
      currency: { type: String, trim: true, uppercase: true, default: "INR" },
    },
    attributionWindowDays: { type: Number, min: 0, default: 0 },
    pricing: {
      fixedCost: { type: Number, min: 0, default: 0 },
      commissionReserve: { type: Number, min: 0, default: 0 },
      productCost: { type: Number, min: 0, default: 0 },
      shippingCost: { type: Number, min: 0, default: 0 },
      taxes: { type: Number, min: 0, default: 0 },
      platformFees: { type: Number, min: 0, default: 0 },
      totalBudget: { type: Number, min: 0, default: 0 },
      currency: { type: String, trim: true, uppercase: true, default: "INR" },
    },
    productShippingConfig: {
      productRequired: { type: Boolean, default: false },
      returnRequired: { type: Boolean, default: true },
      influencerAddressId: { type: mongoose.Schema.Types.ObjectId },
      vendorReturnAddressId: { type: mongoose.Schema.Types.ObjectId },
      deliveryAddressSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
      returnAddressSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
      shippingCost: { type: Number, min: 0, default: 0 },
      packageWeight: { type: String, trim: true, maxlength: 80, default: "" },
      packageDimensions: { type: mongoose.Schema.Types.Mixed, default: {} },
      notes: { type: String, trim: true, maxlength: 1500, default: "" },
    },
    startDate: { type: Date, index: true },
    endDate: { type: Date, index: true },
    scheduling: {
      settingsSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
      activatedAt: { type: Date },
      expiredAt: { type: Date },
      affiliateEnabled: { type: Boolean, default: false, index: true },
      trackingEnabled: { type: Boolean, default: false, index: true },
      commissionEnabled: { type: Boolean, default: false, index: true },
      autoPublishEnabled: { type: Boolean, default: false },
      affiliateActivatedNotificationSentAt: { type: Date },
      affiliateExpiryReminderSentAt: { type: Date },
      affiliateClosedNotificationSentAt: { type: Date },
    },
    campaignCreatedAt: { type: Date, default: Date.now, index: true },
    invitationSentAt: { type: Date, index: true },
    invitationDeadline: { type: Date, index: true },
    acceptedAt: { type: Date, index: true },
    contentCreationStartDate: { type: Date, index: true },
    contentCreationDeadline: { type: Date, index: true },
    publishScheduledAt: { type: Date, index: true },
    publishedAt: { type: Date, index: true },
    campaignStartedAt: { type: Date, index: true },
    campaignEndDate: { type: Date, index: true },
    campaignCompletedAt: { type: Date, index: true },
    campaignDurationDays: { type: Number, min: 1, default: 30 },
    lifecycleConfig: {
      invitationAcceptanceDays: { type: Number, min: 1, default: 2 },
      contentCreationDays: { type: Number, min: 1, default: 7 },
      campaignDurationDays: { type: Number, min: 1, default: 30 },
    },
    currentLifecycleStatus: {
      type: String,
      enum: CAMPAIGN_LIFECYCLE_STATUSES,
      default: "DRAFT",
      index: true,
    },
    deadline: { type: Date },
    state: {
      type: String,
      enum: CAMPAIGN_STATES,
      default: "draft",
      index: true,
    },
    termsFrozen: {
      commissionPercent: { type: Number, min: 0, max: 50 },
      fixedFee: { type: Number, min: 0 },
      productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
      deadline: { type: Date },
      paymentType: { type: String, enum: ["fixed", "commission", "hybrid", "free_product"] },
      attributionWindowDays: { type: Number, min: 0 },
      pricing: { type: mongoose.Schema.Types.Mixed, default: {} },
      paymentModelSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
      influencerRateSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
      frozenAt: { type: Date },
    },
    paymentModelSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    influencerRateSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    contractSnapshot: {
      locked: { type: Boolean, default: false, index: true },
      lockedAt: { type: Date },
      acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
      influencerId: { type: mongoose.Schema.Types.ObjectId, ref: "InfluencerProfile" },
      termsHash: { type: String, trim: true, default: "" },
      paymentModel: { type: mongoose.Schema.Types.Mixed, default: {} },
      influencerRateCard: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    contractSnapshots: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    history: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "campaigns",
  }
);
campaignSchema.index({ vendorId: 1, state: 1, createdAt: -1 });
campaignSchema.index({ influencerId: 1, state: 1, createdAt: -1 });
campaignSchema.index({ "marketplace.public": 1, state: 1, createdAt: -1 });
campaignSchema.index({ "applications.influencerId": 1, "applications.status": 1 });
campaignSchema.index({ paymentType: 1, attributionWindowDays: 1 });
campaignSchema.index({ "contractSnapshot.locked": 1, state: 1 });
campaignSchema.index({ startDate: 1, endDate: 1, paymentType: 1, state: 1 });
campaignSchema.index({ currentLifecycleStatus: 1, invitationDeadline: 1 });
campaignSchema.index({ currentLifecycleStatus: 1, contentCreationDeadline: 1 });
campaignSchema.index({ currentLifecycleStatus: 1, publishScheduledAt: 1 });
campaignSchema.index({ currentLifecycleStatus: 1, campaignEndDate: 1 });

const campaignInvitationSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    influencerId: { type: mongoose.Schema.Types.ObjectId, ref: "InfluencerProfile", required: true, index: true },
    status: { type: String, enum: CAMPAIGN_INVITATION_STATUSES, default: "invitation_sent", index: true },
    invitedAt: { type: Date, default: Date.now, index: true },
    deadline: { type: Date, index: true },
    viewedAt: { type: Date },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "campaign_invitations" }
);
campaignInvitationSchema.index({ campaignId: 1, influencerId: 1 }, { unique: true });
campaignInvitationSchema.index({ influencerId: 1, status: 1, invitedAt: -1 });
campaignInvitationSchema.index({ influencerId: 1, status: 1, deadline: 1 });

const campaignAcceptanceSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    influencerId: { type: mongoose.Schema.Types.ObjectId, ref: "InfluencerProfile", required: true, index: true },
    acceptedAt: { type: Date, default: Date.now, index: true },
    status: { type: String, enum: CAMPAIGN_ACCEPTANCE_STATUSES, default: "accepted", index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "campaign_acceptances" }
);
campaignAcceptanceSchema.index({ campaignId: 1, influencerId: 1 }, { unique: true });
campaignAcceptanceSchema.index({ influencerId: 1, status: 1, acceptedAt: -1 });
const campaignStatusHistorySchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    oldStatus: { type: String, enum: CAMPAIGN_WORKFLOW_STATUSES, default: "draft" },
    newStatus: { type: String, enum: CAMPAIGN_WORKFLOW_STATUSES, required: true, index: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changedByRole: { type: String, trim: true, default: "" },
    changedAt: { type: Date, default: Date.now, index: true },
    reason: { type: String, trim: true, maxlength: 1000, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "campaign_status_history" }
);
campaignStatusHistorySchema.index({ campaignId: 1, changedAt: -1 });
module.exports = {
  Campaign: mongoose.models.Campaign || mongoose.model("Campaign", campaignSchema),
  CampaignInvitation: mongoose.models.CampaignInvitation || mongoose.model("CampaignInvitation", campaignInvitationSchema),
  CampaignAcceptance: mongoose.models.CampaignAcceptance || mongoose.model("CampaignAcceptance", campaignAcceptanceSchema),
  CampaignStatusHistory: mongoose.models.CampaignStatusHistory || mongoose.model("CampaignStatusHistory", campaignStatusHistorySchema),
  CAMPAIGN_LIFECYCLE_STATUSES,
};
