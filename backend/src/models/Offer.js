const mongoose = require("mongoose");

const OFFER_TYPE = ["PERCENTAGE", "FIXED"];

const offerSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
    description: { type: String, trim: true, maxlength: 600 },
    type: {
      type: String,
      enum: OFFER_TYPE,
      required: true,
    },
    value: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, min: 0, default: 0 },
    usageLimit: { type: Number, min: 0 },
    usageCount: { type: Number, min: 0, default: 0 },
    productIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    isActive: { type: Boolean, default: true, index: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
  },
  { timestamps: true }
);

offerSchema.index({ vendorId: 1, code: 1 }, { unique: true });

module.exports = {
  Offer: mongoose.model("Offer", offerSchema),
  OFFER_TYPE,
};
