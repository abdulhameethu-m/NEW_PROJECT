const express = require("express");
const Joi = require("joi");
const { authRequired, requireRole } = require("../../middleware/auth");
const { requireApprovedVendor } = require("../../middleware/vendorApproval");
const { validate } = require("../../middleware/validate");
const controller = require("./controller");

const router = express.Router();
const vendorAuth = [authRequired, requireRole("vendor"), requireApprovedVendor];

router.post(
  "/create",
  vendorAuth,
  validate(
    Joi.object({
      influencerId: Joi.string().required(),
      productIds: Joi.array().items(Joi.string().required()).min(1).required(),
      title: Joi.string().trim().max(180).allow("").default(""),
      description: Joi.string().trim().max(2000).allow("").default(""),
      banner: Joi.string().trim().allow("").default(""),
      campaignType: Joi.string()
        .valid("affiliate", "sponsored", "product_review", "ugc", "video", "live_commerce", "brand_ambassador", "custom")
        .default("affiliate"),
      category: Joi.string().trim().allow("").default(""),
      country: Joi.string().trim().allow("").default(""),
      language: Joi.string().trim().allow("").default("en"),
      commissionPercent: Joi.number().min(0).max(50).default(0),
      fixedFee: Joi.number().min(0).default(0),
      paymentType: Joi.string().valid("fixed", "commission", "hybrid", "free_product").optional(),
      attributionDays: Joi.number().integer().min(1).max(365).optional(),
      services: Joi.array().items(Joi.object().unknown(true)).default([]),
      selectedServices: Joi.array().items(Joi.object().unknown(true)).default([]),
      deliverableCommissionRates: Joi.array().items(Joi.object().unknown(true)).default([]),
      dynamicFields: Joi.object().unknown(true).default({}),
      paymentModel: Joi.object({
        paymentType: Joi.string().valid("fixed", "commission", "hybrid", "free_product").optional(),
        type: Joi.string().allow("").optional(),
        services: Joi.array().items(Joi.object().unknown(true)).default([]),
        selectedServices: Joi.array().items(Joi.object().unknown(true)).default([]),
        deliverableCommissionRates: Joi.array().items(Joi.object().unknown(true)).default([]),
        fixedFee: Joi.number().min(0).optional(),
        commissionPercentage: Joi.number().min(0).max(50).optional(),
        commissionPercent: Joi.number().min(0).max(50).optional(),
        attributionDays: Joi.number().integer().min(1).max(365).optional(),
        expectedBudget: Joi.number().min(0).optional(),
        productValue: Joi.number().min(0).optional(),
        shippingCost: Joi.number().min(0).optional(),
        taxes: Joi.number().min(0).optional(),
        platformFees: Joi.number().min(0).optional(),
        returnRequired: Joi.boolean().optional(),
        dynamicFields: Joi.object().unknown(true).default({}),
        currency: Joi.string().trim().max(8).optional(),
      }).unknown(true).optional(),
      payment: Joi.object().unknown(true).optional(),
      budget: Joi.number().min(0).optional(),
      deadline: Joi.date().iso().allow(null),
      marketplace: Joi.object({
        public: Joi.boolean().default(false),
        applicationDeadline: Joi.date().iso().allow(null),
        availableSlots: Joi.number().min(0).default(1),
        requiredDeliverables: Joi.array().items(Joi.string().trim()).default([]),
        assets: Joi.array().items(Joi.object().unknown(true)).default([]),
      }).default({}),
    })
  ),
  controller.create
);

router.post(
  "/accept",
  authRequired,
  requireRole("influencer"),
  validate(Joi.object({ campaignId: Joi.string().required() })),
  controller.accept
);

router.post(
  "/reject",
  authRequired,
  requireRole("influencer"),
  validate(
    Joi.object({
      campaignId: Joi.string().required(),
      note: Joi.string().allow("").max(500).default(""),
    })
  ),
  controller.reject
);

router.get("/vendor", vendorAuth, controller.vendor);
router.get("/influencer", authRequired, requireRole("influencer"), controller.influencer);
router.get("/influencer/:campaignId/execution", authRequired, requireRole("influencer"), controller.influencerExecution);
router.post(
  "/influencer/:campaignId/check-completion",
  authRequired,
  requireRole("influencer"),
  validate(Joi.object({ campaignId: Joi.string().required() }), "params"),
  controller.checkCompletion
);
router.post(
  "/influencer/:campaignId/deliverables/:deliverableId/submissions",
  authRequired,
  requireRole("influencer"),
  validate(
    Joi.object({
      contentUrl: Joi.string().trim().max(1200).required(),
      contentType: Joi.string().valid("post", "reel").required(),
      sourcePlatform: Joi.string().valid("instagram", "facebook", "youtube", "tiktok", "upload").required(),
      mediaType: Joi.string().valid("instagram_post", "facebook_post", "image", "carousel", "document", "instagram_reel", "youtube_shorts", "tiktok_video", "facebook_reel", "video").required(),
      uploadMethod: Joi.string().valid("url", "file").required(),
      mediaUrls: Joi.array().items(Joi.string().trim().max(1200)).default([]),
      fileMetadata: Joi.array().items(Joi.object().unknown(true)).default([]),
      notes: Joi.string().trim().max(1000).allow("").default(""),
    })
  ),
  controller.submitExecution
);
router.get("/vendor/execution/review-queue", vendorAuth, validate(Joi.object({ campaignId: Joi.string().trim().allow("").optional(), status: Joi.string().trim().allow("").optional(), limit: Joi.number().integer().min(1).max(100).optional() }), "query"), controller.reviewQueue);
router.get("/vendor/:campaignId/execution", vendorAuth, controller.vendorExecution);
router.patch(
  "/vendor/:campaignId/deliverables/:deliverableId/review",
  vendorAuth,
  validate(
    Joi.object({
      submissionId: Joi.string().trim().allow("").optional(),
      decision: Joi.string().valid("approve", "reject", "revision_requested", "changes").required(),
      comments: Joi.string().trim().max(1500).allow("").default(""),
      note: Joi.string().trim().max(1500).allow("").default(""),
    })
  ),
  controller.reviewExecution
);
router.get("/marketplace", authRequired, requireRole("influencer"), controller.marketplace);
router.get("/marketplace/analytics", authRequired, requireRole("influencer"), controller.analytics);
router.post(
  "/marketplace/:campaignId/apply",
  authRequired,
  requireRole("influencer"),
  validate(
    Joi.object({
      profileSummary: Joi.string().trim().max(1000).allow("").default(""),
      portfolio: Joi.string().trim().max(500).allow("").default(""),
      expectedEarnings: Joi.number().min(0).default(0),
      audienceStats: Joi.object().unknown(true).default({}),
      attachments: Joi.array().items(Joi.object().unknown(true)).default([]),
    })
  ),
  controller.apply
);
router.patch(
  "/marketplace/:campaignId/save",
  authRequired,
  requireRole("influencer"),
  validate(Joi.object({ saved: Joi.boolean().default(true) })),
  controller.save
);
router.post(
  "/marketplace/:campaignId/deliverables",
  authRequired,
  requireRole("influencer"),
  validate(
    Joi.object({
      type: Joi.string().trim().max(80).default("video"),
      title: Joi.string().trim().max(180).allow("").default(""),
      dueDate: Joi.date().iso().allow(null),
      contentId: Joi.string().allow("", null),
      notes: Joi.string().trim().max(1000).allow("").default(""),
    })
  ),
  controller.deliverable
);
router.get("/admin/list", authRequired, requireRole("admin", "super_admin", "support_admin", "finance_admin"), controller.admin);

module.exports = router;
