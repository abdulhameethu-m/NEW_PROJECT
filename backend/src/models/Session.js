const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    revokedAt: {
      type: Date,
      index: true,
    },
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });

module.exports = {
  Session: mongoose.model("Session", sessionSchema),
};
