const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const { AppError } = require("../utils/AppError");
const PlatformConfig = require("../models/PlatformConfig");
const AuditLog = require("../models/AuditLog");

/**
 * Get all platform configurations grouped by category
 */
const getAllConfigs = asyncHandler(async (req, res) => {
  const configs = await PlatformConfig.find().lean();

  const grouped = {};
  configs.forEach((config) => {
    if (!grouped[config.category]) {
      grouped[config.category] = [];
    }
    grouped[config.category].push(config);
  });

  return ok(res, grouped, "Configurations retrieved");
});

/**
 * Get configuration by key
 */
const getConfigByKey = asyncHandler(async (req, res) => {
  const { key } = req.params;

  const config = await PlatformConfig.findOne({ key }).lean();
  if (!config) {
    throw new AppError("Configuration not found", 404, "NOT_FOUND");
  }

  return ok(res, config, "Configuration retrieved");
});

/**
 * Get configurations by category
 */
const getConfigsByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;

  const configs = await PlatformConfig.find({ category }).lean();

  return ok(res, configs, "Configurations retrieved");
});

/**
 * Update configuration
 */
const updateConfig = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value, description } = req.body;

  if (!value) {
    throw new AppError("Value is required", 400, "VALIDATION_ERROR");
  }

  const config = await PlatformConfig.findOne({ key });
  if (!config) {
    throw new AppError("Configuration not found", 404, "NOT_FOUND");
  }

  const oldValue = config.value;

  config.value = value;
  if (description) config.description = description;
  config.updatedBy = req.user._id;

  await config.save();

  // Log the configuration change
  await AuditLog.create({
    actorId: req.user._id,
    actorRole: req.user.role,
    action: "CONFIG_UPDATED",
    entityType: "PlatformConfig",
    entityId: config._id,
    metadata: {
      key,
      oldValue,
      newValue: value,
      category: config.category,
    },
    status: "SUCCESS",
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  return ok(res, config, "Configuration updated successfully");
});

/**
 * Batch update configurations
 */
const batchUpdateConfigs = asyncHandler(async (req, res) => {
  const { updates } = req.body; // Array of { key, value }

  if (!Array.isArray(updates) || updates.length === 0) {
    throw new AppError("Updates array is required", 400, "VALIDATION_ERROR");
  }

  const results = [];

  for (const update of updates) {
    const { key, value } = update;

    const config = await PlatformConfig.findOne({ key });
    if (!config) continue;

    const oldValue = config.value;
    config.value = value;
    config.updatedBy = req.user._id;

    await config.save();

    results.push({ key, updated: true });

    // Log each change
    await AuditLog.create({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "CONFIG_UPDATED",
      entityType: "PlatformConfig",
      entityId: config._id,
      metadata: { key, oldValue, newValue: value },
      status: "SUCCESS",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
  }

  return ok(res, results, "Batch update completed");
});

/**
 * Initialize default configurations (admin only)
 */
const initializeDefaults = asyncHandler(async (req, res) => {
  const defaults = [
    {
      key: "commission_percentage",
      value: 10,
      description: "Platform commission percentage for sellers",
      category: "commission",
      type: "number",
    },
    {
      key: "min_vendor_earnings",
      value: 1000,
      description: "Minimum earning threshold for payout",
      category: "commission",
      type: "number",
    },
    {
      key: "payout_frequency_days",
      value: 14,
      description: "Payout frequency in days",
      category: "commission",
      type: "number",
    },
    {
      key: "auto_approve_vendors",
      value: false,
      description: "Automatically approve vendor applications",
      category: "feature",
      type: "boolean",
    },
    {
      key: "auto_approve_products",
      value: false,
      description: "Automatically approve product listings",
      category: "feature",
      type: "boolean",
    },
    {
      key: "enable_2fa",
      value: true,
      description: "Require 2FA for admin accounts",
      category: "security",
      type: "boolean",
    },
    {
      key: "max_login_attempts",
      value: 5,
      description: "Maximum login attempts before lockout",
      category: "security",
      type: "number",
    },
    {
      key: "email_notifications_enabled",
      value: true,
      description: "Enable email notifications",
      category: "email",
      type: "boolean",
    },
  ];

  const created = [];

  for (const defaultConfig of defaults) {
    const exists = await PlatformConfig.findOne({ key: defaultConfig.key });
    if (!exists) {
      const config = await PlatformConfig.create({
        ...defaultConfig,
        updatedBy: req.user._id,
      });
      created.push(config);
    }
  }

  return ok(res, created, `${created.length} default configurations created`);
});

module.exports = {
  getAllConfigs,
  getConfigByKey,
  getConfigsByCategory,
  updateConfig,
  batchUpdateConfigs,
  initializeDefaults,
};
