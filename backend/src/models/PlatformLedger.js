const mongoose = require("mongoose");

const PLATFORM_LEDGER_TYPES = ["CREDIT", "DEBIT"];
const PLATFORM_LEDGER_SOURCES = ["ORDER_COMMISSION", "REFUND_COMMISSION_REVERSAL"];

const platformLedgerSchema = new mongoose.Schema(
  {
    type: { type: String, enum: PLATFORM_LEDGER_TYPES, required: true, index: true },
    source: { type: String, enum: PLATFORM_LEDGER_SOURCES, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    referenceId: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", index: true },
    ruleId: { type: mongoose.Schema.Types.ObjectId, ref: "CommissionRule", index: true },
    ruleName: { type: String, trim: true, default: "" },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "platform_ledger" }
);

platformLedgerSchema.index(
  { source: 1, referenceId: 1, orderId: 1, vendorId: 1 },
  { unique: true, partialFilterExpression: { source: { $in: ["ORDER_COMMISSION", "REFUND_COMMISSION_REVERSAL"] } } }
);

module.exports = {
  PlatformLedger: mongoose.models.PlatformLedger || mongoose.model("PlatformLedger", platformLedgerSchema),
  PLATFORM_LEDGER_TYPES,
  PLATFORM_LEDGER_SOURCES,
};

