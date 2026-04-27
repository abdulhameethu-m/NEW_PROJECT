const mongoose = require("mongoose");

const PAYOUT_REQUEST_STATUS = ["PENDING", "APPROVED", "REJECTED", "PAID", "PROCESSING"];

const payoutRequestSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: PAYOUT_REQUEST_STATUS,
      default: "PENDING",
      index: true,
    },
    requestedAt: { type: Date, default: Date.now, index: true },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    paidAt: { type: Date },
    processingStartedAt: { type: Date },
    processingCompletedAt: { type: Date },
    transactionId: { type: String, trim: true, index: true, sparse: true },
    adminNote: { type: String, trim: true, maxlength: 1000 },
    payoutAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorPayoutAccount",
    },
    approvalActorId: { type: mongoose.Schema.Types.ObjectId },
    rejectionActorId: { type: mongoose.Schema.Types.ObjectId },
    paymentActorId: { type: mongoose.Schema.Types.ObjectId },
    processingLockId: { type: String, trim: true, index: true, sparse: true },
    paymentMode: {
      type: String,
      enum: ["MANUAL", "RAZORPAY"],
      default: "MANUAL",
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

payoutRequestSchema.index({ vendorId: 1, status: 1, requestedAt: -1 });

module.exports = {
  PayoutRequest: mongoose.model("PayoutRequest", payoutRequestSchema),
  PAYOUT_REQUEST_STATUS,
};
