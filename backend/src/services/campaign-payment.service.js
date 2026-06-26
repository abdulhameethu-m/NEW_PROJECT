const Razorpay = require("razorpay");
const crypto = require("crypto");
const CampaignPaymentOrder = require("../models/CampaignPaymentOrder");
const CampaignEscrowWallet = require("../models/CampaignEscrowWallet");
const { Campaign, CampaignAcceptance } = require("../modules/campaign/model");
const { InfluencerProfile } = require("../modules/influencer/model");
const campaignEscrowService = require("./campaign-escrow.service");
const auditService = require("./audit.service");
const notificationService = require("./notification.service");
const { ApiError } = require("../utils/ApiError");

const GATEWAY_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.CAMPAIGN_RAZORPAY_TIMEOUT_MS) || 6500, 3000),
  15000
);
const GATEWAY_LOCK_MS = Math.max(GATEWAY_TIMEOUT_MS * 3, 30000);
const AMBIGUOUS_RETRY_DELAY_MS = Math.min(
  Math.max(Number(process.env.CAMPAIGN_RAZORPAY_RETRY_DELAY_MS) || 5 * 60 * 1000, 30000),
  30 * 60 * 1000
);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});
if (razorpay?.api?.rq?.defaults) {
  razorpay.api.rq.defaults.timeout = GATEWAY_TIMEOUT_MS + 500;
}

function hasUsableRazorpayCredentials() {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  const placeholder = /^(your_|change|replace|dummy|example)/i;
  return /^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId)
    && keySecret.length >= 16
    && !placeholder.test(keySecret);
}

function withGatewayTimeout(promise, operation) {
  let timer;
  const timeoutError = new Error(`Razorpay ${operation} timed out`);
  timeoutError.code = "RAZORPAY_TIMEOUT";
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(timeoutError), GATEWAY_TIMEOUT_MS);
    }),
  ]).finally(() => clearTimeout(timer));
}

function buildRazorpayReceipt(paymentOrderId) {
  return `campaign_${String(paymentOrderId)}`;
}

function gatewayErrorDetails(error) {
  const gatewayError = error?.error || error?.response?.data?.error || {};
  return {
    code: String(gatewayError.code || error?.code || "RAZORPAY_ERROR"),
    message: String(gatewayError.description || gatewayError.message || error?.message || "Razorpay request failed"),
    statusCode: Number(error?.statusCode || error?.response?.status || 0),
  };
}

function isAmbiguousGatewayError(error) {
  const { code, statusCode } = gatewayErrorDetails(error);
  return (
    code === "RAZORPAY_TIMEOUT" ||
    code === "ECONNABORTED" ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "ENOTFOUND" ||
    statusCode === 0 ||
    statusCode >= 500
  );
}

function validateGatewayOrder(order, paymentOrder) {
  const expectedAmount = Math.round(Number(paymentOrder.totalAmount) * 100);
  if (
    !order?.id ||
    !String(order.id).startsWith("order_") ||
    Number(order.amount) !== expectedAmount ||
    String(order.currency || "").toUpperCase() !== String(paymentOrder.currency || "INR").toUpperCase() ||
    String(order.receipt || "") !== String(paymentOrder.razorpayReceipt || "")
  ) {
    throw new ApiError(
      502,
      "Razorpay returned an order that does not match the campaign payment request",
      "RAZORPAY_ORDER_MISMATCH"
    );
  }
  return order;
}

function paymentOrderResponse(paymentOrder, { resumed = false, reconciled = false } = {}) {
  return {
    campaignId: paymentOrder.campaignId,
    orderId: paymentOrder.razorpayOrderId,
    amount: paymentOrder.totalAmount,
    amountInPaise: Math.round(Number(paymentOrder.totalAmount) * 100),
    currency: paymentOrder.currency,
    budgetBreakdown: {
      budgetAmount: paymentOrder.budgetAmount,
      platformFeeAmount: paymentOrder.platformFeeAmount,
      gatewayFeeAmount: paymentOrder.gatewayFeeAmount,
      taxAmount: paymentOrder.taxAmount,
    },
    escrowAmount: paymentOrder.escrowAmount,
    feeLines: paymentOrder.feeConfigurationSnapshot,
    paymentOrderId: paymentOrder._id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    notes: {},
    resumed,
    reconciled,
  };
}

/**
 * Campaign Payment Service
 * Handles Razorpay integration for every campaign model with an escrowed fixed reward.
 */
class CampaignPaymentService {
  /**
   * Create Razorpay order for campaign funding
   */
  async createRazorpayOrder(campaignId, vendorId, userId) {
    if (!hasUsableRazorpayCredentials()) {
      throw new ApiError(
        503,
        "Razorpay credentials are missing or placeholders. Configure a valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
      );
    }
    const campaign = await Campaign.findOne({ _id: campaignId, vendorId, paymentType: { $in: ["fixed", "hybrid"] } })
      .select("state paymentType fixedPaymentWorkflow")
      .lean();
    if (!campaign) {
      throw new ApiError(404, "Fixed-reward campaign not found for this vendor");
    }
    const acceptance = await CampaignAcceptance.findOne({
      campaignId,
      influencerId: { $exists: true },
      status: "accepted",
    }).select("_id").lean();
    if (
      !acceptance ||
      campaign.state !== "accepted" ||
      !["accepted_awaiting_funding", "funding_pending"].includes(campaign.fixedPaymentWorkflow?.status)
    ) {
      throw new ApiError(
        409,
        "The influencer must accept this campaign before payment can begin",
        "CAMPAIGN_ACCEPTANCE_REQUIRED"
      );
    }
    let paymentOrder = await CampaignPaymentOrder.findOne({ campaignId, vendorId });
    if (paymentOrder?.razorpayOrderId && paymentOrder.status === "pending") {
      return paymentOrderResponse(paymentOrder, { resumed: true });
    }
    if (paymentOrder && ["authorized", "paid"].includes(paymentOrder.status)) {
      throw new ApiError(409, "This campaign payment has already been submitted", "CAMPAIGN_PAYMENT_EXISTS");
    }
    if (["RAZORPAY_ORDER_MISMATCH", "DUPLICATE_RAZORPAY_ORDERS"].includes(paymentOrder?.failureCode)) {
      throw new ApiError(
        409,
        "This campaign payment is locked for gateway reconciliation. Contact support before retrying.",
        paymentOrder.failureCode
      );
    }
    if (!paymentOrder || paymentOrder.status === "failed") {
      const paymentOrderData = await campaignEscrowService.createPaymentOrder(campaignId, vendorId, userId);
      paymentOrder = await CampaignPaymentOrder.findById(paymentOrderData.paymentOrderId);
    }
    if (!paymentOrder) {
      throw new ApiError(500, "Campaign payment order could not be initialized", "PAYMENT_ORDER_INIT_FAILED");
    }

    const receipt = paymentOrder.razorpayReceipt || buildRazorpayReceipt(paymentOrder._id);
    if (!paymentOrder.razorpayReceipt) {
      paymentOrder.razorpayReceipt = receipt;
      await paymentOrder.save();
    }

    const reconcileByReceipt = async () => {
      const result = await withGatewayTimeout(
        razorpay.orders.all({ receipt, count: 10 }),
        "order reconciliation"
      );
      const matchingOrders = Array.isArray(result?.items)
        ? result.items.filter((order) => String(order.receipt || "") === receipt)
        : [];
      if (matchingOrders.length > 1) {
        throw new ApiError(
          409,
          "Multiple Razorpay orders were found for this campaign. Payment is locked for manual review.",
          "DUPLICATE_RAZORPAY_ORDERS"
        );
      }
      return matchingOrders[0] || null;
    };

    try {
      if (paymentOrder.failureCode === "RAZORPAY_STATUS_UNKNOWN" || paymentOrder.gatewayStatusUnknownAt) {
        const reconciledOrder = await reconcileByReceipt();
        if (reconciledOrder) {
          validateGatewayOrder(reconciledOrder, paymentOrder);
          paymentOrder.razorpayOrderId = reconciledOrder.id;
          paymentOrder.failureCode = "";
          paymentOrder.failureReason = "";
          paymentOrder.gatewayStatusUnknownAt = undefined;
          paymentOrder.orderCreationLock = "";
          paymentOrder.orderCreationLockExpiresAt = undefined;
          await paymentOrder.save();
          return paymentOrderResponse(paymentOrder, { resumed: true, reconciled: true });
        }
        const retryAt = new Date(paymentOrder.gatewayStatusUnknownAt).getTime() + AMBIGUOUS_RETRY_DELAY_MS;
        if (Date.now() < retryAt) {
          throw new ApiError(
            503,
            "Razorpay is still confirming the previous order request. Retry shortly; no new order was created.",
            "RAZORPAY_RECONCILIATION_PENDING",
            { retryAfterMs: retryAt - Date.now(), paymentOrderId: String(paymentOrder._id) }
          );
        }
      }

      const lockToken = crypto.randomUUID();
      const now = new Date();
      const lockedOrder = await CampaignPaymentOrder.findOneAndUpdate(
        {
          _id: paymentOrder._id,
          status: "pending",
          $and: [
            {
              $or: [
                { orderCreationLock: "" },
                { orderCreationLock: { $exists: false } },
                { orderCreationLockExpiresAt: { $lte: now } },
              ],
            },
            {
              $or: [
                { razorpayOrderId: { $exists: false } },
                { razorpayOrderId: "" },
                { razorpayOrderId: null },
              ],
            },
          ],
        },
        {
          $set: {
            razorpayReceipt: receipt,
            orderCreationLock: lockToken,
            orderCreationLockExpiresAt: new Date(Date.now() + GATEWAY_LOCK_MS),
            lastRetryAt: now,
          },
          $inc: { retryCount: 1 },
        },
        { returnDocument: "after" }
      );
      if (!lockedOrder) {
        const current = await CampaignPaymentOrder.findById(paymentOrder._id);
        if (current?.razorpayOrderId) return paymentOrderResponse(current, { resumed: true });
        throw new ApiError(
          409,
          "A payment order request is already in progress. Retry shortly.",
          "PAYMENT_ORDER_IN_PROGRESS"
        );
      }
      paymentOrder = lockedOrder;

      const razorpayOrder = await withGatewayTimeout(razorpay.orders.create({
        amount: Math.round(Number(paymentOrder.totalAmount) * 100),
        currency: paymentOrder.currency,
        receipt,
        notes: {
          campaignId: campaignId.toString(),
          vendorId: vendorId.toString(),
          paymentOrderId: paymentOrder._id.toString(),
          paymentType: "fixed_campaign",
        },
      }), "order creation");
      validateGatewayOrder(razorpayOrder, paymentOrder);
      paymentOrder = await CampaignPaymentOrder.findByIdAndUpdate(paymentOrder._id, {
        $set: {
          razorpayOrderId: razorpayOrder.id,
          initiatedAt: new Date(),
          notes: JSON.stringify(razorpayOrder.notes || {}),
          failureReason: "",
          failureCode: "",
          gatewayStatusUnknownAt: undefined,
          orderCreationLock: "",
          orderCreationLockExpiresAt: undefined,
        },
      }, { returnDocument: "after" });
      await auditService.log({
        actor: { _id: userId, role: "vendor" },
        action: "campaign.payment.initiated",
        entityType: "CampaignPaymentOrder",
        entityId: paymentOrder._id,
        metadata: { campaignId, vendorId, razorpayOrderId: razorpayOrder.id, amount: paymentOrder.totalAmount, receipt },
      }).catch(() => {});

      return { ...paymentOrderResponse(paymentOrder), notes: razorpayOrder.notes };
    } catch (error) {
      if (error instanceof ApiError) {
        const requiresManualReview = ["RAZORPAY_ORDER_MISMATCH", "DUPLICATE_RAZORPAY_ORDERS"].includes(error.code);
        await CampaignPaymentOrder.findByIdAndUpdate(paymentOrder._id, {
          $set: {
            ...(requiresManualReview
              ? {
                  status: "pending",
                  failureReason: error.message,
                  failureCode: error.code,
                }
              : {}),
            orderCreationLock: "",
            orderCreationLockExpiresAt: undefined,
          },
        }).catch(() => {});
        throw error;
      }

      const details = gatewayErrorDetails(error);
      if (isAmbiguousGatewayError(error)) {
        await CampaignPaymentOrder.findByIdAndUpdate(paymentOrder._id, {
          $set: {
            status: "pending",
            failureReason: details.message,
            failureCode: "RAZORPAY_STATUS_UNKNOWN",
            gatewayStatusUnknownAt: paymentOrder.gatewayStatusUnknownAt || new Date(),
            orderCreationLock: "",
            orderCreationLockExpiresAt: undefined,
          },
        });
        throw new ApiError(
          504,
          "Razorpay did not confirm the order in time. The attempt is being reconciled and no duplicate order will be created.",
          "RAZORPAY_STATUS_UNKNOWN",
          { paymentOrderId: String(paymentOrder._id), retryable: true }
        );
      }

      await CampaignPaymentOrder.findByIdAndUpdate(paymentOrder._id, {
        $set: {
          status: "failed",
          failureReason: details.message,
          failureCode: details.code,
          failedAt: new Date(),
          orderCreationLock: "",
          orderCreationLockExpiresAt: undefined,
        },
      });
      throw new ApiError(
        details.statusCode >= 400 && details.statusCode < 500 ? 502 : 503,
        `Razorpay rejected the payment order: ${details.message}`,
        "RAZORPAY_ORDER_FAILED"
      );
    }
  }

  /**
   * Verify payment and activate campaign
   */
  async verifyPaymentAndActivateCampaign(paymentOrderId, vendorId, actorId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    const paymentOrder = await CampaignPaymentOrder.findById(paymentOrderId);
    if (!paymentOrder) throw new ApiError(404, "Payment order not found");
    if (String(paymentOrder.vendorId) !== String(vendorId)) {
      throw new ApiError(403, "Payment order does not belong to this vendor");
    }

    const gatewayPayment = await withGatewayTimeout(
      razorpay.payments.fetch(razorpayPaymentId),
      "payment verification"
    );
    if (
      gatewayPayment.order_id !== razorpayOrderId ||
      Number(gatewayPayment.amount) !== Math.round(Number(paymentOrder.totalAmount) * 100) ||
      String(gatewayPayment.currency || "").toUpperCase() !== String(paymentOrder.currency || "").toUpperCase() ||
      gatewayPayment.status !== "captured"
    ) {
      throw new ApiError(400, "Razorpay payment details do not match the campaign order");
    }

    // Verify payment
    const verificationResult = await campaignEscrowService.verifyPaymentSignature(
      paymentOrderId,
      vendorId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );
    const fundingResult = await this.processCapturedCampaignPayment(
      gatewayPayment,
      `checkout-verified:${razorpayPaymentId}`
    );

    return {
      ...verificationResult,
      ...fundingResult,
      campaignId: paymentOrder.campaignId,
      campaignStatus: fundingResult?.campaignStatus || "payment_processing",
      invitationCreated: false,
    };
  }

  async processCapturedCampaignPayment(paymentEntity, eventId) {
    const paymentOrder = await CampaignPaymentOrder.findOne({ razorpayOrderId: paymentEntity?.order_id });
    if (!paymentOrder) return null;
    if (paymentOrder.status === "paid") {
      const escrow = await campaignEscrowService.createEscrowWallet(paymentOrder, eventId);
      const activation = await this.activateFundedCampaign(paymentOrder, escrow);
      return {
        paymentOrderId: paymentOrder._id,
        campaignId: paymentOrder.campaignId,
        escrowId: escrow._id,
        idempotent: true,
        ...activation,
      };
    }
    if (String(paymentEntity?.status || "").toLowerCase() !== "captured") {
      throw new ApiError(409, "Campaign payment webhook is not captured");
    }
    if (Number(paymentEntity.amount) !== Math.round(Number(paymentOrder.totalAmount) * 100)) {
      throw new ApiError(409, "Campaign payment webhook amount mismatch");
    }
    if (String(paymentEntity.currency || "").toUpperCase() !== String(paymentOrder.currency || "INR").toUpperCase()) {
      throw new ApiError(409, "Campaign payment webhook currency mismatch");
    }
    if (
      process.env.RAZORPAY_ACCOUNT_ID &&
      paymentEntity.account_id &&
      String(paymentEntity.account_id) !== String(process.env.RAZORPAY_ACCOUNT_ID)
    ) {
      throw new ApiError(409, "Campaign payment merchant account mismatch");
    }
    paymentOrder.razorpayPaymentId = paymentEntity.id;
    paymentOrder.status = "paid";
    paymentOrder.paidAt = new Date();
    paymentOrder.signatureVerified = true;
    paymentOrder.signatureVerifiedAt = new Date();
    paymentOrder.webhookEventId = eventId;
    paymentOrder.verificationDetails = {
      ...(paymentOrder.verificationDetails || {}),
      webhookEventId: eventId,
      webhookVerifiedAt: new Date(),
      gatewayStatus: paymentEntity.status,
    };
    await paymentOrder.save();

    const escrow = await campaignEscrowService.createEscrowWallet(paymentOrder, eventId);
    const activation = await this.activateFundedCampaign(paymentOrder, escrow);
    await auditService.log({
      actor: { role: "system" },
      action: "campaign.payment.webhook_verified",
      entityType: "CampaignPaymentOrder",
      entityId: paymentOrder._id,
      metadata: { campaignId: paymentOrder.campaignId, eventId, razorpayPaymentId: paymentEntity.id },
    }).catch(() => {});
    return { paymentOrderId: paymentOrder._id, campaignId: paymentOrder.campaignId, escrowId: escrow._id, ...activation };
  }

  async activateFundedCampaign(paymentOrder, escrow) {
    const campaignId = paymentOrder.campaignId;
    const vendorId = paymentOrder.vendorId;
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new ApiError(404, "Campaign not found");
    if (!["fixed", "hybrid"].includes(campaign.paymentType)) {
      throw new ApiError(400, "Campaign has no fixed reward escrow");
    }
    if (!campaign.influencerId || !["accepted", "active"].includes(campaign.state)) {
      throw new ApiError(409, "A funded campaign must have an accepted influencer invitation");
    }
    if (
      campaign.state === "active" &&
      campaign.fixedPaymentWorkflow?.contentEnabled &&
      ["funded", "content_in_progress", "vendor_approved", "partially_released", "fully_released"].includes(
        campaign.fixedPaymentWorkflow?.status
      )
    ) {
      return {
        campaignId,
        campaignStatus: "active",
        contentEnabled: true,
        invitationCreated: false,
        idempotent: true,
      };
    }

    campaign.state = "active";
    campaign.fixedPaymentWorkflow = {
      ...(campaign.fixedPaymentWorkflow?.toObject?.() || campaign.fixedPaymentWorkflow || {}),
      status: "funded",
      contentEnabled: true,
      fundedAt: campaign.fixedPaymentWorkflow?.fundedAt || new Date(),
      lastTransitionAt: new Date(),
    };
    if (campaign.paymentType === "hybrid") {
      campaign.commissionWorkflow = {
        ...(campaign.commissionWorkflow?.toObject?.() || campaign.commissionWorkflow || {}),
        contentEnabled: true,
        publishEnabled: false,
        trackingActive: false,
      };
    }
    campaign.history = campaign.history || [];
    campaign.history.push({
      action: "campaign_activated_after_payment",
      state: "active",
      actorId: null,
      timestamp: new Date(),
      details: {
        paymentOrderId: paymentOrder._id,
        razorpayOrderId: paymentOrder.razorpayOrderId,
        escrowId: escrow._id,
      },
    });
    await campaign.save();

    const influencer = await InfluencerProfile.findById(campaign.influencerId).select("userId").lean();
    if (influencer?.userId) {
      await notificationService.createNotification({
        userId: influencer.userId,
        role: "INFLUENCER",
        module: "GROWTH",
        subModule: "INFLUENCER_COMMERCE",
        type: "INFLUENCER_COMMERCE",
        title: "Campaign funded",
        message: `Escrow is funded for ${campaign.title || "Campaign"}. You can now create and submit content.`,
        referenceId: campaign._id,
        meta: { campaignId: String(campaign._id), vendorId: String(vendorId), escrowFunded: true },
      }).catch(() => null);
    }
    await notificationService.notifyVendorUser(vendorId, {
      module: "FINANCE",
      subModule: "INFLUENCER_COMMERCE",
      type: "INFLUENCER_COMMERCE",
      title: "Campaign funded",
      message: `${campaign.title || "Campaign"} is funded and INR ${escrow.amountFunded} is secured in escrow.`,
      referenceId: campaign._id,
      meta: { campaignId: String(campaign._id), escrowId: String(escrow._id) },
    }).catch(() => null);
    return {
      campaignId,
      campaignStatus: "active",
      contentEnabled: true,
      invitationCreated: false,
    };
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(paymentOrderId, vendorId = null) {
    const paymentOrder = await CampaignPaymentOrder.findById(paymentOrderId);
    if (!paymentOrder) {
      throw new ApiError(404, "Payment order not found");
    }
    if (vendorId && String(paymentOrder.vendorId) !== String(vendorId)) {
      throw new ApiError(403, "Payment order does not belong to this vendor");
    }

    const escrow = await CampaignEscrowWallet.findOne({
      paymentOrderId: paymentOrder._id,
    });

    return {
      paymentOrderId: paymentOrder._id,
      campaignId: paymentOrder.campaignId,
      vendorId: paymentOrder.vendorId,
      razorpayOrderId: paymentOrder.razorpayOrderId,
      razorpayPaymentId: paymentOrder.razorpayPaymentId,
      budgetAmount: paymentOrder.budgetAmount,
      platformFeeAmount: paymentOrder.platformFeeAmount,
      gatewayFeeAmount: paymentOrder.gatewayFeeAmount,
      taxAmount: paymentOrder.taxAmount,
      totalAmount: paymentOrder.totalAmount,
      escrowAmount: paymentOrder.escrowAmount,
      feeLines: paymentOrder.feeConfigurationSnapshot,
      status: paymentOrder.status,
      paymentMethod: paymentOrder.paymentMethod,
      currency: paymentOrder.currency,
      initiatedAt: paymentOrder.initiatedAt,
      paidAt: paymentOrder.paidAt,
      escrowStatus: escrow?.status,
      escrowId: escrow?._id,
    };
  }

  /**
   * List payment orders with filters
   */
  async listPaymentOrders(filters = {}) {
    const {
      vendorId,
      campaignId,
      status,
      startDate,
      endDate,
      limit = 20,
      skip = 0,
    } = filters;

    const query = {};

    if (vendorId) query.vendorId = vendorId;
    if (campaignId) query.campaignId = campaignId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [orderDocs, total] = await Promise.all([
      CampaignPaymentOrder.find(query)
        .populate("campaignId", "title state influencerId")
        .populate("vendorId", "shopName companyName")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      CampaignPaymentOrder.countDocuments(query),
    ]);
    const escrowRows = orderDocs.length
      ? await CampaignEscrowWallet.find({ paymentOrderId: { $in: orderDocs.map((row) => row._id) } }).lean()
      : [];
    const escrowByPayment = new Map(escrowRows.map((row) => [String(row.paymentOrderId), row]));
    const orders = orderDocs.map((row) => ({ ...row, escrow: escrowByPayment.get(String(row._id)) || null }));

    return {
      orders,
      total,
      limit,
      skip,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Retry failed payment
   */
  async retryFailedPayment(paymentOrderId) {
    const paymentOrder = await CampaignPaymentOrder.findById(paymentOrderId);
    if (!paymentOrder) {
      throw new ApiError(404, "Payment order not found");
    }

    if (paymentOrder.status !== "failed") {
      throw new ApiError(400, "Only failed payments can be retried");
    }

    if (paymentOrder.retryCount >= 3) {
      throw new ApiError(400, "Maximum retry attempts exceeded");
    }

    // Reset for retry
    paymentOrder.status = "pending";
    paymentOrder.failureReason = "";
    paymentOrder.failureCode = "";
    paymentOrder.retryCount += 1;
    paymentOrder.lastRetryAt = new Date();

    await paymentOrder.save();

    return {
      paymentOrderId: paymentOrder._id,
      status: "pending",
      retryCount: paymentOrder.retryCount,
      message: "Payment retry initiated",
    };
  }
}

const campaignPaymentService = new CampaignPaymentService();

campaignPaymentService.__testHelpers = {
  buildRazorpayReceipt,
  gatewayErrorDetails,
  isAmbiguousGatewayError,
  validateGatewayOrder,
};

module.exports = campaignPaymentService;
