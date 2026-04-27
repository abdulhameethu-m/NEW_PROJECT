const PlatformConfig = require("../models/PlatformConfig");

const DEFAULT_SHIPPING_MODES = {
  selfShipping: true,
  platformShipping: true,
};

async function ensureShippingModesConfig(updatedBy = null) {
  let config = await PlatformConfig.findOne({ key: "shipping_modes" });
  if (!config) {
    config = await PlatformConfig.create({
      key: "shipping_modes",
      value: DEFAULT_SHIPPING_MODES,
      description: "Controls which shipping modes vendors can use.",
      category: "shipping",
      type: "object",
      updatedBy: updatedBy || undefined,
    });
  }
  return config;
}

function normalizeShippingModes(value = {}) {
  return {
    selfShipping: value?.selfShipping !== false,
    platformShipping: value?.platformShipping !== false,
  };
}

async function getShippingModesConfig() {
  const config = await ensureShippingModesConfig();
  const value = normalizeShippingModes(config.value);
  return {
    key: config.key,
    value,
    description: config.description,
    updatedAt: config.updatedAt,
  };
}

async function updateShippingModesConfig({ selfShipping, platformShipping }, updatedBy) {
  const config = await ensureShippingModesConfig(updatedBy);
  const nextValue = normalizeShippingModes({ selfShipping, platformShipping });
  config.value = nextValue;
  config.updatedBy = updatedBy || config.updatedBy;
  await config.save();
  return {
    key: config.key,
    value: nextValue,
    description: config.description,
    updatedAt: config.updatedAt,
  };
}

function resolveEnabledShippingModes(configValue = DEFAULT_SHIPPING_MODES) {
  const normalized = normalizeShippingModes(configValue);
  const modes = [];
  if (normalized.selfShipping) modes.push("SELF");
  if (normalized.platformShipping) modes.push("PLATFORM");
  return modes;
}

module.exports = {
  DEFAULT_SHIPPING_MODES,
  ensureShippingModesConfig,
  getShippingModesConfig,
  updateShippingModesConfig,
  normalizeShippingModes,
  resolveEnabledShippingModes,
};
