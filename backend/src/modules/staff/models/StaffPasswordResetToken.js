const mongoose = require("mongoose");

const staffPasswordResetTokenSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    usedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = {
  StaffPasswordResetToken: mongoose.model(
    "StaffPasswordResetToken",
    staffPasswordResetTokenSchema
  ),
};
