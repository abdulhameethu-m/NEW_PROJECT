const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const { AppError } = require("../utils/AppError");
const shippingConfigAdminService = require("../services/shippingConfigAdmin.service");
const shippingPricingService = require("../services/shipping-pricing.service");
const shippingZoneConfigService = require("../services/shipping-zone-config.service");

/**
 * ==================== ADMIN SHIPPING CONFIG ENDPOINTS ====================
 */

/**
 * Create a new shipping rule
 * POST /admin/shipping-config
 * Body: {state, district?, zone, weightFrom, weightTo, shippingCharge, priority?, status?, description?}
 */
const createShippingRule = asyncHandler(async (req, res) => {
  const { state, district, zone, weightFrom, weightTo, shippingCharge, priority, status, isActive, settlementRecipient, description, notes } = req.body;

  const rule = await shippingConfigAdminService.createRule({
    state: state || "Tamil Nadu",
    district,
    zone,
    weightFrom,
    weightTo,
    shippingCharge,
    priority,
    status,
    isActive,
    settlementRecipient: settlementRecipient === "VENDOR" ? "VENDOR" : "ADMIN",
    description: description || notes,
  }, req.user?.sub);

  return ok(res, rule, "Shipping rule created successfully", 201);
});

/**
 * Get all shipping rules with filtering
 * GET /admin/shipping-config?state=Tamil%20Nadu&zone=LOCAL&page=1&limit=50
 */
const getAllShippingRules = asyncHandler(async (req, res) => {
  const { state, district, zone, activeOnly, page = 1, limit = 50 } = req.query;

  const result = await shippingConfigAdminService.getAllRules({
    state,
    district,
    zone,
    activeOnly: activeOnly === "true",
    page: parseInt(page),
    limit: parseInt(limit),
  });

  return ok(res, result, "Shipping rules retrieved successfully");
});

/**
 * Get a specific shipping rule
 * GET /admin/shipping-config/:ruleId
 */
const getShippingRule = asyncHandler(async (req, res) => {
  const rule = await shippingConfigAdminService.getRule(req.params.ruleId);
  return ok(res, rule, "Shipping rule retrieved successfully");
});

/**
 * Update a shipping rule
 * PUT /admin/shipping-config/:ruleId
 * Body: {fields to update}
 */
const updateShippingRule = asyncHandler(async (req, res) => {
  const { ruleId } = req.params;
  const updates = req.body;

  const rule = await shippingConfigAdminService.updateRule(ruleId, updates, req.user?.sub);
  return ok(res, rule, "Shipping rule updated successfully");
});

/**
 * Delete a shipping rule
 * DELETE /admin/shipping-config/:ruleId
 */
const deleteShippingRule = asyncHandler(async (req, res) => {
  const { ruleId } = req.params;
  const rule = await shippingConfigAdminService.deleteRule(ruleId, req.user?.sub);
  return ok(res, rule, "Shipping rule deleted successfully");
});

/**
 * Bulk update shipping rules
 * PATCH /admin/shipping-config/bulk/update
 * Body: {ruleIds: [...], updates: {...}}
 */
const bulkUpdateShippingRules = asyncHandler(async (req, res) => {
  const { ruleIds, updates } = req.body;

  if (!Array.isArray(ruleIds) || !updates) {
    throw new AppError("ruleIds array and updates object are required", 400);
  }

  const result = await shippingConfigAdminService.bulkUpdateRules(ruleIds, updates, req.user?.sub);
  return ok(res, result, "Bulk update completed");
});

/**
 * Test shipping calculation
 * POST /admin/shipping-config/calculate-preview
 * Body: {weight, state?, district?, zone?}
 */
const calculateShippingPreview = asyncHandler(async (req, res) => {
  const { weight, state, district, zone } = req.body;

  if (!weight || weight <= 0) {
    throw new AppError("Weight must be provided and greater than 0", 400);
  }

  const preview = await shippingConfigAdminService.calculatePreview({
    weight: parseFloat(weight),
    state: state || "Tamil Nadu",
    district,
    zone,
  });

  return ok(res, preview, "Shipping preview calculated successfully");
});

/**
 * Get shipping configuration statistics
 * GET /admin/shipping-config/statistics
 */
const getShippingStatistics = asyncHandler(async (req, res) => {
  const stats = await shippingConfigAdminService.getStatistics();
  return ok(res, stats, "Shipping statistics retrieved successfully");
});

/**
 * Get available zones and states for UI
 * GET /admin/shipping-config/options
 */
const getShippingOptions = asyncHandler(async (req, res) => {
  const zoneConfig = await shippingZoneConfigService.getZoneConfig();

  return ok(
    res,
    {
      zones: shippingZoneConfigService.ZONES,
      districtsByState: Object.fromEntries(
        zoneConfig.states.map((entry) => [
          entry.state,
          shippingZoneConfigService.getConfiguredDistrictsForStateFromMatrix(zoneConfig, entry.state),
        ])
      ),
      states: zoneConfig.states.map((entry) => entry.state),
      zoneDescriptions: {
        LOCAL: "Same city delivery",
        REGIONAL: "Nearby districts",
        REMOTE: "Far districts",
      },
    },
    "Shipping options retrieved successfully"
  );
});

const getShippingLocationConfig = asyncHandler(async (req, res) => {
  const config = await shippingZoneConfigService.getZoneConfig();
  return ok(res, config, "Shipping location configuration retrieved successfully");
});

const updateShippingLocationConfig = asyncHandler(async (req, res) => {
  const config = await shippingZoneConfigService.updateZoneConfig(req.body, req.user?.sub);
  return ok(res, config, "Shipping location configuration updated successfully");
});

/**
 * Clone a shipping rule
 * POST /admin/shipping-config/:ruleId/clone
 * Body: {overrides: {...}}
 */
const cloneShippingRule = asyncHandler(async (req, res) => {
  const { ruleId } = req.params;
  const { overrides } = req.body;

  const newRule = await shippingConfigAdminService.cloneRule(ruleId, overrides || {}, req.user?.sub);
  return ok(res, newRule, "Shipping rule cloned successfully", 201);
});

/**
 * Validate shipping configuration
 * GET /admin/shipping-config/validate/configuration
 */
const validateShippingConfiguration = asyncHandler(async (req, res) => {
  const validation = await shippingPricingService.validateConfiguration();
  return ok(res, validation, "Configuration validation completed");
});

/**
 * Get configuration summary for admin dashboard
 * GET /admin/shipping-config/summary
 */
const getConfigurationSummary = asyncHandler(async (req, res) => {
  const [stats, allRules] = await Promise.all([
    shippingConfigAdminService.getStatistics(),
    shippingConfigAdminService.getAllRules({ activeOnly: true, page: 1, limit: 1000 }),
  ]);

  return ok(
    res,
    {
      statistics: stats,
      recentRules: allRules.data.slice(0, 5),
      totalActiveRules: allRules.pagination.total,
    },
    "Configuration summary retrieved successfully"
  );
});

const getPublicShippingStates = asyncHandler(async (req, res) => {
  const states = await shippingZoneConfigService.getConfiguredStates();
  return ok(res, { states }, "Shipping states retrieved successfully");
});

const getPublicShippingDistricts = asyncHandler(async (req, res) => {
  const state = String(req.query.state || "").trim();
  if (!state) {
    throw new AppError("state query parameter is required", 400, "VALIDATION_ERROR");
  }
  const districts = await shippingZoneConfigService.getConfiguredDistrictsForState(state);
  return ok(res, { state, districts }, "Shipping districts retrieved successfully");
});

module.exports = {
  createShippingRule,
  getAllShippingRules,
  getShippingRule,
  updateShippingRule,
  deleteShippingRule,
  bulkUpdateShippingRules,
  calculateShippingPreview,
  getShippingStatistics,
  getShippingOptions,
  getShippingLocationConfig,
  updateShippingLocationConfig,
  cloneShippingRule,
  validateShippingConfiguration,
  getConfigurationSummary,
  getPublicShippingStates,
  getPublicShippingDistricts,
};
