const PlatformConfig = require("../models/PlatformConfig");
const { AuditLog } = require("../models/AuditLog");
const { AppError } = require("../utils/AppError");
const { invalidateInfluencerCommerceConfigCache } = require("./influencer-commerce-config.service");

function actorId(user = {}) {
  return user._id || user.sub;
}

function auditMeta(meta = {}) {
  return {
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  };
}

async function logConfigChange({ user, config, key, oldValue, newValue, meta = {} }) {
  await AuditLog.create({
    actorId: actorId(user),
    actorRole: user.role,
    action: "CONFIG_UPDATED",
    entityType: "PlatformConfig",
    entityId: config._id,
    metadata: {
      key,
      oldValue,
      newValue,
      category: config.category,
    },
    status: "SUCCESS",
    ...auditMeta(meta),
  });
}

async function listAllConfigs() {
  const configs = await PlatformConfig.find().lean();
  return configs.reduce((grouped, config) => {
    if (!grouped[config.category]) grouped[config.category] = [];
    grouped[config.category].push(config);
    return grouped;
  }, {});
}

async function getConfigByKey(key, user = {}) {
  let config = await PlatformConfig.findOne({ key }).lean();
  if (!config && key === "influencer_commerce_enabled") {
    const created = await PlatformConfig.create({
      key: "influencer_commerce_enabled",
      value: true,
      description:
        "When false, influencer commerce, vendor influencer tools, storefront reels, and tracking attribution are disabled.",
      category: "feature",
      type: "boolean",
      isPublic: true,
      updatedBy: actorId(user),
    });
    config = created.toObject();
  }

  if (!config) {
    throw new AppError("Configuration not found", 404, "NOT_FOUND");
  }

  return config;
}

async function listConfigsByCategory(category) {
  return PlatformConfig.find({ category }).lean();
}

async function updateConfig(key, payload = {}, user = {}, meta = {}) {
  const { value, description } = payload;
  if (value === undefined || value === null) {
    throw new AppError("Value is required", 400, "VALIDATION_ERROR");
  }

  const config = await PlatformConfig.findOne({ key });
  if (!config) {
    throw new AppError("Configuration not found", 404, "NOT_FOUND");
  }

  const oldValue = config.value;
  config.value = value;
  if (description) config.description = description;
  const nextActorId = actorId(user);
  if (nextActorId) config.updatedBy = nextActorId;

  await config.save();

  if (key === "influencer_commerce_enabled") {
    invalidateInfluencerCommerceConfigCache();
  }

  await logConfigChange({ user, config, key, oldValue, newValue: value, meta });
  return config;
}

async function batchUpdateConfigs(updates = [], user = {}, meta = {}) {
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
    const nextActorId = actorId(user);
    if (nextActorId) config.updatedBy = nextActorId;

    await config.save();

    if (key === "influencer_commerce_enabled") {
      invalidateInfluencerCommerceConfigCache();
    }

    results.push({ key, updated: true });
    await logConfigChange({ user, config, key, oldValue, newValue: value, meta });
  }

  return results;
}

module.exports = {
  listAllConfigs,
  getConfigByKey,
  listConfigsByCategory,
  updateConfig,
  batchUpdateConfigs,
};
