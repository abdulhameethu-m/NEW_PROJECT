const mongoose = require("mongoose");

const campaignEscrowLedgerSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    escrowWalletId: { type: mongoose.Schema.Types.ObjectId, ref: "CampaignEscrowWallet", index: true },
    paymentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "CampaignPaymentOrder", index: true },
    releaseId: { type: mongoose.Schema.Types.ObjectId, ref: "CampaignPaymentRelease", index: true },
    refundId: { type: mongoose.Schema.Types.ObjectId, ref: "CampaignRefund", index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    influencerId: { type: mongoose.Schema.Types.ObjectId, ref: "InfluencerProfile", index: true },
    entryType: {
      type: String,
      enum: [
        "vendor_payment",
        "escrow_funding",
        "platform_revenue",
        "gateway_expense",
        "tax_collected",
        "deliverable_release",
        "refund",
        "settlement",
      ],
      required: true,
      index: true,
    },
    direction: { type: String, enum: ["credit", "debit"], required: true },
    amount: { type: Number, min: 0, required: true },
    balanceAfter: { type: Number, min: 0, required: true },
    currency: { type: String, uppercase: true, default: "INR" },
    idempotencyKey: { type: String, required: true, unique: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: "campaign_escrow_ledger",
  }
);

campaignEscrowLedgerSchema.index({ campaignId: 1, createdAt: 1 });

module.exports =
  mongoose.models.CampaignEscrowLedger ||
  mongoose.model("CampaignEscrowLedger", campaignEscrowLedgerSchema);
