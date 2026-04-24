const mongoose = require("mongoose");

const CONTENT_TYPES = ["hero", "promo", "collection"];
const CREATOR_TYPES = ["admin", "vendor"];
const MEDIA_TYPES = ["image", "video"];

const homepageContentSchema = new mongoose.Schema(
  {
    // 🔥 BASIC INFO
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    mediaType: {
      type: String,
      enum: MEDIA_TYPES,
      default: "image",
      index: true,
    },
    altText: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    // 🔥 CONTENT TYPE
    type: {
      type: String,
      enum: CONTENT_TYPES,
      required: true,
      index: true,
    },

    // 🔥 POSITIONING & VISIBILITY
    position: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // 🔥 SCHEDULING
    startDate: {
      type: Date,
      default: new Date(),
      index: true,
    },
    endDate: {
      type: Date,
      default: null,
      index: true,
    },

    // 🔥 CREATOR INFO
    createdBy: {
      type: String,
      enum: CREATOR_TYPES,
      required: true,
      index: true,
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🔥 VENDOR INFO (optional, only if createdBy = 'vendor')
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
      index: true,
    },

    // 🔥 LINKED PRODUCTS (for smart recommendations)
    linkedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    // 🔥 CALL TO ACTION
    ctaUrl: {
      type: String,
      trim: true,
      default: "",
    },
    ctaText: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "View More",
    },

    // 🔥 METADATA
    viewCount: {
      type: Number,
      default: 0,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ✨ COMPOUND INDEXES for common queries
homepageContentSchema.index({ type: 1, isActive: 1, position: 1 });
homepageContentSchema.index({ createdBy: 1, isActive: 1 });
homepageContentSchema.index({ vendorId: 1, isActive: 1 });
homepageContentSchema.index({ startDate: 1, endDate: 1, isActive: 1 });

// ✨ HELPER METHODS
homepageContentSchema.methods.isValidDateRange = function () {
  const now = new Date();
  const isAfterStart = !this.startDate || this.startDate <= now;
  const isBeforeEnd = !this.endDate || this.endDate >= now;
  return isAfterStart && isBeforeEnd;
};

homepageContentSchema.methods.isVisible = function () {
  return this.isActive && this.isValidDateRange();
};

// ✨ STATIC METHODS
homepageContentSchema.statics.getActiveByType = async function (type) {
  const now = new Date();
  return await this.find({
    type,
    isActive: true,
    startDate: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $gte: now } }],
  })
    .sort({ position: 1, createdAt: -1 })
    .populate("vendorId", "companyName")
    .populate("createdByUserId", "name email");
};

homepageContentSchema.statics.getByCreator = async function (creatorType, creatorId, vendorId = null) {
  const query = {
    createdBy: creatorType,
    createdByUserId: creatorId,
  };

  if (vendorId) {
    query.vendorId = vendorId;
  }

  return await this.find(query)
    .sort({ position: 1, createdAt: -1 });
};

const HomepageContent = mongoose.model("HomepageContent", homepageContentSchema);

module.exports = { HomepageContent };
