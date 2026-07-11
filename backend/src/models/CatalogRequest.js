const mongoose = require("mongoose");

const REQUEST_TYPES = ["category", "subcategory", "attribute", "product_module"];
const REQUEST_STATUSES = ["draft", "submitted", "under_review", "approved", "rejected", "cancelled", "expired"];

const catalogRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    vendorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    requestType: {
      type: String,
      enum: REQUEST_TYPES,
      required: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    subCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      default: null,
      index: true,
    },
    requestedName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    businessJustification: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: REQUEST_STATUSES,
      default: "submitted",
      index: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    reviewDate: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    reviewReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1500,
    },
    reviewMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    auditHistory: {
      type: [
        {
          action: { type: String, required: true },
          actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
          actorRole: { type: String, trim: true, default: "" },
          details: { type: mongoose.Schema.Types.Mixed, default: {} },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

catalogRequestSchema.pre("validate", function ensureRequestId() {
  if (!this.requestId) {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    this.requestId = `CR-${Date.now()}-${suffix}`;
  }
});

catalogRequestSchema.index({ vendorId: 1, status: 1, createdAt: -1 });

module.exports = {
  REQUEST_TYPES,
  REQUEST_STATUSES,
  CatalogRequest: mongoose.models.CatalogRequest || mongoose.model("CatalogRequest", catalogRequestSchema),
};
