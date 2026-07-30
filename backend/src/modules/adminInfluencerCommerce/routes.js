const express = require("express");
const Joi = require("joi");
const { validate } = require("../../middleware/validate");
const { requireWorkspacePermission } = require("../../middleware/adminAccess");
const controller = require("./controller");

const router = express.Router();

const readPermission = (key, legacyPermission = "influencerCommerce:manage") => requireWorkspacePermission(`influencerCommerce.${key}Read`, {
  legacyPermission,
});
const updatePermission = (key, legacyPermission = "influencerCommerce:manage") => requireWorkspacePermission(`influencerCommerce.${key}Update`, {
  legacyPermission,
});
const requireInfluencerCommercePayoutsUpdate = requireWorkspacePermission("influencerCommerce.payoutsUpdate", {
  legacyPermission: "payouts:process",
});
const requireInfluencerCommerceTierScoreRead = requireWorkspacePermission("influencerCommerce.tierScoreConfigRead", {
  legacyPermission: "influencerCommerce:settings",
});
const requireInfluencerCommerceTierScoreCreate = requireWorkspacePermission("influencerCommerce.tierScoreConfigCreate", {
  legacyPermission: "influencerCommerce:settings",
});
const requireInfluencerCommerceTierScoreUpdate = requireWorkspacePermission("influencerCommerce.tierScoreConfigUpdate", {
  legacyPermission: "influencerCommerce:settings",
});
const requireInfluencerCommerceTierScoreDelete = requireWorkspacePermission("influencerCommerce.tierScoreConfigDelete", {
  legacyPermission: "influencerCommerce:settings",
});
const requireInfluencerCommerceSettingsRead = requireWorkspacePermission("influencerCommerce.settingsRead", {
  legacyPermission: "influencerCommerce:settings",
});
const requireInfluencerCommerceSettingsUpdate = requireWorkspacePermission("influencerCommerce.settingsUpdate", {
  legacyPermission: "influencerCommerce:settings",
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().trim().allow("").optional(),
  status: Joi.string().trim().allow("").optional(),
  state: Joi.string().trim().allow("").optional(),
  category: Joi.string().trim().allow("").optional(),
  country: Joi.string().trim().allow("").optional(),
  campaignType: Joi.string().trim().allow("").optional(),
  vendorId: Joi.string().trim().allow("").optional(),
  influencerId: Joi.string().trim().allow("").optional(),
  campaignId: Joi.string().trim().allow("").optional(),
  productId: Joi.string().trim().allow("").optional(),
  paymentModel: Joi.string().valid("all", "fixed", "commission", "hybrid", "free_product").optional(),
  trackingStatus: Joi.string().valid("active", "inactive", "expired", "").optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  sort: Joi.string().trim().allow("").optional(),
});

const objectIdParamSchema = Joi.object({
  linkId: Joi.string().hex().length(24).required(),
});

const affiliateLinkStatusSchema = Joi.object({
  action: Joi.string().valid("activate", "deactivate", "active", "inactive", "enable", "disable").required(),
  reason: Joi.string().trim().max(1000).allow("").optional(),
});

const configEntitySchema = Joi.object({
  entityType: Joi.string().valid(
    "scoreConfigs",
    "tiers",
    "subscriptionPlans",
    "vendorSubscriptions",
    "budgetControls",
    "budgetRules",
    "rankingRules",
    "platformConfigurations",
    "serviceTypes",
    "packageTemplates",
    "categoryOptions",
    "languageOptions",
    "attributionWindows",
    "paymentModels",
    "campaignTypes",
    "paymentModelOptions",
    "campaignPaymentRules",
    "campaignDynamicFields",
    "campaignValidationRules",
    "campaignTemplates",
    "discoveryRules",
    "campaignRules",
    "dynamicFormFields"
  ).required(),
  id: Joi.string().trim().optional(),
}).unknown(true);

const flexibleConfigSchema = Joi.object({
  reason: Joi.string().trim().max(1000).allow("").optional(),
  approval: Joi.object({
    status: Joi.string().valid("draft", "review", "approved", "active", "inactive", "archived").optional(),
    reason: Joi.string().trim().max(1000).allow("").optional(),
  }).unknown(true).optional(),
}).unknown(true);

const recoverConfigSchema = Joi.object({
  version: Joi.number().integer().min(1).required(),
});

router.get("/dashboard", readPermission("dashboard", "dashboard:read"), validate(querySchema, "query"), controller.dashboard);
router.get("/influencers", readPermission("influencers"), validate(querySchema, "query"), controller.influencers);
router.get("/vendors", readPermission("vendors"), validate(querySchema, "query"), controller.vendors);
router.get("/campaigns", readPermission("campaigns"), validate(querySchema, "query"), controller.campaigns);
router.patch(
  "/campaigns/:campaignId",
  updatePermission("campaigns"),
  validate(
    Joi.object({
      title: Joi.string().trim().max(180).allow("").optional(),
      description: Joi.string().trim().max(2000).allow("").optional(),
      campaignType: Joi.string().trim().allow("").optional(),
      category: Joi.string().trim().allow("").optional(),
      country: Joi.string().trim().allow("").optional(),
      language: Joi.string().trim().allow("").optional(),
      commissionPercent: Joi.number().min(0).max(50).optional(),
      fixedFee: Joi.number().min(0).optional(),
      deadline: Joi.date().iso().allow(null).optional(),
      state: Joi.string().valid("draft", "proposed", "accepted", "active", "paused", "completed", "cancelled").optional(),
      status: Joi.string().trim().allow("").optional(),
      action: Joi.string().valid("pause", "close", "activate", "feature", "unfeature").optional(),
      featured: Joi.boolean().optional(),
      marketplace: Joi.object({
        public: Joi.boolean().optional(),
        applicationDeadline: Joi.date().iso().allow(null).optional(),
        availableSlots: Joi.number().integer().min(0).optional(),
        requiredDeliverables: Joi.array().items(Joi.string()).optional(),
        assets: Joi.array().items(Joi.object().unknown(true)).optional(),
      }).unknown(true).optional(),
      note: Joi.string().trim().max(1000).allow("").optional(),
    })
  ),
  controller.updateCampaign
);
router.get("/matching", readPermission("influencerVendorMatching"), validate(querySchema, "query"), controller.matching);
router.get("/affiliate-links", readPermission("affiliateLinks"), validate(querySchema, "query"), controller.affiliateLinks);
router.get("/affiliate-links/:linkId", readPermission("affiliateLinks"), validate(objectIdParamSchema, "params"), controller.affiliateLinkDetails);
router.patch(
  "/affiliate-links/:linkId/status",
  updatePermission("affiliateLinks"),
  validate(objectIdParamSchema, "params"),
  validate(affiliateLinkStatusSchema),
  controller.updateAffiliateLinkStatus
);
router.get("/affiliate-tracking", readPermission("affiliateTracking"), validate(querySchema, "query"), controller.tracking);
router.get("/product-promotions", readPermission("productPromotions"), validate(querySchema, "query"), controller.productPromotions);
router.get("/settlements", readPermission("settlements"), validate(querySchema, "query"), controller.settlements);
router.get("/payouts", readPermission("payouts", "payouts:read"), validate(querySchema, "query"), controller.payouts);
router.get("/revenue-dashboard", readPermission("revenueDashboard"), validate(querySchema, "query"), controller.revenueDashboard);
router.get("/fixed-revenue", readPermission("campaignFinance"), validate(querySchema, "query"), controller.fixedRevenueDashboard);
router.patch(
  "/withdrawals/:requestId",
  requireInfluencerCommercePayoutsUpdate,
  validate(Joi.object({ requestId: Joi.string().trim().required() }), "params"),
  validate(
    Joi.object({
      status: Joi.string().valid("UNDER_REVIEW", "APPROVED", "PROCESSING", "COMPLETED", "REJECTED", "CANCELLED", "FAILED").required(),
      transactionReference: Joi.string().trim().max(180).allow("").optional(),
      reason: Joi.string().trim().max(1000).allow("").optional(),
      rejectionReason: Joi.string().trim().max(1000).allow("").optional(),
      note: Joi.string().trim().max(1000).allow("").optional(),
    })
  ),
  controller.updateWithdrawalRequest
);
router.get("/settings", requireInfluencerCommerceSettingsRead, controller.settings);
router.patch(
  "/settings",
  requireInfluencerCommerceSettingsUpdate,
  validate(Joi.object({ enabled: Joi.boolean().optional() })),
  controller.updateSettings
);
router.get("/audit-logs", readPermission("tierScoreConfig"), validate(querySchema, "query"), controller.auditLogs);
router.get("/configuration", requireInfluencerCommerceTierScoreRead, controller.configOverview);
router.get("/configuration/audit-logs", requireInfluencerCommerceTierScoreRead, validate(querySchema, "query"), controller.configAuditLogs);
router.get("/configuration/:entityType", requireInfluencerCommerceTierScoreRead, validate(configEntitySchema, "params"), validate(querySchema, "query"), controller.listConfig);
router.post(
  "/configuration/:entityType",
  requireInfluencerCommerceTierScoreCreate,
  validate(configEntitySchema, "params"),
  validate(flexibleConfigSchema),
  controller.createConfig
);
router.patch(
  "/configuration/:entityType/:id",
  requireInfluencerCommerceTierScoreUpdate,
  validate(configEntitySchema, "params"),
  validate(flexibleConfigSchema),
  controller.updateConfig
);
router.delete(
  "/configuration/:entityType/:id",
  requireInfluencerCommerceTierScoreDelete,
  validate(configEntitySchema, "params"),
  controller.deleteConfig
);
router.get("/configuration/:entityType/:id/history", requireInfluencerCommerceTierScoreRead, validate(configEntitySchema, "params"), controller.configVersions);
router.post(
  "/configuration/:entityType/:id/recover",
  requireInfluencerCommerceTierScoreUpdate,
  validate(configEntitySchema, "params"),
  validate(recoverConfigSchema),
  controller.recoverConfig
);

module.exports = router;
