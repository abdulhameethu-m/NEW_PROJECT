const mongoose = require("mongoose");

const platformRevenueTransactionSchema = new mongoose.Schema(
  {
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
      index: true,
    },
    paymentModel: {
      type: String,
      enum: ["fixed"],
      required: true,
      default: "fixed",
      index: true,
    },
    platformFeePercentage: {
      type: Number,
      min: 0,
      default: 0,
    },
    platformFeeAmount: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },
    gatewayFeeAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    taxAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    campaignBudget: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },
    grossPaidAmount: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      uppercase: true,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["collected", "refunded", "partially_refunded", "reversed"],
      default: "collected",
      index: true,
    },
    feeConfigurationSnapshot: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "platform_revenue_transactions",
  }
);

platformRevenueTransactionSchema.index({ createdAt: -1 });
platformRevenueTransactionSchema.index({ campaignId: 1, paymentModel: 1 }, { unique: true });
platformRevenueTransactionSchema.index({ vendorId: 1, createdAt: -1 });

module.exports =
  mongoose.models.PlatformRevenueTransaction ||
  mongoose.model("PlatformRevenueTransaction", platformRevenueTransactionSchema);
