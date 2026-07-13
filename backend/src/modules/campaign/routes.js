const express = require("express");
const Joi = require("joi");
const { authRequired, requireRole } = require("../../middleware/auth");
const { requireApprovedVendor } = require("../../middleware/vendorApproval");
const { validate } = require("../../middleware/validate");
const controller = require("./controller");

const router = express.Router();
const vendorAuth = [authRequired, requireRole("vendor"), requireApprovedVendor];

const addressPayload = Joi.object({
  name: Joi.string().trim().max(160).allow("").optional(),
  phone: Joi.string().trim().max(40).allow("").optional(),
  addressLine1: Joi.string().trim().max(300).allow("").optional(),
  addressLine2: Joi.string().trim().max(300).allow("").optional(),
  city: Joi.string().trim().max(120).allow("").optional(),
  state: Joi.string().trim().max(120).allow("").optional(),
  postalCode: Joi.string().trim().max(40).allow("").optional(),
  country: Joi.string().trim().max(80).allow("").optional(),
}).unknown(true);

const productShippingPayload = Joi.object({
  productRequired: Joi.boolean().default(false),
  returnRequired: Joi.boolean().default(true),
  deliveryAddressSnapshot: addressPayload.default({}),
  returnAddressSnapshot: addressPayload.default({}),
  courierCompany: Joi.string().trim().max(120).allow("").default(""),
  trackingNumber: Joi.string().trim().max(120).allow("").default(""),
  trackingUrl: Joi.string().trim().max(500).allow("").default(""),
  shipmentDate: Joi.date().iso().allow(null).optional(),
  estimatedDelivery: Joi.date().iso().allow(null).optional(),
  shippingCost: Joi.number().min(0).default(0),
  packageWeight: Joi.string().trim().max(80).allow("").default(""),
  packageDimensions: Joi.object().unknown(true).default({}),
  notes: Joi.string().trim().max(1500).allow("").default(""),
  note: Joi.string().trim().max(1500).allow("").default(""),
  shipmentStatus: Joi.string().trim().allow("").optional(),
  deliveryProof: Joi.object().unknown(true).default({}),
  returnProof: Joi.object().unknown(true).default({}),
  returnCourierCompany: Joi.string().trim().max(120).allow("").default(""),
  returnTrackingNumber: Joi.string().trim().max(120).allow("").default(""),
  returnTrackingUrl: Joi.string().trim().max(500).allow("").default(""),
  returnShipmentDate: Joi.date().iso().allow(null).optional(),
  returnEstimatedDelivery: Joi.date().iso().allow(null).optional(),
  returnNotes: Joi.string().trim().max(1500).allow("").default(""),
}).unknown(true).default({});

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
      invitationDays: Joi.number().integer().min(1).max(365).optional(),
      contentCreationDays: Joi.number().integer().min(1).max(365).optional(),
      campaignDurationDays: Joi.number().integer().min(1).max(3650).optional(),
      durationDays: Joi.number().integer().min(1).max(3650).optional(),
      lifecycle: Joi.object({
        invitationDays: Joi.number().integer().min(1).max(365).optional(),
        invitationAcceptanceDays: Joi.number().integer().min(1).max(365).optional(),
        contentCreationDays: Joi.number().integer().min(1).max(365).optional(),
        campaignDurationDays: Joi.number().integer().min(1).max(3650).optional(),
      }).unknown(true).optional(),
      startDate: Joi.date().iso().allow(null).optional(),
      endDate: Joi.date().iso().allow(null).optional(),
      campaignStartDate: Joi.date().iso().allow(null).optional(),
      campaignEndDate: Joi.date().iso().allow(null).optional(),
      deadline: Joi.date().iso().allow(null),
      marketplace: Joi.object({
        public: Joi.boolean().default(false),
        applicationDeadline: Joi.date().iso().allow(null),
        availableSlots: Joi.number().min(0).default(1),
        requiredDeliverables: Joi.array().items(Joi.string().trim()).default([]),
        assets: Joi.array().items(Joi.object().unknown(true)).default([]),
      }).default({}),
      productShipping: productShippingPayload.optional(),
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
router.get("/influencer/:campaignId/product", authRequired, requireRole("influencer"), validate(Joi.object({ campaignId: Joi.string().required() }), "params"), controller.influencerProduct);
router.post("/influencer/:campaignId/confirm-delivery", authRequired, requireRole("influencer"), validate(productShippingPayload), controller.confirmDelivery);
router.post("/influencer/:campaignId/request-return", authRequired, requireRole("influencer"), validate(productShippingPayload), controller.requestReturn);
router.post("/influencer/:campaignId/confirm-return", authRequired, requireRole("influencer"), validate(productShippingPayload), controller.confirmReturn);
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
      contentTitle: Joi.string().trim().max(180).allow("").default(""),
      contentDescription: Joi.string().trim().max(2000).allow("").default(""),
      contentCaption: Joi.string().trim().max(1000).allow("").default(""),
      notes: Joi.string().trim().max(1000).allow("").default(""),
    })
  ),
  controller.submitExecution
);
router.patch(
  "/influencer/:campaignId/deliverables/:deliverableId/submission-details",
  authRequired,
  requireRole("influencer"),
  validate(
    Joi.object({
      contentTitle: Joi.string().trim().max(180).allow("").default(""),
      contentDescription: Joi.string().trim().max(2000).allow("").default(""),
      contentCaption: Joi.string().trim().max(1000).allow("").default(""),
    })
  ),
  controller.updateExecutionDetails
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
      publishDate: Joi.date().iso().allow(null).optional(),
      publishTime: Joi.string().pattern(/^\d{1,2}:\d{2}$/).allow("").optional(),
      timezone: Joi.string().trim().max(80).allow("").optional(),
      publishTimezone: Joi.string().trim().max(80).allow("").optional(),
      scheduledPublishAt: Joi.date().iso().allow(null).optional(),
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
