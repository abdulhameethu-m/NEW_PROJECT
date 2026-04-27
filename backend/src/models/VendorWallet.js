const mongoose = require("mongoose");

const vendorWalletSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      unique: true,
      index: true,
    },
    totalEarnings: { type: Number, required: true, min: 0, default: 0 },
    availableBalance: { type: Number, required: true, min: 0, default: 0 },
    pendingBalance: { type: Number, required: true, min: 0, default: 0 },
    withdrawnAmount: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true }
);

vendorWalletSchema.index({ updatedAt: -1 });

module.exports = mongoose.model("VendorWallet", vendorWalletSchema);
