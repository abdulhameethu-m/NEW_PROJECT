const express = require("express");
const router = express.Router();
const pricingController = require("../controllers/pricing.controller");
const { adminWorkspaceAuthRequired, requireWorkspacePermission } = require("../middleware/adminAccess");

/**
 * ==========================================
 * PUBLIC ROUTES (No auth required)
 * ==========================================
 */

/**
 * GET /api/pricing
 * Get current pricing configuration for checkout calculations
 */
router.get("/", pricingController.getPricingConfig);

/**
 * GET /api/pricing-rules
 * Get all active pricing rules (for checkout display)
 */
router.get("/pricing-rules", pricingController.getActivePricingRules);

/**
 * GET /api/pricing/summary
 * Get pricing summary (breakdown by category)
 */
router.get("/summary", pricingController.getPricingSummary);

/**
 * GET /api/pricing/calculate
 * Calculate order total with current pricing rules
 * Query params: subtotal, itemCount
 */
router.get("/calculate", pricingController.calculateOrderTotal);

/**
 * POST /api/pricing/preview-rule
 * Preview the impact of a specific pricing rule
 * Body: { ruleId, subtotal }
 */
router.post("/preview-rule", express.json(), pricingController.previewRuleImpact);

module.exports = router;

/**
 * ==========================================
 * ADMIN ROUTES (Auth + Admin role required)
 * ==========================================
 */

/**
 * Admin routing is handled in admin.routes.js
 * These endpoints are registered there:
 * 
 * GET /api/admin/pricing
 * PUT /api/admin/pricing/:id
 * POST /api/admin/pricing/initialize
 * 
 * GET /api/admin/pricing-rules
 * POST /api/admin/pricing-rules
 * GET /api/admin/pricing-rules/:id
 * PUT /api/admin/pricing-rules/:id
 * DELETE /api/admin/pricing-rules/:id
 * PATCH /api/admin/pricing-rules/batch/toggle-active
 */

