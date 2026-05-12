const mongoose = require("mongoose");

const COMMISSION_TYPES = ["percentage", "fixed"];
const COMMISSION_APPLIES_TO = ["global", "category", "vendor", "product"];

const commissionRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: COMMISSION_TYPES, required: true },
    value: { type: Number, required: true, min: 0 },
    appliesTo: { type: String, enum: COMMISSION_APPLIES_TO, required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", index: true },
    priority: { type: Number, default: 0, index: true },
    active: { type: Boolean, default: true, index: true },
    startDate: { type: Date, default: null, index: true },
    endDate: { type: Date, default: null, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "commission_rules" }
);

commissionRuleSchema.index({ appliesTo: 1, active: 1, priority: -1, startDate: 1, endDate: 1 });

module.exports = {
  CommissionRule: mongoose.models.CommissionRule || mongoose.model("CommissionRule", commissionRuleSchema),
  COMMISSION_TYPES,
  COMMISSION_APPLIES_TO,
};

