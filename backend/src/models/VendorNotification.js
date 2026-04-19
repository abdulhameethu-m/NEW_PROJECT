const mongoose = require("mongoose");

const VENDOR_NOTIFICATION_TYPE = [
  "ORDER",
  "PAYOUT",
  "PRODUCT",
  "SYSTEM",
  "RETURN",
  "REVIEW",
  "SUPPORT",
];

const vendorNotificationSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: VENDOR_NOTIFICATION_TYPE,
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    entityType: { type: String, trim: true, maxlength: 60 },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

vendorNotificationSchema.index({ vendorId: 1, createdAt: -1 });

module.exports = {
  VendorNotification: mongoose.model("VendorNotification", vendorNotificationSchema),
  VENDOR_NOTIFICATION_TYPE,
};
