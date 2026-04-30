const mongoose = require("mongoose");

const SHIPPING_ZONES = {
  LOCAL: "Same city delivery",
  REGIONAL: "Nearby districts",
  REMOTE: "Far districts",
};

const shippingConfigSchema = new mongoose.Schema(
  {
    // Location & Zone
    state: {
      type: String,
      required: true,
      default: "Tamil Nadu",
      trim: true,
      index: true,
    },
    zone: {
      type: String,
      required: true,
      enum: Object.keys(SHIPPING_ZONES),
      default: "LOCAL",
    },
    description: {
      type: String,
      default: function () {
        return SHIPPING_ZONES[this.zone] || "";
      },
    },

    // Weight-based Pricing
    baseWeight: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
      description: "Base weight in kg included in basePrice",
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
      default: 50,
      description: "Base shipping price for baseWeight",
    },
    pricePerKg: {
      type: Number,
      required: true,
      min: 0,
      default: 20,
      description: "Additional price per kg beyond baseWeight",
    },

    // Weight Constraints
    minWeight: {
      type: Number,
      required: true,
      min: 0.001,
      default: 0.001,
      description: "Minimum weight in kg for this rule",
    },
    maxWeight: {
      type: Number,
      required: true,
      min: 0.001,
      default: 100,
      description: "Maximum weight in kg for this rule",
    },

    // Advanced Options
    freeShippingThreshold: {
      type: Number,
      default: 0,
      description: "Cart value above which shipping is free (0 = disabled)",
    },
    minOrderValue: {
      type: Number,
      default: 0,
      description: "Minimum order value to apply this shipping rule",
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Admin Notes
    notes: String,

    // Metadata
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound index for efficient lookups
shippingConfigSchema.index({ state: 1, zone: 1, isActive: 1 });
shippingConfigSchema.index({ state: 1, minWeight: 1, maxWeight: 1, isActive: 1 });

function validateShippingRuleValues(payload = {}) {
  if (payload.minWeight !== undefined && payload.maxWeight !== undefined && payload.minWeight >= payload.maxWeight) {
    const error = new Error("minWeight must be less than maxWeight");
    error.name = "ValidationError";
    throw error;
  }

  if (payload.baseWeight !== undefined && payload.maxWeight !== undefined && payload.baseWeight > payload.maxWeight) {
    const error = new Error("baseWeight must not exceed maxWeight");
    error.name = "ValidationError";
    throw error;
  }
}

// Pre-save validation
shippingConfigSchema.pre("save", function () {
  validateShippingRuleValues(this);
});

shippingConfigSchema.pre("findOneAndUpdate", async function () {
  const updates = this.getUpdate() || {};
  const setUpdates = updates.$set || {};
  const current = await this.model.findOne(this.getQuery()).lean();
  const merged = {
    ...(current || {}),
    ...updates,
    ...setUpdates,
  };
  validateShippingRuleValues(merged);
});

// Schema static methods for queries
shippingConfigSchema.statics.findApplicableRule = async function (state, weight) {
  /**
   * Find the most specific shipping rule for a given state and weight
   * Returns the first active rule that matches
   */
  return this.findOne({
    state,
    minWeight: { $lte: weight },
    maxWeight: { $gte: weight },
    isActive: true,
  }).sort({ sortOrder: 1 });
};

shippingConfigSchema.statics.findByZone = async function (state, zone) {
  /**
   * Find all rules for a specific zone
   */
  return this.find({ state, zone, isActive: true }).sort({ sortOrder: 1 });
};

// Schema methods for calculations
shippingConfigSchema.methods.calculateCost = function (weight) {
  /**
   * Calculate shipping cost for given weight
   * @param {number} weight - Weight in kg
   * @returns {number} Shipping cost
   */
  if (weight < this.minWeight || weight > this.maxWeight) {
    throw new Error(
      `Weight ${weight}kg is outside the range [${this.minWeight}-${this.maxWeight}]`
    );
  }

  if (weight <= this.baseWeight) {
    return this.basePrice;
  }

  const extraWeight = weight - this.baseWeight;
  const extraCost = extraWeight * this.pricePerKg;
  return this.basePrice + extraCost;
};

module.exports = mongoose.model("ShippingConfig", shippingConfigSchema);
