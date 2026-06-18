const mongoose = require("mongoose");

const objectId = { type: mongoose.Schema.Types.ObjectId, index: true };
const money = { type: Number, min: 0, default: 0 };

const analyticsEventSchema = new mongoose.Schema(
  {
    eventType: { type: String, trim: true, required: true, index: true },
    entityType: { type: String, trim: true, default: "", index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, index: true },
    actorRole: { type: String, trim: true, default: "" },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ["recorded", "processed", "failed"], default: "recorded", index: true },
    errorCode: { type: String, trim: true, default: "" },
    errorMessage: { type: String, trim: true, default: "" },
    processedAt: { type: Date },
  },
  { timestamps: true, collection: "analytics_events" }
);

analyticsEventSchema.index({ eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

const campaignMetricsSchema = new mongoose.Schema(
  {
    campaignId: { ...objectId, ref: "Campaign", required: true, unique: true },
    vendorId: { ...objectId, ref: "Vendor" },
    influencerId: { ...objectId, ref: "InfluencerProfile" },
    paymentModel: { type: String, trim: true, default: "commission", index: true },
    state: { type: String, trim: true, default: "" },
    clicks: { type: Number, min: 0, default: 0 },
    orders: { type: Number, min: 0, default: 0 },
    attributedOrders: { type: Number, min: 0, default: 0 },
    revenue: money,
    campaignRevenue: money,
    platformRevenue: money,
    commission: money,
    commissionGenerated: money,
    commissionApproved: money,
    commissionPaid: money,
    pendingCommission: money,
    fixedEarnings: money,
    commissionEarnings: money,
    totalEarnings: money,
    escrow: money,
    escrowFunded: money,
    released: money,
    unreleased: money,
    refund: money,
    productsShipped: { type: Number, min: 0, default: 0 },
    productsDelivered: { type: Number, min: 0, default: 0 },
    productsPending: { type: Number, min: 0, default: 0 },
    productValue: money,
    deliverablesSubmitted: { type: Number, min: 0, default: 0 },
    deliverablesApproved: { type: Number, min: 0, default: 0 },
    deliverablesRejected: { type: Number, min: 0, default: 0 },
    deliverablesReleased: { type: Number, min: 0, default: 0 },
    campaignCompletionPercent: { type: Number, min: 0, default: 0 },
    conversionRate: { type: Number, min: 0, default: 0 },
    averageOrderValue: money,
    roi: { type: Number, default: 0 },
    remainingBudget: money,
    remainingCap: money,
    lastAggregatedAt: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "campaign_metrics" }
);

campaignMetricsSchema.index({ vendorId: 1, paymentModel: 1 });
campaignMetricsSchema.index({ influencerId: 1, paymentModel: 1 });

const vendorMetricsSchema = new mongoose.Schema(
  {
    vendorId: { ...objectId, ref: "Vendor", required: true, unique: true },
    campaignCount: { type: Number, min: 0, default: 0 },
    activeCampaigns: { type: Number, min: 0, default: 0 },
    completedCampaigns: { type: Number, min: 0, default: 0 },
    orders: { type: Number, min: 0, default: 0 },
    revenue: money,
    campaignRevenue: money,
    totalCampaignSpend: money,
    commissionPaid: money,
    influencerEarnings: money,
    platformRevenue: money,
    totalEscrow: money,
    totalReleased: money,
    pendingReleases: money,
    roi: { type: Number, default: 0 },
    paymentModelBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastAggregatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "vendor_metrics" }
);

const influencerMetricsSchema = new mongoose.Schema(
  {
    influencerId: { ...objectId, ref: "InfluencerProfile", required: true, unique: true },
    campaignCount: { type: Number, min: 0, default: 0 },
    campaignsJoined: { type: Number, min: 0, default: 0 },
    campaignsCompleted: { type: Number, min: 0, default: 0 },
    orders: { type: Number, min: 0, default: 0 },
    earnings: money,
    fixedEarnings: money,
    commissionEarnings: money,
    hybridEarnings: money,
    pendingBalance: money,
    availableBalance: money,
    withdrawn: money,
    pendingWithdrawals: money,
    productsReceived: { type: Number, min: 0, default: 0 },
    productValue: money,
    pendingDeliveries: { type: Number, min: 0, default: 0 },
    paymentModelBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastAggregatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "influencer_metrics" }
);

const adminMetricsSchema = new mongoose.Schema(
  {
    key: { type: String, trim: true, default: "global", unique: true, index: true },
    totalCampaigns: { type: Number, min: 0, default: 0 },
    totalVendors: { type: Number, min: 0, default: 0 },
    totalInfluencers: { type: Number, min: 0, default: 0 },
    totalOrders: { type: Number, min: 0, default: 0 },
    totalRevenue: money,
    totalCommission: money,
    totalCommissionPaid: money,
    totalPlatformRevenue: money,
    totalWithdrawals: money,
    totalEscrow: money,
    totalEscrowBalance: money,
    totalReleased: money,
    fixedCampaignRevenue: money,
    commissionCampaignRevenue: money,
    hybridCampaignRevenue: money,
    freeProductCampaignRevenue: money,
    paymentModelBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastAggregatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "admin_metrics" }
);

module.exports = {
  AnalyticsEvent: mongoose.models.AnalyticsEvent || mongoose.model("AnalyticsEvent", analyticsEventSchema),
  CampaignMetrics: mongoose.models.CampaignMetrics || mongoose.model("CampaignMetrics", campaignMetricsSchema),
  VendorMetrics: mongoose.models.VendorMetrics || mongoose.model("VendorMetrics", vendorMetricsSchema),
  InfluencerMetrics: mongoose.models.InfluencerMetrics || mongoose.model("InfluencerMetrics", influencerMetricsSchema),
  AdminMetrics: mongoose.models.AdminMetrics || mongoose.model("AdminMetrics", adminMetricsSchema),
};
