const express = require("express");
const Joi = require("joi");
const { validate } = require("../../middleware/validate");
const controller = require("./controller");
const campaignFinanceController = require("../campaignFinance/controller");

const router = express.Router();
router.get("/campaign-finance", campaignFinanceController.admin);

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().trim().allow("").optional(),
  category: Joi.string().trim().allow("").optional(),
  country: Joi.string().trim().allow("").optional(),
  language: Joi.string().trim().allow("").optional(),
  serviceType: Joi.string().trim().allow("").optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  reelPrice: Joi.number().min(0).optional(),
  postPrice: Joi.number().min(0).optional(),
  storyPrice: Joi.number().min(0).optional(),
  livePrice: Joi.number().min(0).optional(),
  ratingMin: Joi.number().min(0).max(5).optional(),
  scoreMin: Joi.number().min(0).max(100).optional(),
  completionMin: Joi.number().min(0).max(100).optional(),
  minFollowers: Joi.number().min(0).optional(),
  maxFollowers: Joi.number().min(0).optional(),
  sort: Joi.string().trim().allow("").optional(),
  status: Joi.string().trim().allow("").optional(),
  state: Joi.string().trim().allow("").optional(),
  campaignType: Joi.string().trim().allow("").optional(),
  paymentModel: Joi.string().valid("", "all", "fixed", "commission", "hybrid", "free_product").optional(),
  paymentType: Joi.string().valid("", "all", "fixed", "commission", "hybrid", "free_product").optional(),
  campaignId: Joi.string().trim().allow("").optional(),
  influencerId: Joi.string().trim().allow("").optional(),
  productId: Joi.string().trim().allow("").optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  queue: Joi.string().trim().allow("").optional(),
});

const mediaQuery = listQuery.keys({
  contentType: Joi.string().trim().allow("").optional(),
  subcategory: Joi.string().trim().allow("").optional(),
});

const addressPayload = Joi.object({
  name: Joi.string().trim().max(160).allow("").optional(),
  phone: Joi.string().trim().max(40).allow("").optional(),
  addressLine1: Joi.string().trim().max(300).allow("").optional(),
  addressLine2: Joi.string().trim().max(300).allow("").optional(),
  addressLine: Joi.string().trim().max(300).allow("").optional(),
  district: Joi.string().trim().max(120).allow("").optional(),
  city: Joi.string().trim().max(120).allow("").optional(),
  state: Joi.string().trim().max(120).allow("").optional(),
  postalCode: Joi.string().trim().max(40).allow("").optional(),
  pincode: Joi.string().trim().max(40).allow("").optional(),
  country: Joi.string().trim().max(80).allow("").optional(),
}).unknown(true);

const productShippingPayload = Joi.object({
  productRequired: Joi.boolean().default(false),
  returnRequired: Joi.boolean().default(true),
  influencerAddressId: Joi.string().trim().allow("").optional(),
  vendorReturnAddressId: Joi.string().trim().allow("").optional(),
  deliveryAddressSnapshot: addressPayload.default({}),
  returnAddressSnapshot: addressPayload.default({}),
  courierCompany: Joi.string().trim().max(120).allow("").default(""),
  trackingNumber: Joi.string().trim().max(120).allow("").default(""),
  trackingUrl: Joi.string().trim().max(500).allow("").default(""),
  shipmentDate: Joi.date().iso().empty("").allow(null).optional(),
  estimatedDelivery: Joi.date().iso().empty("").allow(null).optional(),
  shippingCost: Joi.number().min(0).default(0),
  packageWeight: Joi.string().trim().max(80).allow("").default(""),
  packageDimensions: Joi.object({
    length: Joi.string().trim().max(40).allow("").default(""),
    width: Joi.string().trim().max(40).allow("").default(""),
    height: Joi.string().trim().max(40).allow("").default(""),
    unit: Joi.string().trim().max(20).allow("").default("cm"),
  }).default({}),
  notes: Joi.string().trim().max(1500).allow("").default(""),
  note: Joi.string().trim().max(1500).allow("").default(""),
  shipmentStatus: Joi.string().trim().allow("").optional(),
  deliveryProof: Joi.object().unknown(true).default({}),
  returnProof: Joi.object().unknown(true).default({}),
  returnCourierCompany: Joi.string().trim().max(120).allow("").default(""),
  returnTrackingNumber: Joi.string().trim().max(120).allow("").default(""),
  returnTrackingUrl: Joi.string().trim().max(500).allow("").default(""),
  returnShipmentDate: Joi.date().iso().empty("").allow(null).optional(),
  returnEstimatedDelivery: Joi.date().iso().empty("").allow(null).optional(),
  returnNotes: Joi.string().trim().max(1500).allow("").default(""),
}).unknown(true).default({});

const campaignPayload = Joi.object({
  influencerId: Joi.string().allow("").optional(),
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
  dynamicFields: Joi.object().unknown(true).default({}),
  paymentModel: Joi.object({
    paymentType: Joi.string().valid("fixed", "commission", "hybrid", "free_product").optional(),
    type: Joi.string().trim().allow("").optional(),
    services: Joi.array().items(Joi.object().unknown(true)).default([]),
    selectedServices: Joi.array().items(Joi.object().unknown(true)).default([]),
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
});

router.get("/dashboard", validate(listQuery, "query"), controller.dashboard);
router.get("/subscription/plans", controller.subscriptionPlans);
router.get(
  "/escrow-refunds",
  validate(
    Joi.object({
      status: Joi.string().trim().allow("").optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      skip: Joi.number().integer().min(0).optional(),
    }),
    "query"
  ),
  controller.escrowRefunds
);
router.get(
  "/escrow-refunds/:campaignId/deliverables",
  validate(Joi.object({ campaignId: Joi.string().required() }), "params"),
  controller.escrowRefundDeliverables
);
router.post(
  "/subscription/order",
  validate(Joi.object({
    planId: Joi.string().required(),
    billingCycle: Joi.string().valid("monthly", "quarterly", "half_yearly", "yearly", "custom").default("monthly"),
    autoRenew: Joi.boolean().default(false),
  })),
  controller.createSubscriptionOrder
);
router.post(
  "/subscription/verify",
  validate(Joi.object({
    razorpay_order_id: Joi.string().required(),
    razorpay_payment_id: Joi.string().required(),
    razorpay_signature: Joi.string().required(),
  })),
  controller.verifySubscriptionPayment
);
router.get(
  "/subscription/proration-preview",
  validate(Joi.object({
    planId: Joi.string().required(),
    billingCycle: Joi.string().valid("monthly", "quarterly", "half_yearly", "yearly", "custom").default("monthly"),
  }), "query"),
  controller.prorationPreview
);
router.post(
  "/subscription/change-plan",
  validate(Joi.object({
    planId: Joi.string().required(),
    billingCycle: Joi.string().valid("monthly", "quarterly", "half_yearly", "yearly", "custom").default("monthly"),
    autoRenew: Joi.boolean().default(false),
    reason: Joi.string().trim().max(1000).allow("").default(""),
  })),
  controller.createPlanChangeOrder
);
router.post(
  "/subscription/change-plan/confirm",
  validate(Joi.object({
    razorpay_order_id: Joi.string().required(),
    razorpay_payment_id: Joi.string().required(),
    razorpay_signature: Joi.string().required(),
  })),
  controller.confirmPlanChange
);
router.post("/subscription/cancel", controller.cancelSubscription);
router.post(
  "/subscription",
  validate(Joi.object({
    planId: Joi.string().required(),
    billingCycle: Joi.string().valid("monthly", "quarterly", "half_yearly", "yearly", "custom").default("monthly"),
    paymentReference: Joi.string().allow("").optional(),
    endDate: Joi.date().iso().allow(null).optional(),
    autoRenew: Joi.boolean().default(false),
    metadata: Joi.object().unknown(true).default({}),
  })),
  controller.subscribe
);
router.get("/discover", validate(listQuery, "query"), controller.discover);
router.get("/configuration", controller.configuration);
router.get("/creators/:influencerId", controller.creatorProfile);
router.get("/relationships", validate(listQuery, "query"), controller.relationships);
router.patch("/relationships/:influencerId/save", validate(Joi.object({ saved: Joi.boolean().default(true) })), controller.saveInfluencer);
router.post("/relationships/:influencerId/visit", controller.visitInfluencer);
router.patch(
  "/relationships/:influencerId",
  validate(
    Joi.object({
      status: Joi.string().valid("viewed", "saved", "invited", "applied", "approved", "active", "paused", "blacklisted").required(),
      notes: Joi.string().trim().max(1200).allow("").optional(),
      blacklistReason: Joi.string().trim().max(500).allow("").optional(),
    })
  ),
  controller.updateRelationship
);

router.get("/campaigns", validate(listQuery, "query"), controller.campaigns);
router.post("/campaigns/preview", validate(campaignPayload), controller.campaignPreview);
router.post("/campaigns", validate(campaignPayload), controller.createCampaign);
router.get("/delivered-products", validate(listQuery, "query"), controller.deliveredProducts);
router.patch("/delivered-products/:shipmentId/status", validate(Joi.object({ shipmentId: Joi.string().required() }), "params"), validate(productShippingPayload), controller.updateDeliveredProductStatus);
router.get("/returned-products", validate(listQuery, "query"), controller.returnedProducts);
router.patch("/returned-products/:shipmentId/status", validate(Joi.object({ shipmentId: Joi.string().required() }), "params"), validate(productShippingPayload), controller.updateReturnedProductStatus);
router.get("/campaigns/:campaignId/shipping", validate(Joi.object({ campaignId: Joi.string().required() }), "params"), controller.getCampaignShipping);
router.post("/campaigns/:campaignId/shipping", validate(productShippingPayload), controller.saveCampaignShipping);
router.put("/campaigns/:campaignId/shipping", validate(productShippingPayload), controller.saveCampaignShipping);
router.post("/campaigns/:campaignId/dispatch", validate(productShippingPayload), controller.dispatchCampaignProduct);
router.post("/campaigns/:campaignId/return", validate(productShippingPayload), controller.updateCampaignReturn);
router.get("/campaigns/:campaignId/tracking", validate(Joi.object({ campaignId: Joi.string().required() }), "params"), controller.getCampaignTracking);
router.patch(
  "/campaigns/:campaignId/status",
  validate(Joi.object({ action: Joi.string().valid("pause", "close", "activate").optional(), state: Joi.string().allow("").optional(), note: Joi.string().allow("").max(500).default("") })),
  controller.updateCampaignStatus
);
router.delete("/campaigns/:campaignId", controller.deleteCampaign);
router.patch(
  "/campaigns/:campaignId/applications/:influencerId",
  validate(Joi.object({ decision: Joi.string().valid("approve", "reject").required(), note: Joi.string().allow("").max(1000).default("") })),
  controller.reviewApplication
);

router.get("/products", validate(listQuery, "query"), controller.products);
router.get("/media/dashboard", validate(mediaQuery, "query"), controller.mediaDashboard);
router.get("/media/:mediaId", validate(Joi.object({ mediaId: Joi.string().required() }), "params"), controller.mediaDetails);
router.get("/media", validate(mediaQuery, "query"), controller.mediaLibrary);
router.get("/content-approvals", validate(listQuery, "query"), controller.contentApprovals);
router.patch(
  "/content-approvals/:reelId",
  validate(
    Joi.object({
      decision: Joi.string().valid("approve", "reject", "changes").required(),
      note: Joi.string().allow("").max(1000).default(""),
      requestedChanges: Joi.string().allow("").max(1000).default(""),
    })
  ),
  controller.reviewContent
);
router.get("/performance", validate(listQuery, "query"), controller.performance);

module.exports = router;
