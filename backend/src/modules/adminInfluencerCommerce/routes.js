const express = require("express");
const Joi = require("joi");
const { validate } = require("../../middleware/validate");
const controller = require("./controller");

const router = express.Router();

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
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  sort: Joi.string().trim().allow("").optional(),
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
    "requirementFields",
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

router.get("/dashboard", validate(querySchema, "query"), controller.dashboard);
router.get("/influencers", validate(querySchema, "query"), controller.influencers);
router.get("/vendors", validate(querySchema, "query"), controller.vendors);
router.get("/campaigns", validate(querySchema, "query"), controller.campaigns);
router.patch(
  "/campaigns/:campaignId",
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
        requirements: Joi.object().unknown(true).optional(),
        assets: Joi.array().items(Joi.object().unknown(true)).optional(),
      }).unknown(true).optional(),
      note: Joi.string().trim().max(1000).allow("").optional(),
    })
  ),
  controller.updateCampaign
);
router.get("/matching", validate(querySchema, "query"), controller.matching);
router.post(
  "/matching/recommend",
  validate(Joi.object({
    vendorId: Joi.string().trim().required(),
    influencerId: Joi.string().trim().required(),
    recommended: Joi.boolean().default(true),
    note: Joi.string().trim().max(1000).allow("").default(""),
  })),
  controller.recommendMatch
);
router.get("/affiliate-links", validate(querySchema, "query"), controller.affiliateLinks);
router.get("/affiliate-tracking", validate(querySchema, "query"), controller.tracking);
router.get("/product-promotions", validate(querySchema, "query"), controller.productPromotions);
router.get("/settlements", validate(querySchema, "query"), controller.settlements);
router.get("/payouts", validate(querySchema, "query"), controller.payouts);
router.get("/revenue-dashboard", validate(querySchema, "query"), controller.revenueDashboard);
router.get("/fixed-revenue", validate(querySchema, "query"), controller.fixedRevenueDashboard);
router.patch(
  "/withdrawals/:requestId",
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
router.get("/settings", controller.settings);
router.patch("/settings", validate(Joi.object({ enabled: Joi.boolean().optional() }).unknown(true)), controller.updateSettings);
router.get("/audit-logs", validate(querySchema, "query"), controller.auditLogs);
router.get("/configuration", controller.configOverview);
router.get("/configuration/audit-logs", validate(querySchema, "query"), controller.configAuditLogs);
router.get("/configuration/:entityType", validate(configEntitySchema, "params"), validate(querySchema, "query"), controller.listConfig);
router.post("/configuration/:entityType", validate(configEntitySchema, "params"), validate(flexibleConfigSchema), controller.createConfig);
router.patch("/configuration/:entityType/:id", validate(configEntitySchema, "params"), validate(flexibleConfigSchema), controller.updateConfig);
router.delete("/configuration/:entityType/:id", validate(configEntitySchema, "params"), controller.deleteConfig);
router.get("/configuration/:entityType/:id/history", validate(configEntitySchema, "params"), controller.configVersions);
router.post("/configuration/:entityType/:id/recover", validate(configEntitySchema, "params"), validate(recoverConfigSchema), controller.recoverConfig);

module.exports = router;
