const mongoose = require("mongoose");

const codAdvanceRuleSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, maxlength: 120 },
    state: { type: String, trim: true, default: "", index: true },
    district: { type: String, trim: true, default: "", index: true },
    shippingZone: { type: String, trim: true, default: "", index: true },
    shippingZones: [{ type: String, trim: true }],
    advanceType: { type: String, enum: ["FIXED", "PERCENTAGE"], default: "FIXED" },
    advanceValue: { type: Number, min: 0, required: true },
    minOrderValue: { type: Number, min: 0, default: 0 },
    maxOrderValue: { type: Number, min: 0, default: 0 },
    priority: { type: Number, min: 0, default: 100 },
    isActive: { type: Boolean, default: true, index: true },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    collection: "cod_advance_rules",
  }
);

codAdvanceRuleSchema.index({ isActive: 1, state: 1, district: 1, priority: 1 });
codAdvanceRuleSchema.index({ isActive: 1, shippingZone: 1, priority: 1 });
codAdvanceRuleSchema.index({ isActive: 1, shippingZones: 1, priority: 1 });

module.exports =
  mongoose.models.CODAdvanceRule || mongoose.model("CODAdvanceRule", codAdvanceRuleSchema);
