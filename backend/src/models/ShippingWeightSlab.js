const mongoose = require("mongoose");

const ZONES = ["LOCAL", "REGIONAL", "REMOTE"];
const STATUSES = ["active", "inactive"];

function normalizeToken(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const shippingWeightSlabSchema = new mongoose.Schema(
  {
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },
    stateKey: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    district: {
      type: String,
      trim: true,
      default: "",
    },
    districtKey: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      index: true,
    },
    zone: {
      type: String,
      enum: ZONES,
      required: [true, "Zone is required"],
      uppercase: true,
      trim: true,
    },
    weightFrom: {
      type: Number,
      required: [true, "Weight from is required"],
      min: [0, "Weight from must be positive"],
    },
    weightTo: {
      type: Number,
      required: [true, "Weight to is required"],
      min: [0.001, "Weight to must be at least 0.001kg"],
    },
    shippingCharge: {
      type: Number,
      required: [true, "Shipping charge is required"],
      min: [0, "Shipping charge cannot be negative"],
    },
    priority: {
      type: Number,
      default: 0,
      index: true,
    },
    status: {
      type: String,
      enum: STATUSES,
      default: "active",
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    settlementRecipient: {
      type: String,
      enum: ["ADMIN", "VENDOR"],
      default: "ADMIN",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

shippingWeightSlabSchema.index({
  stateKey: 1,
  districtKey: 1,
  zone: 1,
  weightFrom: 1,
  weightTo: 1,
  status: 1,
});
shippingWeightSlabSchema.index({ stateKey: 1, zone: 1, status: 1, priority: 1 });

shippingWeightSlabSchema.pre("validate", function normalizeSlab() {
  this.stateKey = normalizeToken(this.state);
  this.districtKey = normalizeToken(this.district);
  this.zone = String(this.zone || "").trim().toUpperCase();
  this.status = String(this.status || "active").trim().toLowerCase();
  this.weightFrom = Number(this.weightFrom);
  this.weightTo = Number(this.weightTo);
  this.shippingCharge = Number(this.shippingCharge);

  if (Number.isFinite(this.weightFrom) && Number.isFinite(this.weightTo) && this.weightFrom >= this.weightTo) {
    this.invalidate("weightTo", "Weight to must be greater than weight from");
  }
});

shippingWeightSlabSchema.methods.matchesWeight = function matchesWeight(weight) {
  const numericWeight = Number(weight);
  return Number.isFinite(numericWeight) && numericWeight >= this.weightFrom && numericWeight <= this.weightTo;
};

shippingWeightSlabSchema.statics.normalizeToken = normalizeToken;
shippingWeightSlabSchema.statics.ZONES = ZONES;
shippingWeightSlabSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model("ShippingWeightSlab", shippingWeightSlabSchema);
