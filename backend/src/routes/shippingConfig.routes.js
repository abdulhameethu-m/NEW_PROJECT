const express = require("express");
const { validate } = require("../middleware/validate");
const { body, param } = require("express-validator");
const {
  adminWorkspaceAuthRequired,
  requireWorkspacePermission,
} = require("../middleware/adminAccess");
const shippingConfigController = require("../controllers/shippingConfig.controller");

const router = express.Router();

// All routes require admin authentication
router.use(adminWorkspaceAuthRequired);
router.use(requireWorkspacePermission("settings.update", { legacyPermission: "settings:update" }));

/**
 * POST /admin/shipping-config
 * Create a new shipping rule
 */
router.post(
  "/",
  validate([
    body("state")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("State is required"),
    body("zone")
      .notEmpty()
      .isIn(["LOCAL", "REGIONAL", "REMOTE"])
      .withMessage("Zone must be LOCAL, REGIONAL, or REMOTE"),
    body("baseWeight")
      .notEmpty()
      .isFloat({ min: 0 })
      .withMessage("Base weight must be a positive number"),
    body("basePrice")
      .notEmpty()
      .isFloat({ min: 0 })
      .withMessage("Base price must be a positive number"),
    body("pricePerKg")
      .notEmpty()
      .isFloat({ min: 0 })
      .withMessage("Price per kg must be a positive number"),
    body("minWeight")
      .notEmpty()
      .isFloat({ min: 0.001 })
      .withMessage("Min weight must be at least 0.001"),
    body("maxWeight")
      .notEmpty()
      .isFloat({ min: 0.001 })
      .withMessage("Max weight must be at least 0.001"),
    body("freeShippingThreshold")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Free shipping threshold must be positive"),
    body("minOrderValue")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Min order value must be positive"),
    body("sortOrder")
      .optional()
      .isInt()
      .withMessage("Sort order must be an integer"),
  ]),
  shippingConfigController.createShippingRule
);

/**
 * GET /admin/shipping-config
 * Get all shipping rules with filtering
 */
router.get("/", shippingConfigController.getAllShippingRules);

/**
 * GET /admin/shipping-config/options
 * Get available zones and states
 */
router.get("/options", shippingConfigController.getShippingOptions);

/**
 * GET /admin/shipping-config/summary
 * Get configuration summary
 */
router.get("/summary", shippingConfigController.getConfigurationSummary);

/**
 * GET /admin/shipping-config/validate/configuration
 * Validate shipping configuration
 */
router.get("/validate/configuration", shippingConfigController.validateShippingConfiguration);

/**
 * PATCH /admin/shipping-config/bulk/update
 * Bulk update shipping rules
 */
router.patch(
  "/bulk/update",
  validate([
    body("ruleIds")
      .isArray({ min: 1 })
      .withMessage("ruleIds must be a non-empty array"),
    body("updates").isObject().withMessage("updates must be an object"),
  ]),
  shippingConfigController.bulkUpdateShippingRules
);

/**
 * POST /admin/shipping-config/calculate-preview
 * Test shipping calculation
 */
router.post(
  "/calculate-preview",
  validate([
    body("weight")
      .notEmpty()
      .isFloat({ min: 0.001 })
      .withMessage("Weight must be provided and greater than 0.001"),
    body("state")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("State is required"),
    body("zone")
      .optional()
      .isIn(["LOCAL", "REGIONAL", "REMOTE"])
      .withMessage("Invalid zone"),
  ]),
  shippingConfigController.calculateShippingPreview
);

router.get("/location-config", shippingConfigController.getShippingLocationConfig);
router.put(
  "/location-config",
  validate([
    body("states")
      .isArray({ min: 1 })
      .withMessage("states must be a non-empty array"),
  ]),
  shippingConfigController.updateShippingLocationConfig
);

/**
 * GET /admin/shipping-config/statistics
 * Get shipping configuration statistics
 */
router.get("/statistics", shippingConfigController.getShippingStatistics);

/**
 * GET /admin/shipping-config/:ruleId
 * Get a specific shipping rule
 */
router.get(
  "/:ruleId",
  validate([param("ruleId").isMongoId().withMessage("Invalid rule ID")]),
  shippingConfigController.getShippingRule
);

/**
 * PUT /admin/shipping-config/:ruleId
 * Update a shipping rule
 */
router.put(
  "/:ruleId",
  validate([
    param("ruleId").isMongoId().withMessage("Invalid rule ID"),
    body("state")
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage("State is required"),
    body("zone")
      .optional()
      .isIn(["LOCAL", "REGIONAL", "REMOTE"])
      .withMessage("Zone must be LOCAL, REGIONAL, or REMOTE"),
    body("baseWeight")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Base weight must be positive"),
    body("basePrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Base price must be positive"),
    body("pricePerKg")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Price per kg must be positive"),
    body("minWeight")
      .optional()
      .isFloat({ min: 0.001 })
      .withMessage("Min weight must be at least 0.001"),
    body("maxWeight")
      .optional()
      .isFloat({ min: 0.001 })
      .withMessage("Max weight must be at least 0.001"),
    body("isActive").optional().isBoolean().withMessage("isActive must be boolean"),
  ]),
  shippingConfigController.updateShippingRule
);

/**
 * DELETE /admin/shipping-config/:ruleId
 * Delete a shipping rule
 */
router.delete(
  "/:ruleId",
  validate([param("ruleId").isMongoId().withMessage("Invalid rule ID")]),
  shippingConfigController.deleteShippingRule
);

/**
 * POST /admin/shipping-config/:ruleId/clone
 * Clone a shipping rule
 */
router.post(
  "/:ruleId/clone",
  validate([param("ruleId").isMongoId().withMessage("Invalid rule ID")]),
  shippingConfigController.cloneShippingRule
);

module.exports = router;
