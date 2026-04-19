const mongoose = require("mongoose");

const PAYOUT_STATUS = ["PENDING", "PAID", "FAILED"];

const payoutSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    commission: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: PAYOUT_STATUS,
      default: "PENDING",
      index: true,
    },
    transferId: { type: String },
  },
  { timestamps: true }
);

module.exports = {
  Payout: mongoose.model("Payout", payoutSchema),
  PAYOUT_STATUS,
};