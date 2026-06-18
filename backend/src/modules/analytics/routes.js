const express = require("express");
const Joi = require("joi");
const { authRequired, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { requireApprovedVendor } = require("../../middleware/vendorApproval");
const {
  adminWorkspaceAuthRequired,
  requireWorkspacePermission,
} = require("../../middleware/adminAccess");
const controller = require("./controller");

const router = express.Router();

const querySchema = Joi.object({
  range: Joi.number().integer().min(1).max(3660).optional(),
  days: Joi.number().integer().min(1).max(3660).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  vendorId: Joi.string().trim().allow("").optional(),
  influencerId: Joi.string().trim().allow("").optional(),
  campaignId: Joi.string().trim().allow("").optional(),
  paymentModel: Joi.string().valid("all", "fixed", "commission", "hybrid", "free_product").optional(),
}).unknown(true);

router.get(
  "/admin/analytics/unified",
  authRequired,
  adminWorkspaceAuthRequired,
  requireWorkspacePermission("analytics.read", { legacyPermission: "dashboard:read" }),
  validate(querySchema, "query"),
  controller.adminAnalytics
);
router.post(
  "/admin/analytics/rebuild",
  authRequired,
  adminWorkspaceAuthRequired,
  requireWorkspacePermission("analytics.update", { legacyPermission: "settings:update" }),
  validate(querySchema, "query"),
  controller.rebuild
);
router.get(
  "/admin/analytics/audit-pipeline",
  authRequired,
  adminWorkspaceAuthRequired,
  requireWorkspacePermission("analytics.read", { legacyPermission: "dashboard:read" }),
  validate(querySchema, "query"),
  controller.auditPipeline
);

router.get(
  "/vendor/analytics/unified",
  authRequired,
  requireRole("vendor"),
  requireApprovedVendor,
  validate(querySchema, "query"),
  controller.vendorAnalytics
);

router.get(
  "/influencer/analytics",
  authRequired,
  requireRole("influencer"),
  validate(querySchema, "query"),
  controller.influencerAnalytics
);

router.get(
  "/campaigns/:campaignId/analytics",
  authRequired,
  requireRole("vendor", "influencer", "admin", "super_admin", "support_admin", "finance_admin"),
  validate(querySchema, "query"),
  controller.campaignAnalytics
);

module.exports = router;
