const mongoose = require("mongoose");

const vendorPickupAddressSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
      unique: true,
    },
    name: { type: String, trim: true, required: true },
    phone: { type: String, trim: true, required: true },
    address: { type: String, trim: true, required: true },
    city: { type: String, trim: true, required: true },
    state: { type: String, trim: true, required: true },
    pincode: { type: String, trim: true, required: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports = {
  VendorPickupAddress:
    mongoose.models.VendorPickupAddress ||
    mongoose.model("VendorPickupAddress", vendorPickupAddressSchema),
};
