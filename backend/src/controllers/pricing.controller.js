const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const { AppError } = require("../utils/AppError");
const PricingConfig = require("../models/PricingConfig");

/**
 * GET /api/pricing
 * Get current pricing configuration (public)
 */
const getPricingConfig = asyncHandler(async (req, res) => {
  const config = await PricingConfig.findOne({ isActive: true });

  if (!config) {
    throw new AppError("Pricing configuration not found", 404);
  }

  return ok(res, config, "Pricing configuration retrieved");
});

/**
 * GET /api/admin/pricing
 * Get current pricing configuration (admin)
 */
const getAdminPricingConfig = asyncHandler(async (req, res) => {
  const config = await PricingConfig.findOne({ isActive: true }).select("+_id");

  if (!config) {
    throw new AppError("Pricing configuration not found", 404);
  }

  return ok(res, config, "Pricing configuration retrieved");
});

/**
 * PUT /api/admin/pricing/:id
 * Update pricing configuration (admin only)
 */
const updatePricingConfig = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    deliveryFee,
    deliveryFreeAbove,
    platformFeePercentage,
    platformFeeCapped,
    taxPercentage,
    taxableBasis,
    handlingFee,
    bulkDiscountThreshold,
    bulkDiscountPercentage,
    maxDiscountPercentage,
    returnWindow,
    refundProcessingDays,
    shippingModes,
    notes,
  } = req.body;

  // Validation
  const errors = [];

  if (deliveryFee !== undefined && (typeof deliveryFee !== "number" || deliveryFee < 0)) {
    errors.push("Delivery fee must be a non-negative number");
  }
  if (deliveryFreeAbove !== undefined && (typeof deliveryFreeAbove !== "number" || deliveryFreeAbove < 0)) {
    errors.push("Delivery free above must be a non-negative number");
  }
  if (platformFeePercentage !== undefined && (typeof platformFeePercentage !== "number" || platformFeePercentage < 0 || platformFeePercentage > 100)) {
    errors.push("Platform fee percentage must be between 0 and 100");
  }
  if (platformFeeCapped !== undefined && (typeof platformFeeCapped !== "number" || platformFeeCapped < 0)) {
    errors.push("Platform fee capped must be a non-negative number");
  }
  if (taxPercentage !== undefined && (typeof taxPercentage !== "number" || taxPercentage < 0 || taxPercentage > 100)) {
    errors.push("Tax percentage must be between 0 and 100");
  }
  if (taxableBasis !== undefined && !["subtotal", "subtotalWithoutDiscount", "subtotalWithFees"].includes(taxableBasis)) {
    errors.push("Invalid taxable basis");
  }
  if (handlingFee !== undefined && (typeof handlingFee !== "number" || handlingFee < 0)) {
    errors.push("Handling fee must be a non-negative number");
  }
  if (bulkDiscountPercentage !== undefined && (typeof bulkDiscountPercentage !== "number" || bulkDiscountPercentage < 0 || bulkDiscountPercentage > 100)) {
    errors.push("Bulk discount percentage must be between 0 and 100");
  }
  if (maxDiscountPercentage !== undefined && (typeof maxDiscountPercentage !== "number" || maxDiscountPercentage < 0 || maxDiscountPercentage > 100)) {
    errors.push("Max discount percentage must be between 0 and 100");
  }

  if (errors.length > 0) {
    throw new AppError(errors.join("; "), 400);
  }

  const updateData = {};

  if (deliveryFee !== undefined) updateData.deliveryFee = deliveryFee;
  if (deliveryFreeAbove !== undefined) updateData.deliveryFreeAbove = deliveryFreeAbove;
  if (platformFeePercentage !== undefined) updateData.platformFeePercentage = platformFeePercentage;
  if (platformFeeCapped !== undefined) updateData.platformFeeCapped = platformFeeCapped;
  if (taxPercentage !== undefined) updateData.taxPercentage = taxPercentage;
  if (taxableBasis !== undefined) updateData.taxableBasis = taxableBasis;
  if (handlingFee !== undefined) updateData.handlingFee = handlingFee;
  if (bulkDiscountThreshold !== undefined) updateData.bulkDiscountThreshold = bulkDiscountThreshold;
  if (bulkDiscountPercentage !== undefined) updateData.bulkDiscountPercentage = bulkDiscountPercentage;
  if (maxDiscountPercentage !== undefined) updateData.maxDiscountPercentage = maxDiscountPercentage;
  if (returnWindow !== undefined) updateData.returnWindow = returnWindow;
  if (refundProcessingDays !== undefined) updateData.refundProcessingDays = refundProcessingDays;
  if (shippingModes !== undefined) updateData.shippingModes = shippingModes;
  if (notes !== undefined) updateData.notes = notes;

  updateData.updatedBy = req.user.sub;

  const config = await PricingConfig.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!config) {
    throw new AppError("Pricing configuration not found", 404);
  }

  return ok(res, config, "Pricing configuration updated");
});

/**
 * POST /api/admin/pricing/initialize
 * Initialize default pricing configuration (admin only)
 */
const initializePricingConfig = asyncHandler(async (req, res) => {
  // Check if config already exists
  const existing = await PricingConfig.findOne({});

  if (existing) {
    throw new AppError("Pricing configuration already exists", 400);
  }

  const defaultConfig = new PricingConfig({
    deliveryFee: 50,
    deliveryFreeAbove: 500,
    platformFeePercentage: 5,
    platformFeeCapped: 0,
    taxPercentage: 18,
    taxableBasis: "subtotal",
    handlingFee: 0,
    bulkDiscountThreshold: 3,
    bulkDiscountPercentage: 5,
    maxDiscountPercentage: 50,
    returnWindow: 7,
    refundProcessingDays: 3,
    shippingModes: {
      selfShipping: true,
      platformShipping: true,
    },
    isActive: true,
    updatedBy: req.user?.sub || null,
    notes: "Initial pricing configuration",
  });

  await defaultConfig.save();

  return ok(res, defaultConfig, "Pricing configuration initialized");
});

module.exports = {
  getPricingConfig,
  getAdminPricingConfig,
  updatePricingConfig,
  initializePricingConfig,
};
