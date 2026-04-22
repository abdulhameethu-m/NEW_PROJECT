const mongoose = require("mongoose");
const { generateSlug } = require("../utils/slug");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 10,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    icon: {
      type: String,
      trim: true,
      default: "",
    },
    color: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  { timestamps: true }
);

categorySchema.pre("validate", function setCategorySlug() {
  if (!this.code && this.name) {
    this.code = this.name.charAt(0).toUpperCase();
  } else if (this.code) {
    this.code = this.code.trim().toUpperCase();
  }

  if (!this.slug && this.name) {
    this.slug = generateSlug(this.name);
  } else if (this.slug) {
    this.slug = generateSlug(this.slug);
  }
});

categorySchema.index({ isActive: 1, order: 1, name: 1 });

module.exports = {
  Category: mongoose.models.Category || mongoose.model("Category", categorySchema),
};
