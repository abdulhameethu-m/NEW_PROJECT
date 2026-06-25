const mongoose = require("mongoose");

const money = { type: Number, min: 0, default: 0 };

const campaignFinanceSummarySchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true, unique: true, index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    influencerId: { type: mongoose.Schema.Types.ObjectId, ref: "InfluencerProfile", index: true },
    campaignName: { type: String, trim: true, default: "" },
    paymentModel: { type: String, enum: ["fixed", "commission", "hybrid", "free_product"], required: true, index: true },
    campaignState: { type: String, trim: true, default: "" },
    currency: { type: String, trim: true, uppercase: true, default: "INR" },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    sourceUpdatedAt: { type: Date, index: true },
    reconciledAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, collection: "campaign_finance_summary" }
);

campaignFinanceSummarySchema.index({ vendorId: 1, paymentModel: 1, reconciledAt: -1 });
campaignFinanceSummarySchema.index({ influencerId: 1, paymentModel: 1, reconciledAt: -1 });

const campaignFinanceOrderSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    influencerId: { type: mongoose.Schema.Types.ObjectId, ref: "InfluencerProfile", index: true },
    paymentModel: { type: String, enum: ["fixed", "commission", "hybrid", "free_product"], required: true, index: true },
    campaignName: { type: String, trim: true, default: "" },
    orderNumber: { type: String, trim: true, default: "", index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", index: true },
    productName: { type: String, trim: true, default: "" },
    customerName: { type: String, trim: true, default: "" },
    grossAmount: money,
    shippingFee: money,
    platformFee: money,
    adminCommission: money,
    influencerCommission: money,
    vendorNet: money,
    orderStatus: { type: String, trim: true, default: "", index: true },
    paymentStatus: { type: String, trim: true, default: "", index: true },
    settlementStatus: { type: String, trim: true, default: "", index: true },
    orderDate: { type: Date, index: true },
  },
  { timestamps: true, collection: "campaign_finance_orders" }
);

campaignFinanceOrderSchema.index({ campaignId: 1, orderId: 1 }, { unique: true });
campaignFinanceOrderSchema.index({ vendorId: 1, paymentModel: 1, orderDate: -1 });
campaignFinanceOrderSchema.index({ influencerId: 1, paymentModel: 1, orderDate: -1 });

const metricSchema = new mongoose.Schema(
  {
    scopeId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    paymentModel: { type: String, default: "all", index: true },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    reconciledAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

metricSchema.index({ scopeId: 1, paymentModel: 1 }, { unique: true });

const adminMetricSchema = new mongoose.Schema(
  {
    scopeKey: { type: String, required: true, unique: true, default: "global" },
    paymentModel: { type: String, default: "all", index: true },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    reconciledAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, collection: "campaign_finance_admin_metrics" }
);

module.exports = {
  CampaignFinanceSummary: mongoose.models.CampaignFinanceSummary || mongoose.model("CampaignFinanceSummary", campaignFinanceSummarySchema),
  CampaignFinanceOrder: mongoose.models.CampaignFinanceOrder || mongoose.model("CampaignFinanceOrder", campaignFinanceOrderSchema),
  CampaignFinanceVendorMetric: mongoose.models.CampaignFinanceVendorMetric || mongoose.model("CampaignFinanceVendorMetric", metricSchema, "campaign_finance_vendor_metrics"),
  CampaignFinanceInfluencerMetric: mongoose.models.CampaignFinanceInfluencerMetric || mongoose.model("CampaignFinanceInfluencerMetric", metricSchema, "campaign_finance_influencer_metrics"),
  CampaignFinanceAdminMetric: mongoose.models.CampaignFinanceAdminMetric || mongoose.model("CampaignFinanceAdminMetric", adminMetricSchema),
};
