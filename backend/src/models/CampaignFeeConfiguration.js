const mongoose = require("mongoose");

const campaignFeeConfigurationSchema = new mongoose.Schema(
  {
    feeName: { type: String, trim: true, required: true, maxlength: 120 },
    feeCode: {
      type: String,
      enum: ["platform_fee", "gateway_fee", "gst", "refund_processing_fee", "partial_refund_fee"],
      required: true,
      index: true,
    },
    paymentModel: {
      type: String,
      enum: ["all", "fixed", "commission", "hybrid", "free_product"],
      default: "all",
      index: true,
    },
    feeType: {
      type: String,
      enum: ["percentage", "fixed", "hybrid"],
      required: true,
    },
    percentageValue: { type: Number, min: 0, max: 100, default: 0 },
    fixedValue: { type: Number, min: 0, default: 0 },
    calculationBase: {
      type: String,
      enum: ["campaign_budget", "service_fees", "refundable_amount"],
      default: "campaign_budget",
    },
    isActive: { type: Boolean, default: true, index: true },
    effectiveFrom: { type: Date, default: Date.now, index: true },
    effectiveTo: { type: Date, default: null, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    collection: "campaign_fee_configurations",
  }
);

campaignFeeConfigurationSchema.index({ paymentModel: 1, feeCode: 1, isActive: 1, effectiveFrom: -1 });

module.exports =
  mongoose.models.CampaignFeeConfiguration ||
  mongoose.model("CampaignFeeConfiguration", campaignFeeConfigurationSchema);
