const mongoose = require("mongoose");

const PAYMENT_STATUS = ["PENDING", "PAID", "FAILED"];

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: PAYMENT_STATUS,
      default: "PENDING",
      index: true,
    },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    cartId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cart",
    },
  },
  { timestamps: true }
);

module.exports = {
  Payment: mongoose.model("Payment", paymentSchema),
  PAYMENT_STATUS,
};