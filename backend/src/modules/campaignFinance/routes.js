const express = require("express");
const Joi = require("joi");
const { authRequired, requireRole } = require("../../middleware/auth");
const { adminWorkspaceAuthRequired, requireWorkspacePermission } = require("../../middleware/adminAccess");
const { requireApprovedVendor } = require("../../middleware/vendorApproval");
const { validate } = require("../../middleware/validate");
const controller = require("./controller");

const router = express.Router();
const query = Joi.object({
  paymentModel: Joi.string().valid("all", "fixed", "commission", "hybrid", "free_product").default("all"),
  campaignId: Joi.string().trim().allow("").optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).max(100000).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

router.get("/vendor", authRequired, requireRole("vendor"), requireApprovedVendor, validate(query, "query"), controller.vendor);
router.get("/influencer", authRequired, requireRole("influencer"), validate(query, "query"), controller.influencer);
router.get(
  "/admin",
  adminWorkspaceAuthRequired,
  requireWorkspacePermission("influencerCommerce.campaignFinanceRead", { legacyPermission: "payouts:read" }),
  validate(query, "query"),
  controller.admin
);
router.get("/campaign/:campaignId", authRequired, requireRole("vendor", "influencer", "admin", "super_admin", "support_admin", "finance_admin"), controller.campaign);
router.post("/sync", authRequired, requireRole("admin", "super_admin", "finance_admin"), controller.sync);
router.post("/sync/:campaignId", authRequired, requireRole("admin", "super_admin", "finance_admin"), controller.sync);

module.exports = router;
