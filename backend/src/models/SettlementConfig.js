const mongoose = require("mongoose");

// Singleton configuration. Its version is copied to every new order snapshot.
const settlementConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: "marketplace", unique: true, immutable: true },
    shippingSettlementTarget: { type: String, enum: ["PLATFORM", "VENDOR"], default: "PLATFORM" },
    platformFeeSettlementTarget: { type: String, enum: ["PLATFORM", "VENDOR"], default: "PLATFORM" },
    vendorCommissionEnabled: { type: Boolean, default: true },
    version: { type: Number, min: 1, default: 1 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "settlement_configs" }
);

module.exports = mongoose.models.SettlementConfig || mongoose.model("SettlementConfig", settlementConfigSchema);
