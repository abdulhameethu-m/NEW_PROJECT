const mongoose = require("mongoose");

const returnRuleSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    subCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
      index: true,
    },
    ruleType: {
      type: String,
      enum: ["no_return", "returnable"],
      required: true,
    },
    returnDays: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

returnRuleSchema.index({ categoryId: 1, subCategoryId: 1 }, { unique: true });

module.exports = {
  ReturnRule: mongoose.models.ReturnRule || mongoose.model("ReturnRule", returnRuleSchema),
};
