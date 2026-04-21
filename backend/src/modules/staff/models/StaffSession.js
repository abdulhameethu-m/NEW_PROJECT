const mongoose = require("mongoose");

const staffSessionSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
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
      default: null,
    },
  },
  { timestamps: true }
);

staffSessionSchema.index({ staffId: 1, revokedAt: 1, expiresAt: 1 });

module.exports = {
  StaffSession: mongoose.model("StaffSession", staffSessionSchema),
};
