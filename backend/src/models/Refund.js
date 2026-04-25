const mongoose = require("mongoose");

const REFUND_STATUS = ["PENDING", "PROCESSED", "FAILED", "REJECTED"];

const refundSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      index: true,
    },
    refundId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
      unique: true,
    },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: REFUND_STATUS,
      default: "PENDING",
      index: true,
    },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    gateway: {
      type: String,
      enum: ["RAZORPAY", "MANUAL"],
      default: "RAZORPAY",
    },
    requestedByRole: {
      type: String,
      enum: ["admin", "super_admin", "support_admin", "finance_admin", "staff", "system", "vendor"],
      default: "system",
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    notes: { type: String, trim: true, maxlength: 500 },
    processedAt: { type: Date },
    failedAt: { type: Date },
  },
  { timestamps: true }
);

refundSchema.index({ createdAt: -1 });

module.exports = {
  Refund: mongoose.model("Refund", refundSchema),
  REFUND_STATUS,
};
