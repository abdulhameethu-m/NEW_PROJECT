const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const configService = require("../services/config.service");

function requestMeta(req) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  };
}

/**
 * Get all platform configurations grouped by category
 */
const getAllConfigs = asyncHandler(async (req, res) => {
  return ok(res, await configService.listAllConfigs(), "Configurations retrieved");
});

/**
 * Get configuration by key
 */
const getConfigByKey = asyncHandler(async (req, res) => {
  return ok(res, await configService.getConfigByKey(req.params.key, req.user), "Configuration retrieved");
});

/**
 * Get configurations by category
 */
const getConfigsByCategory = asyncHandler(async (req, res) => {
  return ok(res, await configService.listConfigsByCategory(req.params.category), "Configurations retrieved");
});

/**
 * Update configuration
 */
const updateConfig = asyncHandler(async (req, res) => {
  return ok(
    res,
    await configService.updateConfig(req.params.key, req.body, req.user, requestMeta(req)),
    "Configuration updated successfully"
  );
});

/**
 * Batch update configurations
 */
const batchUpdateConfigs = asyncHandler(async (req, res) => {
  return ok(
    res,
    await configService.batchUpdateConfigs(req.body.updates, req.user, requestMeta(req)),
    "Batch update completed"
  );
});

module.exports = {
  getAllConfigs,
  getConfigByKey,
  getConfigsByCategory,
  updateConfig,
  batchUpdateConfigs,
};
