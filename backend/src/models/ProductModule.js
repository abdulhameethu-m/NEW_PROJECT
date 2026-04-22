const mongoose = require("mongoose");

const MODULE_FIELD_TYPES = ["text", "textarea", "number", "select", "multi-select", "boolean", "date"];

const productModuleFieldSchema = new mongoose.Schema(
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
    },
    type: {
      type: String,
      enum: MODULE_FIELD_TYPES,
      default: "text",
      required: true,
    },
    required: {
      type: Boolean,
      default: false,
    },
    options: {
      type: [String],
      default: [],
    },
    helpText: {
      type: String,
      trim: true,
      default: "",
      maxlength: 255,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const productModuleSchema = new mongoose.Schema(
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
      unique: true,
      maxlength: 120,
      match: /^[a-z][a-z0-9_]*$/,
    },
    fields: {
      type: [productModuleFieldSchema],
      default: [],
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
  },
  { timestamps: true }
);

productModuleSchema.index({ isActive: 1, order: 1, name: 1 });

module.exports = {
  MODULE_FIELD_TYPES,
  ProductModule:
    mongoose.models.ProductModule || mongoose.model("ProductModule", productModuleSchema),
};
