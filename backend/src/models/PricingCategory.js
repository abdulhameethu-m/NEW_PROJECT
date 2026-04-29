const mongoose = require("mongoose");

const pricingCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
      match: /^[A-Z0-9_]+$/,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

pricingCategorySchema.index({ isActive: 1, sortOrder: 1, key: 1 });

module.exports = mongoose.model("PricingCategory", pricingCategorySchema);
