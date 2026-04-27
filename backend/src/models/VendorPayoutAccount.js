const mongoose = require("mongoose");

const vendorPayoutAccountSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    accountHolderName: { type: String, trim: true, maxlength: 160, default: "" },
    accountNumber: { type: String, trim: true, maxlength: 40, default: "" },
    ifscCode: { type: String, trim: true, uppercase: true, maxlength: 20, default: "" },
    bankName: { type: String, trim: true, maxlength: 160, default: "" },
    upiId: { type: String, trim: true, lowercase: true, maxlength: 160, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    isVerified: { type: Boolean, default: false, index: true },
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId },
    deactivatedAt: { type: Date },
  },
  { timestamps: true }
);

vendorPayoutAccountSchema.index({ vendorId: 1, isActive: 1, createdAt: -1 });

module.exports = mongoose.model("VendorPayoutAccount", vendorPayoutAccountSchema);
