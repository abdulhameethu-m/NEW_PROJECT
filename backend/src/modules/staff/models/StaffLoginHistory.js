const mongoose = require("mongoose");

const staffLoginHistorySchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },
    loggedInAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    successful: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = {
  StaffLoginHistory: mongoose.model("StaffLoginHistory", staffLoginHistorySchema),
};
