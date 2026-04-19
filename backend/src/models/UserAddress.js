const mongoose = require("mongoose");

const userAddressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    addressLine: { type: String, required: true, trim: true, maxlength: 300 },
    city: { type: String, required: true, trim: true, maxlength: 120 },
    state: { type: String, required: true, trim: true, maxlength: 120 },
    pincode: { type: String, required: true, trim: true, maxlength: 20 },
    country: { type: String, required: true, trim: true, maxlength: 120, default: "India" },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userAddressSchema.index({ userId: 1, isDefault: 1 });
userAddressSchema.index({ userId: 1, createdAt: -1 });

module.exports = {
  UserAddress: mongoose.model("UserAddress", userAddressSchema),
};
