const mongoose = require("mongoose");
const { getAllModuleKeys } = require("../config/vendorModules.config");

const VENDOR_MODULES = getAllModuleKeys();
const VENDOR_PERMISSION_ACTIONS = ["create", "read", "update", "delete"];

const vendorPermissionsSchema = new mongoose.Schema(
  {
    create: { type: Boolean, default: false },
    read: { type: Boolean, default: true },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false }
);

const vendorModuleSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      enum: VENDOR_MODULES,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    icon: {
      type: String,
      trim: true,
      default: "",
    },
    // 🔥 GLOBAL FEATURE FLAG
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    // 🔥 ADMIN CONTROL - VENDOR ACCESS
    vendorEnabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    vendorPermissions: {
      type: vendorPermissionsSchema,
      default: () => ({
        create: false,
        read: true,
        update: false,
        delete: false,
      }),
    },
    // Display order in UI
    order: {
      type: Number,
      default: 0,
    },
    // Requires specific RBAC permission
    requiredPermission: {
      type: String,
      default: null,
      trim: true,
    },
    // Metadata for frontend
    metadata: {
      category: {
        type: String,
        enum: ["operations", "sales", "finance", "analytics", "marketing"],
        default: "operations",
      },
      beta: {
        type: Boolean,
        default: false,
      },
    },
    // Audit trail
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Compound indexes for efficient querying
vendorModuleSchema.index({ enabled: 1, vendorEnabled: 1 });
vendorModuleSchema.index({ enabled: 1, vendorEnabled: 1, "vendorPermissions.read": 1 });
vendorModuleSchema.index({ enabled: 1, order: 1 });
vendorModuleSchema.index({ updatedAt: -1 });

module.exports = {
  VendorModule: mongoose.model("VendorModule", vendorModuleSchema),
  VENDOR_MODULES,
  VENDOR_PERMISSION_ACTIONS,
};
