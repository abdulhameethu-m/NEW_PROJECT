const mongoose = require("mongoose");

const USER_NOTIFICATION_TYPE = ["ORDER", "DELIVERY", "PAYMENT", "ACCOUNT", "SUPPORT", "SYSTEM"];

const userNotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: USER_NOTIFICATION_TYPE,
      default: "SYSTEM",
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 800 },
    entityType: { type: String, trim: true, maxlength: 60 },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

userNotificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = {
  UserNotification: mongoose.model("UserNotification", userNotificationSchema),
  USER_NOTIFICATION_TYPE,
};
