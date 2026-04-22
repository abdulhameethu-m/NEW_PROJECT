const express = require("express");
const vendorModuleController = require("../controllers/vendorModule.controller");
const { requireLegacyAdminPermission } = require("../middleware/adminAccess");

const router = express.Router();

/**
 * 📍 /api/modules
 * Module Management Routes
 */

// Public vendor routes
router.get("/vendor/accessible", vendorModuleController.getVendorAccessibleModules);
router.post("/vendor/check", vendorModuleController.checkVendorModuleAccess);

// Admin routes
router.get("/", requireLegacyAdminPermission("dashboard:read"), vendorModuleController.getAllModules);
router.get("/stats/overview", requireLegacyAdminPermission("dashboard:read"), vendorModuleController.getModuleStats);
router.get("/:key", requireLegacyAdminPermission("dashboard:read"), vendorModuleController.getModuleByKey);

// 🔥 CRITICAL: Vendor access control
router.patch(
  "/:key/vendor-access",
  requireLegacyAdminPermission("dashboard:read"),
  vendorModuleController.updateModuleVendorAccess
);

// Global status update
router.patch(
  "/:key/status",
  requireLegacyAdminPermission("dashboard:read"),
  vendorModuleController.updateModuleGlobalStatus
);

// Initialize modules (run once during setup)
router.post("/init", requireLegacyAdminPermission("dashboard:read"), vendorModuleController.initializeModules);

module.exports = router;
