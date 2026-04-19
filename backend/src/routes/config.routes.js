const express = require("express");
const router = express.Router();
const configController = require("../controllers/config.controller");
const { authRequired } = require("../middleware/auth");
const { requireRole } = require("../middleware/validate");

// All routes require admin authentication
router.use(authRequired);
router.use(requireRole("admin", "super_admin"));

/**
 * GET /api/config
 * Get all platform configurations
 */
router.get("/", configController.getAllConfigs);

/**
 * GET /api/config/category/:category
 * Get configurations by category
 */
router.get("/category/:category", configController.getConfigsByCategory);

/**
 * GET /api/config/:key
 * Get configuration by key
 */
router.get("/:key", configController.getConfigByKey);

/**
 * PATCH /api/config/:key
 * Update single configuration
 */
router.patch("/:key", configController.updateConfig);

/**
 * PATCH /api/config/batch/update
 * Batch update multiple configurations
 */
router.patch("/batch/update", configController.batchUpdateConfigs);

/**
 * POST /api/config/initialize-defaults
 * Initialize default configurations
 */
router.post("/initialize-defaults", configController.initializeDefaults);

module.exports = router;
