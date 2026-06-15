const mongoose = require("mongoose");

const campaignDeliverableFundingSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    escrowWalletId: { type: mongoose.Schema.Types.ObjectId, ref: "CampaignEscrowWallet", required: true, index: true },
    deliverableId: { type: mongoose.Schema.Types.ObjectId, ref: "CampaignDeliverable", default: null },
    allocationKey: { type: String, trim: true, required: true },
    deliverableType: { type: String, trim: true, required: true },
    deliverableName: { type: String, trim: true, required: true },
    allocatedAmount: { type: Number, min: 0, required: true },
    releasedAmount: { type: Number, min: 0, default: 0 },
    refundedAmount: { type: Number, min: 0, default: 0 },
    remainingAmount: { type: Number, min: 0, required: true },
    status: {
      type: String,
      enum: ["funded", "partially_released", "released", "partially_refunded", "refunded", "cancelled"],
      default: "funded",
      index: true,
    },
    currency: { type: String, uppercase: true, default: "INR" },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: "campaign_deliverable_funding",
  }
);

campaignDeliverableFundingSchema.index({ campaignId: 1, allocationKey: 1 }, { unique: true });
campaignDeliverableFundingSchema.index({ campaignId: 1, status: 1 });
campaignDeliverableFundingSchema.index({ deliverableId: 1 }, { unique: true, sparse: true });

module.exports =
  mongoose.models.CampaignDeliverableFunding ||
  mongoose.model("CampaignDeliverableFunding", campaignDeliverableFundingSchema);
