const PlatformConfig = require("../models/PlatformConfig");

const DEFAULT_COMMISSION_PERCENTAGE = 10;

function normalizePercentage(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return DEFAULT_COMMISSION_PERCENTAGE;
  }
  return numeric;
}

async function getCommissionPercentage() {
  const config = await PlatformConfig.findOne({ key: "commission_percentage" }).select("value").lean();
  return normalizePercentage(config?.value);
}

module.exports = {
  DEFAULT_COMMISSION_PERCENTAGE,
  getCommissionPercentage,
};
