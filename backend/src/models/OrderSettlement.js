const mongoose = require("mongoose");

const orderSettlementSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true, index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    orderNumber: { type: String, required: true, index: true },
    itemAmount: { type: Number, required: true, min: 0 },
    grossOrderAmount: { type: Number, required: true, min: 0 },
    shippingAmount: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, required: true, min: 0 },
    vendorGross: { type: Number, required: true, min: 0 },
    remainingAmount: { type: Number, required: true, min: 0 },
    commissionAmount: { type: Number, required: true, min: 0 },
    vendorNet: { type: Number, required: true, min: 0 },
    platformTotal: { type: Number, required: true, min: 0 },
    settlementMode: { type: String, enum: ["DIRECT_PLATFORM_COLLECTION", "LEGACY"], default: "DIRECT_PLATFORM_COLLECTION" },
    status: { type: String, enum: ["PENDING", "ON_HOLD", "SETTLED", "REVERSED", "CANCELLED"], default: "PENDING", index: true },
    settledAt: { type: Date },
    rulesSnapshot: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
    chargeBreakdown: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true, collection: "order_settlements" }
);

orderSettlementSchema.index({ vendorId: 1, status: 1, createdAt: -1 });
orderSettlementSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.OrderSettlement || mongoose.model("OrderSettlement", orderSettlementSchema);
