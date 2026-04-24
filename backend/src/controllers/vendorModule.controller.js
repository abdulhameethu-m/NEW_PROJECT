const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const { AppError } = require("../utils/AppError");
const vendorModuleService = require("../services/vendorModule.service");

/**
 * GET /api/modules
 * Get all vendor modules (for admin)
 */
const getAllModules = asyncHandler(async (req, res) => {
  const modules = await vendorModuleService.getAllModules();
  return ok(res, modules, "Vendor modules fetched");
});

/**
 * GET /api/modules/vendor/accessible
 * Get vendor-accessible modules (for vendor frontend)
 */
const getVendorAccessibleModules = asyncHandler(async (req, res) => {
  const modules = await vendorModuleService.getVendorAccessibleModules(req.user);
  return ok(res, modules, "Vendor-accessible modules fetched");
});

/**
 * GET /api/modules/vendor/check
 * Batch check if vendor can access specific modules
 */
const checkVendorModuleAccess = asyncHandler(async (req, res) => {
  const { modules, permissions } = req.body;

  if (Array.isArray(permissions) && permissions.length > 0) {
    if (permissions.length > 50) {
      throw new AppError("Cannot check more than 50 permissions at once", 400, "INVALID_INPUT");
    }

    const result = await vendorModuleService.canVendorPerformActions(permissions, req.user);
    return ok(res, result, "Module permissions checked");
  }

  if (!Array.isArray(modules) || modules.length === 0) {
    throw new AppError("modules or permissions array is required", 400, "INVALID_INPUT");
  }

  if (modules.length > 20) {
    throw new AppError("Cannot check more than 20 modules at once", 400, "INVALID_INPUT");
  }

  const result = await vendorModuleService.canVendorAccessModules(modules, req.user);
  return ok(res, result, "Module access checked");
});

/**
 * GET /api/modules/:key
 * Get specific module by key
 */
const getModuleByKey = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const module = await vendorModuleService.getModuleByKey(key);
  return ok(res, module, "Module fetched");
});

/**
 * PATCH /api/modules/:key/vendor-access
 * Update vendor access for a module (admin only)
 * 🔥 CRITICAL: This controls vendor access globally
 */
const updateModuleVendorAccess = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { vendorEnabled } = req.body;

  if (typeof vendorEnabled !== "boolean") {
    throw new AppError("vendorEnabled must be a boolean", 400, "INVALID_INPUT");
  }

  const module = await vendorModuleService.updateModuleVendorAccess(key, vendorEnabled, {
    _id: req.user.sub,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  return ok(res, module, `Module '${key}' vendor access updated to ${vendorEnabled}`);
});

/**
 * PATCH /api/modules/:key
 * Update vendor module feature flags
 */
const updateVendorModuleSettings = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { enabled, vendorEnabled } = req.body;

  if (enabled === undefined && vendorEnabled === undefined) {
    throw new AppError(
      "At least one of enabled or vendorEnabled is required",
      400,
      "INVALID_INPUT"
    );
  }

  if (enabled !== undefined && typeof enabled !== "boolean") {
    throw new AppError("enabled must be a boolean", 400, "INVALID_INPUT");
  }

  if (vendorEnabled !== undefined && typeof vendorEnabled !== "boolean") {
    throw new AppError("vendorEnabled must be a boolean", 400, "INVALID_INPUT");
  }

  const module = await vendorModuleService.updateVendorModuleSettings(
    key,
    { enabled, vendorEnabled },
    {
      _id: req.user.sub,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }
  );

  return ok(res, module, `Module '${key}' settings updated`);
});

/**
 * PATCH /api/modules/:key/status
 * Update global module status (admin only)
 */
const updateModuleGlobalStatus = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { enabled } = req.body;

  if (typeof enabled !== "boolean") {
    throw new AppError("enabled must be a boolean", 400, "INVALID_INPUT");
  }

  const module = await vendorModuleService.updateModuleGlobalStatus(key, enabled, {
    _id: req.user.sub,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  return ok(res, module, `Module '${key}' global status updated to ${enabled}`);
});

/**
 * GET /api/modules/stats/overview
 * Get module statistics (admin dashboard)
 */
const getModuleStats = asyncHandler(async (req, res) => {
  const stats = await vendorModuleService.getModuleStats();
  return ok(res, stats, "Module statistics fetched");
});

/**
 * POST /api/modules/init
 * Initialize default vendor modules (admin only, run once)
 */
const initializeModules = asyncHandler(async (req, res) => {
  await vendorModuleService.initializeModules();
  const modules = await vendorModuleService.getAllModules();
  return ok(res, modules, "Vendor modules initialized");
});

module.exports = {
  getAllModules,
  getVendorAccessibleModules,
  checkVendorModuleAccess,
  getModuleByKey,
  updateModuleVendorAccess,
  updateVendorModuleSettings,
  updateModuleGlobalStatus,
  getModuleStats,
  initializeModules,
};
