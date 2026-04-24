const mongoose = require("mongoose");

const FILTER_TYPES = ["select", "checkbox", "range", "color"];

const rangeConfigSchema = new mongoose.Schema(
  {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100000 },
    step: { type: Number, default: 1 },
  },
  { _id: false }
);

const filterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
      match: /^[a-z][a-z0-9_]*$/,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: FILTER_TYPES,
      index: true,
    },
    options: {
      type: [String],
      default: [],
    },
    categoryIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
      default: [],
      index: true,
    },
    subCategoryIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subcategory" }],
      default: [],
      index: true,
    },
    unit: {
      type: String,
      trim: true,
      default: "",
      maxlength: 40,
    },
    placeholder: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    rangeConfig: {
      type: rangeConfigSchema,
      default: () => ({ min: 0, max: 100000, step: 1 }),
    },
  },
  { timestamps: true }
);

filterSchema.index({ key: 1, categoryIds: 1, subCategoryIds: 1 }, { unique: false });
filterSchema.index({ isActive: 1, order: 1, name: 1 });

module.exports = {
  Filter: mongoose.models.Filter || mongoose.model("Filter", filterSchema),
  FILTER_TYPES,
};
