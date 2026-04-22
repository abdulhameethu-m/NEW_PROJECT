const { AppError } = require("../utils/AppError");
const vendorModuleService = require("../services/vendorModule.service");

/**
 * 🔥 CRITICAL MIDDLEWARE
 * Checks if vendor has access to a specific module
 * 
 * Usage: app.use(requireVendorModule('orders'))
 * 
 * ACCESS LOGIC:
 * - module.enabled (global feature flag)
 * - module.vendorEnabled (admin control)
 * - req.user.role === 'vendor' (user is a vendor)
 */
function requireVendorModule(moduleKey) {
  return async (req, res, next) => {
    // Skip check if not a vendor
    if (!req.user || req.user.role !== "vendor") {
      return next();
    }

    try {
      const hasAccess = await vendorModuleService.canVendorAccessModule(moduleKey);

      if (!hasAccess) {
        return next(
          new AppError(
            `Module '${moduleKey}' is not accessible to vendors. Contact admin for access.`,
            403,
            "MODULE_DISABLED_FOR_VENDORS"
          )
        );
      }

      // Store module info in request for later use
      req.module = { key: moduleKey };
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Batch check module access
 * Validates array of module keys
 */
function requireVendorModules(moduleKeys) {
  return async (req, res, next) => {
    // Skip check if not a vendor
    if (!req.user || req.user.role !== "vendor") {
      return next();
    }

    try {
      const access = await vendorModuleService.canVendorAccessModules(moduleKeys);

      // Check if all modules are accessible
      const inaccessibleModules = Object.keys(access).filter((key) => !access[key]);

      if (inaccessibleModules.length > 0) {
        return next(
          new AppError(
            `Modules not accessible: ${inaccessibleModules.join(", ")}`,
            403,
            "MODULES_DISABLED_FOR_VENDORS"
          )
        );
      }

      req.modules = access;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  requireVendorModule,
  requireVendorModules,
};
