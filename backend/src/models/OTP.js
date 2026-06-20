const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: false,
      index: true,
    },
    phone: {
      type: String,
      required: false,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ["password_reset", "email_verification"],
      default: "password_reset",
    },
    deliveryMethod: {
      type: String,
      enum: ["email", "sms"],
      default: "email",
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    verifiedAt: {
      type: Date,
      default: null,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
      expires: 604800, // Auto-delete after 7 days (in seconds)
    },
  },
  { timestamps: true }
);

// Index to find active OTPs for a user
otpSchema.index({ userId: 1, purpose: 1, verifiedAt: 1 });

module.exports = {
  OTP: mongoose.model("OTP", otpSchema),
};
