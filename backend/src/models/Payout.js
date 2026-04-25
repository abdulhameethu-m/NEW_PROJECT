const mongoose = require("mongoose");

const PAYOUT_STATUS = ["PENDING", "QUEUED", "PROCESSING", "PAID", "FAILED", "ON_HOLD", "CANCELLED"];

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
    netAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: PAYOUT_STATUS,
      default: "ON_HOLD",
      index: true,
    },
    transferId: { type: String, trim: true },
    scheduledFor: { type: Date, index: true },
    queuedAt: { type: Date },
    processedAt: { type: Date },
    failureReason: { type: String, trim: true, maxlength: 500 },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

 payoutSchema.index({ sellerId: 1, status: 1, createdAt: -1 });

module.exports = {
  Payout: mongoose.model("Payout", payoutSchema),
  PAYOUT_STATUS,
};
