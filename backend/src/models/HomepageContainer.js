const mongoose = require("mongoose");
const { generateSlug } = require("../utils/slug");

const CONTAINER_TYPES = ["PRODUCT_CAROUSEL", "GRID", "FEATURED"];
const VENDOR_MODES = ["ALL_VENDORS", "SPECIFIC_VENDORS"];
const OFFER_TYPES = ["NONE", "PERCENTAGE", "FIXED"];
const SORT_OPTIONS = [
  "BEST_SELLING",
  "HIGHEST_DISCOUNT",
  "NEWEST",
  "TRENDING",
  "PRICE_LOW_TO_HIGH",
  "PRICE_HIGH_TO_LOW",
  "MOST_VIEWED",
  "RANDOM",
];
const PRODUCT_SELECTION_MODES = ["AUTO", "MANUAL"];
const DEVICE_VISIBILITY = ["ALL", "MOBILE_ONLY", "DESKTOP_ONLY"];
const CONTAINER_STATUS = ["DRAFT", "ACTIVE", "DISABLED"];

const homepageContainerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    bannerImage: {
      type: String,
      trim: true,
      default: "",
    },
    containerType: {
      type: String,
      enum: CONTAINER_TYPES,
      default: "PRODUCT_CAROUSEL",
      index: true,
    },
    vendorMode: {
      type: String,
      enum: VENDOR_MODES,
      default: "ALL_VENDORS",
      index: true,
    },
    vendorIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Vendor" }],
      default: [],
    },
    categoryIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
      default: [],
    },
    subCategoryIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subcategory" }],
      default: [],
    },
    brandIds: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    offerType: {
      type: String,
      enum: OFFER_TYPES,
      default: "NONE",
    },
    minDiscountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    maxDiscountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    minPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    maxPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    sortBy: {
      type: String,
      enum: SORT_OPTIONS,
      default: "TRENDING",
    },
    productSelectionMode: {
      type: String,
      enum: PRODUCT_SELECTION_MODES,
      default: "AUTO",
      index: true,
    },
    manualProductIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
      default: [],
    },
    maxProductsToShow: {
      type: Number,
      min: 1,
      max: 100,
      default: 12,
    },
    showOnlyInStock: {
      type: Boolean,
      default: true,
    },
    showOnlyActiveProducts: {
      type: Boolean,
      default: true,
    },
    deviceVisibility: {
      type: String,
      enum: DEVICE_VISIBILITY,
      default: "ALL",
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      index: true,
    },
    scheduleEnabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    startDate: {
      type: Date,
      default: null,
      index: true,
    },
    endDate: {
      type: Date,
      default: null,
      index: true,
    },
    analyticsEnabled: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: CONTAINER_STATUS,
      default: "DRAFT",
      index: true,
    },
    metrics: {
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      orders: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "homepage_containers",
  }
);

homepageContainerSchema.pre("validate", function normalizeContainer() {
  if (this.title && !this.slug) {
    this.slug = generateSlug(this.title);
  } else if (this.slug) {
    this.slug = generateSlug(this.slug);
  }

  if (Array.isArray(this.brandIds)) {
    this.brandIds = this.brandIds.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (Array.isArray(this.tags)) {
    this.tags = this.tags.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean);
  }

  if (this.vendorMode !== "SPECIFIC_VENDORS") {
    this.vendorIds = [];
  }

  if (this.productSelectionMode !== "MANUAL") {
    this.manualProductIds = [];
  }

  if (this.maxDiscountPercentage !== null && this.maxDiscountPercentage < this.minDiscountPercentage) {
    this.maxDiscountPercentage = this.minDiscountPercentage;
  }

  if (this.maxPrice !== null && this.minPrice !== null && this.maxPrice < this.minPrice) {
    this.maxPrice = this.minPrice;
  }

  if (!this.scheduleEnabled) {
    this.startDate = this.startDate || null;
    this.endDate = this.endDate || null;
  }
});

homepageContainerSchema.index({ status: 1, priority: 1, createdAt: -1 });
homepageContainerSchema.index({ scheduleEnabled: 1, startDate: 1, endDate: 1, status: 1 });
homepageContainerSchema.index({ deviceVisibility: 1, status: 1, priority: 1 });

module.exports = {
  HomepageContainer:
    mongoose.models.HomepageContainer ||
    mongoose.model("HomepageContainer", homepageContainerSchema),
  CONTAINER_TYPES,
  VENDOR_MODES,
  OFFER_TYPES,
  SORT_OPTIONS,
  PRODUCT_SELECTION_MODES,
  DEVICE_VISIBILITY,
  CONTAINER_STATUS,
};
