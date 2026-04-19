const mongoose = require("mongoose");

const PRODUCT_STATUS = ["PENDING", "APPROVED", "REJECTED"];
const CREATOR_TYPE = ["ADMIN", "SELLER"];

const variantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g., "Color", "Size"
    values: [{ type: String, required: true, trim: true }], // e.g., ["Red", "Blue", "Green"]
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    shortDescription: {
      type: String,
      maxlength: 500,
    },

    // Classification
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subCategory: {
      type: String,
      trim: true,
    },
    tags: [{ type: String, trim: true, lowercase: true }],

    // Pricing
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPrice: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
      enum: ["USD", "EUR", "INR", "GBP"],
    },

    // Inventory
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    SKU: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },

    // Media
    images: [
      {
        url: { type: String, required: true },
        altText: String,
        isPrimary: { type: Boolean, default: false },
      },
    ],
    thumbnail: String,

    // Vendor Info
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    creatorType: {
      type: String,
      enum: CREATOR_TYPE,
      required: true,
      default: "SELLER",
    },

    // Status & Visibility
    status: {
      type: String,
      enum: PRODUCT_STATUS,
      default: "PENDING",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // For approval workflow
    rejectionReason: String,
    approvedAt: Date,
    approvedBy: mongoose.Schema.Types.ObjectId,

    // Ratings & Reviews
    ratings: {
      averageRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },
      totalReviews: {
        type: Number,
        default: 0,
      },
      ratingBreakdown: {
        five: { type: Number, default: 0 },
        four: { type: Number, default: 0 },
        three: { type: Number, default: 0 },
        two: { type: Number, default: 0 },
        one: { type: Number, default: 0 },
      },
    },

    // Analytics
    analytics: {
      views: {
        type: Number,
        default: 0,
      },
      salesCount: {
        type: Number,
        default: 0,
      },
      totalRevenue: {
        type: Number,
        default: 0,
      },
    },

    // Product Variants (Optional - for size, color, etc.)
    variants: [variantSchema],

    // SEO
    metaDescription: String,
    metaKeywords: [String],

    // Additional Details
    weight: Number, // in kg
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
    returnPolicy: String,
    warranty: String,
  },
  { timestamps: true }
);

// Indexes for performance
productSchema.index({ name: "text", description: "text" });
productSchema.index({ category: 1, isActive: 1, status: 1 });
productSchema.index({ sellerId: 1, isActive: 1 });
productSchema.index({ createdBy: 1, status: 1 });
productSchema.index({ isActive: 1, status: 1, "ratings.averageRating": -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ status: 1, isActive: 1, createdAt: -1 });

module.exports = {
  Product: mongoose.model("Product", productSchema),
  PRODUCT_STATUS,
  CREATOR_TYPE,
};
