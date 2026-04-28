const mongoose = require("mongoose");

const vendorPayoutAccountSchema = new mongoose.Schema(
  {
    // VENDOR REFERENCE
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },

    // ACCOUNT DETAILS (Encrypted)
    accountHolderName: { type: String, trim: true, maxlength: 160, default: "" },
    accountNumberEncrypted: { type: String, maxlength: 500, default: "" }, // Encrypted
    ifscCode: { type: String, trim: true, uppercase: true, maxlength: 20, default: "" },
    bankName: { type: String, trim: true, maxlength: 160, default: "" },
    upiIdEncrypted: { type: String, maxlength: 500, default: "" }, // Encrypted

    // VERIFICATION STATUS
    isActive: { type: Boolean, default: true, index: true },
    isVerified: { type: Boolean, default: false, index: true },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String, maxlength: 500 },
    deactivatedAt: { type: Date },

    // VERSIONING
    version: { type: Number, default: 1 },
    previousVersions: [
      {
        version: Number,
        accountHolderName: String,
        accountNumberEncrypted: String,
        ifscCode: String,
        bankName: String,
        upiIdEncrypted: String,
        isVerified: Boolean,
        verifiedAt: Date,
        createdAt: Date,
      },
    ],

    // AUDIT
    createdByVendor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updateReason: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

// INDEXES for performance
vendorPayoutAccountSchema.index({ vendorId: 1, isActive: 1, createdAt: -1 });
vendorPayoutAccountSchema.index({ vendorId: 1, isVerified: 1 });
vendorPayoutAccountSchema.index({ verificationStatus: 1, createdAt: -1 });
vendorPayoutAccountSchema.index({ isActive: 1, isVerified: 1 });

// LEAN QUERIES - exclude encrypted fields by default to avoid accidental exposure
vendorPayoutAccountSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    // Remove encrypted fields from JSON output
    delete ret.accountNumberEncrypted;
    delete ret.upiIdEncrypted;
    return ret;
  },
});

module.exports = mongoose.model("VendorPayoutAccount", vendorPayoutAccountSchema);
