const { ok } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../utils/asyncHandler");
const campaignEscrowService = require("../../services/campaign-escrow.service");
const campaignPaymentService = require("../../services/campaign-payment.service");
const campaignRefundService = require("../../services/campaign-refund.service");
const campaignFeeService = require("../../services/campaign-fee.service");
const { ApiError } = require("../../utils/ApiError");

/**
 * Create Razorpay order for campaign funding
 */
const createPaymentOrder = asyncHandler(async (req, res) => {
  const { campaignId } = req.body;
  const vendorId = req.vendor._id;

  if (!campaignId) {
    throw new ApiError(400, "Campaign ID is required");
  }

  const result = await campaignPaymentService.createRazorpayOrder(campaignId, vendorId, req.user.sub);
  return ok(res, result, "Payment order created");
});

/**
 * Verify Razorpay payment and activate campaign
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { paymentOrderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!paymentOrderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new ApiError(400, "Missing required payment verification fields");
  }

  const result = await campaignPaymentService.verifyPaymentAndActivateCampaign(
    paymentOrderId,
    req.vendor._id,
    req.user.sub,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  );

  return ok(res, result, "Payment verified and campaign activated");
});

/**
 * Get campaign payment details
 */
const getPaymentDetails = asyncHandler(async (req, res) => {
  const { paymentOrderId } = req.params;
  const result = await campaignPaymentService.getPaymentDetails(paymentOrderId, req.vendor._id);
  return ok(res, result, "Payment details loaded");
});

/**
 * Get escrow wallet summary
 */
const getEscrowSummary = asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  const vendorId = req.vendor._id;

  const result = await campaignEscrowService.getCampaignEscrowSummary(campaignId, vendorId);
  return ok(res, result, "Escrow summary loaded");
});

/**
 * Release payment for approved deliverables
 */
const releasePayment = asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  const { influencerId, deliverableIds } = req.body;

  if (!influencerId || !deliverableIds || !Array.isArray(deliverableIds)) {
    throw new ApiError(400, "Influencer ID and deliverable IDs are required");
  }

  if (deliverableIds.length === 0) {
    throw new ApiError(400, "At least one deliverable must be specified");
  }

  const result = await campaignEscrowService.releasePaymentForDeliverables(
    campaignId,
    influencerId,
    deliverableIds,
    req.user.sub
  );

  return ok(res, result, "Payment released to influencer");
});

/**
 * Get refund eligibility
 */
const checkRefundEligibility = asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  const vendorId = req.vendor._id;

  const result = await campaignRefundService.checkRefundEligibility(campaignId, vendorId);
  return ok(res, result, "Refund eligibility checked");
});

/**
 * Get refund details (admin/vendor)
 */
const getRefundDetails = asyncHandler(async (req, res) => {
  const { refundId } = req.params;
  const result = await campaignRefundService.getRefundDetails(refundId, req.vendor._id);
  return ok(res, result, "Refund details loaded");
});

// ================== ADMIN ENDPOINTS ==================

/**
 * List refund requests (admin)
 */
const listRefundRequests = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    reason: req.query.reason,
    vendorId: req.query.vendorId,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    limit: parseInt(req.query.limit) || 20,
    skip: parseInt(req.query.skip) || 0,
  };

  const result = await campaignRefundService.getRefundRequests(filters);
  return ok(res, result, "Refund requests loaded");
});

/**
 * Approve refund (admin)
 */
const approveRefund = asyncHandler(async (req, res) => {
  const { refundId } = req.params;
  const { approvalReason } = req.body;
  const adminId = req.user.sub;

  const result = await campaignRefundService.approveRefund(refundId, approvalReason || "", adminId);
  return ok(res, result, "Refund approved");
});

/**
 * Reject refund (admin)
 */
const rejectRefund = asyncHandler(async (req, res) => {
  const { refundId } = req.params;
  const { rejectionReason } = req.body;
  const adminId = req.user.sub;

  if (!rejectionReason) {
    throw new ApiError(400, "Rejection reason is required");
  }

  const result = await campaignRefundService.rejectRefund(refundId, rejectionReason, adminId);
  return ok(res, result, "Refund rejected");
});

/**
 * Process refund to payment method (admin)
 */
const processRefund = asyncHandler(async (req, res) => {
  const { refundId } = req.params;
  const adminId = req.user.sub;

  const result = await campaignRefundService.processRefundToPaymentMethod(refundId, adminId);
  return ok(res, result, "Refund processed");
});

/**
 * Get refund statistics (admin)
 */
const getRefundStats = asyncHandler(async (req, res) => {
  const filters = {
    vendorId: req.query.vendorId,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  };

  const result = await campaignRefundService.getRefundStatistics(filters);
  return ok(res, result, "Refund statistics loaded");
});

/**
 * List payment orders (admin/vendor)
 */
const listPaymentOrders = asyncHandler(async (req, res) => {
  const filters = {
    vendorId: req.query.vendorId || (req.user.role === "vendor" ? req.vendor?._id : null),
    campaignId: req.query.campaignId,
    status: req.query.status,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    limit: parseInt(req.query.limit) || 20,
    skip: parseInt(req.query.skip) || 0,
  };

  const result = await campaignPaymentService.listPaymentOrders(filters);
  return ok(res, result, "Payment orders loaded");
});

/**
 * Calculate campaign cost (for preview)
 */
const calculateCost = asyncHandler(async (req, res) => {
  const { campaignId } = req.params;

  const result = await campaignEscrowService.calculateCampaignCost(campaignId, req.vendor._id);
  return ok(res, result, "Campaign cost calculated");
});

const listReleaseQueue = asyncHandler(async (req, res) => {
  const result = await campaignEscrowService.listAdminReleaseQueue({
    campaignId: req.query.campaignId,
    vendorId: req.query.vendorId,
  });
  return ok(res, result, "Approved deliverables awaiting release loaded");
});

const listEscrowRefundDashboard = asyncHandler(async (req, res) => {
  const result = await campaignRefundService.getAdminEscrowRefundDashboard({
    status: req.query.status,
    vendorId: req.query.vendorId,
    limit: parseInt(req.query.limit) || 50,
    skip: parseInt(req.query.skip) || 0,
  });
  return ok(res, result, "Escrow refund dashboard loaded");
});

const listEscrowRefundDeliverables = asyncHandler(async (req, res) => {
  const result = await campaignRefundService.getAdminEscrowRefundDeliverables(req.params.campaignId);
  return ok(res, result, "Deliverable refund details loaded");
});

const refundDeliverableEscrow = asyncHandler(async (req, res) => {
  const result = await campaignRefundService.refundDeliverableEscrow(
    req.params.campaignId,
    req.params.deliverableId,
    req.body,
    req.user.sub
  );
  return ok(res, result, "Deliverable refund processed");
});

const createAdminRefund = asyncHandler(async (req, res) => {
  const result = await campaignRefundService.createAdminRefund(
    req.params.campaignId,
    req.body,
    req.user.sub
  );
  return ok(res, result, "Escrow refund request created", 201);
});

const approveAndProcessRefund = asyncHandler(async (req, res) => {
  const result = await campaignRefundService.approveAndProcessRefund(
    req.params.refundId,
    req.body,
    req.user.sub
  );
  return ok(res, result, "Refund approved and processed");
});

const listFeeConfigurations = asyncHandler(async (req, res) => {
  return ok(res, await campaignFeeService.listConfigurations(), "Campaign fee configurations loaded");
});

const createFeeConfiguration = asyncHandler(async (req, res) => {
  return ok(
    res,
    await campaignFeeService.createConfiguration(req.body, req.user.sub),
    "Campaign fee configuration created"
  );
});

const updateFeeConfiguration = asyncHandler(async (req, res) => {
  return ok(
    res,
    await campaignFeeService.updateConfiguration(req.params.configId, req.body, req.user.sub),
    "Campaign fee configuration updated"
  );
});

const deleteFeeConfiguration = asyncHandler(async (req, res) => {
  return ok(
    res,
    await campaignFeeService.deleteConfiguration(req.params.configId, req.user.sub),
    "Campaign fee configuration deleted"
  );
});

module.exports = {
  // Vendor endpoints
  createPaymentOrder,
  verifyPayment,
  getPaymentDetails,
  getEscrowSummary,
  releasePayment,
  checkRefundEligibility,
  getRefundDetails,
  calculateCost,
  listPaymentOrders,

  // Admin endpoints
  listRefundRequests,
  listEscrowRefundDashboard,
  listEscrowRefundDeliverables,
  refundDeliverableEscrow,
  listReleaseQueue,
  createAdminRefund,
  approveRefund,
  approveAndProcessRefund,
  rejectRefund,
  processRefund,
  getRefundStats,
  listFeeConfigurations,
  createFeeConfiguration,
  updateFeeConfiguration,
  deleteFeeConfiguration,
};
