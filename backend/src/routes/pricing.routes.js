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
 */
