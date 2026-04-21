const mongoose = require("mongoose");

const STAFF_STATUS = ["active", "suspended"];

const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
      maxlength: 30,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 255,
      select: false,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: STAFF_STATUS,
      default: "active",
      index: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    forceLogoutAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = {
  Staff: mongoose.model("Staff", staffSchema),
  STAFF_STATUS,
};
