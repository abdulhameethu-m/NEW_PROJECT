const express = require("express");
const Joi = require("joi");
const { authRequired, requireRole } = require("../../middleware/auth");
const { requireApprovedVendor } = require("../../middleware/vendorApproval");
const { validate } = require("../../middleware/validate");
const escrowController = require("./escrow.controller");

const router = express.Router();
const vendorAuth = [authRequired, requireRole("vendor"), requireApprovedVendor];
const adminAuth = [authRequired, requireRole("admin")];
const feeConfigurationSchema = Joi.object({
  feeName: Joi.string().trim().max(120).required(),
  feeCode: Joi.string().valid("platform_fee", "gateway_fee", "gst", "refund_processing_fee", "partial_refund_fee").required(),
  feeType: Joi.string().valid("percentage", "fixed", "hybrid").required(),
  percentageValue: Joi.number().min(0).max(100).default(0),
  fixedValue: Joi.number().min(0).default(0),
  calculationBase: Joi.string().valid("campaign_budget", "service_fees", "refundable_amount").default("campaign_budget"),
  isActive: Joi.boolean().default(true),
  effectiveFrom: Joi.date().required(),
  effectiveTo: Joi.date().allow(null),
});

/**
 * ============ VENDOR ROUTES ============
 * For vendors to manage campaign escrow and payments
 */

/**
 * POST /api/campaigns/escrow/calculate/:campaignId
 * Calculate campaign cost with fees and taxes
 */
router.get(
  "/calculate/:campaignId",
  vendorAuth,
  validate(
    Joi.object({
      campaignId: Joi.string().required(),
    }),
    "params"
  ),
  escrowController.calculateCost
);

/**
 * POST /api/campaigns/escrow/payment-order
 * Create payment order for campaign funding
 */
router.post(
  "/payment-order",
  vendorAuth,
  validate(
    Joi.object({
      campaignId: Joi.string().required(),
    })
  ),
  escrowController.createPaymentOrder
);

/**
 * POST /api/campaigns/escrow/verify-payment
 * Verify Razorpay payment and activate campaign
 */
router.post(
  "/verify-payment",
  vendorAuth,
  validate(
    Joi.object({
      paymentOrderId: Joi.string().required(),
      razorpayOrderId: Joi.string().required(),
      razorpayPaymentId: Joi.string().required(),
      razorpaySignature: Joi.string().required(),
    })
  ),
  escrowController.verifyPayment
);

/**
 * GET /api/campaigns/escrow/payment/:paymentOrderId
 * Get payment details
 */
router.get(
  "/payment/:paymentOrderId",
  vendorAuth,
  escrowController.getPaymentDetails
);

/**
 * GET /api/campaigns/escrow/summary/:campaignId
 * Get escrow wallet summary
 */
router.get(
  "/summary/:campaignId",
  vendorAuth,
  escrowController.getEscrowSummary
);

/**
 * GET /api/campaigns/escrow/refund-eligibility/:campaignId
 * Check if campaign is eligible for refund
 */
router.get(
  "/refund-eligibility/:campaignId",
  vendorAuth,
  escrowController.checkRefundEligibility
);

/**
 * POST /api/campaigns/escrow/request-refund/:campaignId
 * Request refund for campaign
 */
router.post(
  "/request-refund/:campaignId",
  vendorAuth,
  validate(
    Joi.object({
      reason: Joi.string()
        .valid(
          "campaign_cancelled_before_acceptance",
          "campaign_cancelled_no_deliverables",
          "partial_completion_cancelled",
          "vendor_request",
          "other"
        )
        .required(),
      description: Joi.string().max(1000).allow(""),
    })
  ),
  escrowController.requestRefund
);

/**
 * GET /api/campaigns/escrow/refund/:refundId
 * Get refund details
 */
router.get(
  "/refund/:refundId",
  vendorAuth,
  escrowController.getRefundDetails
);

/**
 * GET /api/campaigns/escrow/payment-orders
 * List payment orders for vendor
 */
router.get(
  "/payment-orders",
  vendorAuth,
  escrowController.listPaymentOrders
);

/**
 * ============ ADMIN ROUTES ============
 * For admin to manage escrow and refunds
 */

router.get(
  "/admin/release-queue",
  adminAuth,
  escrowController.listReleaseQueue
);

router.post(
  "/admin/release-payment/:campaignId",
  adminAuth,
  validate(
    Joi.object({
      influencerId: Joi.string().required(),
      deliverableIds: Joi.array().items(Joi.string().required()).min(1).required(),
    })
  ),
  escrowController.releasePayment
);

/**
 * GET /api/admin/campaigns/escrow/refund-requests
 * List all refund requests
 */
router.get(
  "/admin/refund-requests",
  adminAuth,
  escrowController.listRefundRequests
);

/**
 * POST /api/admin/campaigns/escrow/approve-refund/:refundId
 * Approve refund request
 */
router.post(
  "/admin/approve-refund/:refundId",
  adminAuth,
  validate(
    Joi.object({
      approvalReason: Joi.string().max(1000).allow(""),
    })
  ),
  escrowController.approveRefund
);

/**
 * POST /api/admin/campaigns/escrow/reject-refund/:refundId
 * Reject refund request
 */
router.post(
  "/admin/reject-refund/:refundId",
  adminAuth,
  validate(
    Joi.object({
      rejectionReason: Joi.string().required(),
    })
  ),
  escrowController.rejectRefund
);

/**
 * POST /api/admin/campaigns/escrow/process-refund/:refundId
 * Process approved refund to payment method
 */
router.post(
  "/admin/process-refund/:refundId",
  adminAuth,
  escrowController.processRefund
);

/**
 * GET /api/admin/campaigns/escrow/statistics
 * Get refund statistics
 */
router.get(
  "/admin/statistics",
  adminAuth,
  escrowController.getRefundStats
);

/**
 * GET /api/admin/campaigns/escrow/payment-orders
 * List all payment orders (admin)
 */
router.get(
  "/admin/payment-orders",
  adminAuth,
  escrowController.listPaymentOrders
);

router.get(
  "/admin/fee-configurations",
  adminAuth,
  escrowController.listFeeConfigurations
);

router.post(
  "/admin/fee-configurations",
  adminAuth,
  validate(feeConfigurationSchema),
  escrowController.createFeeConfiguration
);

router.patch(
  "/admin/fee-configurations/:configId",
  adminAuth,
  validate(feeConfigurationSchema),
  escrowController.updateFeeConfiguration
);

router.delete(
  "/admin/fee-configurations/:configId",
  adminAuth,
  validate(Joi.object({ configId: Joi.string().required() }), "params"),
  escrowController.deleteFeeConfiguration
);

module.exports = router;
