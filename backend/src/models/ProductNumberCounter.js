const mongoose = require("mongoose");

const productNumberCounterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    sequence: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = {
  ProductNumberCounter:
    mongoose.models.ProductNumberCounter || mongoose.model("ProductNumberCounter", productNumberCounterSchema),
};
