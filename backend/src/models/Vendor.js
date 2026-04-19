const mongoose = require("mongoose");

const VENDOR_STATUS = ["draft", "pending", "approved", "rejected"];

const vendorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Step 1
    companyName: { type: String, trim: true, maxlength: 160 },
    address: { type: String, trim: true, maxlength: 500 },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },

    // Step 2
    gstNumber: { type: String, trim: true, maxlength: 30 },
    noGst: { type: Boolean, default: false },
    documents: [
      {
        url: { type: String, required: true },
        publicId: { type: String },
        originalName: { type: String },
        mimeType: { type: String },
        size: { type: Number },
      },
    ],

    // Step 3
    bankDetails: {
      accountNumber: { type: String, trim: true, maxlength: 40 },
      IFSC: { type: String, trim: true, maxlength: 20 },
      holderName: { type: String, trim: true, maxlength: 160 },
    },

    // Step 4
    shopName: { type: String, trim: true, maxlength: 160 },
    storeSlug: { type: String, trim: true, lowercase: true, sparse: true, index: true },
    storeDescription: { type: String, trim: true, maxlength: 1200 },
    supportEmail: { type: String, trim: true, lowercase: true, maxlength: 160 },
    supportPhone: { type: String, trim: true, maxlength: 30 },
    logoUrl: { type: String, trim: true, maxlength: 500 },
    bannerUrl: { type: String, trim: true, maxlength: 500 },
    payoutSchedule: {
      type: String,
      enum: ["weekly", "biweekly", "monthly"],
      default: "weekly",
    },
    defaultCourier: { type: String, trim: true, maxlength: 80 },
    lowStockThreshold: { type: Number, min: 0, default: 10 },
    notificationPreferences: {
      emailOrders: { type: Boolean, default: true },
      emailPayouts: { type: Boolean, default: true },
      pushOrders: { type: Boolean, default: true },
      pushSystem: { type: Boolean, default: true },
    },
    shopImages: [
      {
        url: { type: String, required: true },
        publicId: { type: String },
        originalName: { type: String },
        mimeType: { type: String },
        size: { type: Number },
      },
    ],

    stepCompleted: { type: Number, default: 0, min: 0, max: 4, index: true },
    status: { type: String, enum: VENDOR_STATUS, default: "draft", index: true },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
    lastActiveAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = {
  Vendor: mongoose.model("Vendor", vendorSchema),
  VENDOR_STATUS,
};
