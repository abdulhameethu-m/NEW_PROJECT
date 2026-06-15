const Razorpay = require("razorpay");
const CampaignPaymentOrder = require("../models/CampaignPaymentOrder");
const CampaignEscrowWallet = require("../models/CampaignEscrowWallet");
const { Campaign, CampaignInvitation } = require("../modules/campaign/model");
const { InfluencerProfile } = require("../modules/influencer/model");
const campaignEscrowService = require("./campaign-escrow.service");
const auditService = require("./audit.service");
const notificationService = require("./notification.service");
const { ApiError } = require("../utils/ApiError");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

/**
 * Campaign Payment Service
 * Handles Razorpay integration for fixed payment campaigns
 */
class CampaignPaymentService {
  /**
   * Create Razorpay order for campaign funding
   */
  async createRazorpayOrder(campaignId, vendorId, userId) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new ApiError(503, "Payment gateway is not configured");
    }
    const reusableOrder = await CampaignPaymentOrder.findOne({
      campaignId,
      vendorId,
      status: "pending",
      razorpayOrderId: { $exists: true, $ne: "" },
    }).lean();
    if (reusableOrder) {
      return {
        campaignId,
        orderId: reusableOrder.razorpayOrderId,
        amount: reusableOrder.totalAmount,
        amountInPaise: reusableOrder.totalAmount * 100,
        currency: reusableOrder.currency,
        budgetBreakdown: {
          budgetAmount: reusableOrder.budgetAmount,
          platformFeeAmount: reusableOrder.platformFeeAmount,
          gatewayFeeAmount: reusableOrder.gatewayFeeAmount,
          taxAmount: reusableOrder.taxAmount,
        },
        paymentOrderId: reusableOrder._id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        notes: {},
        resumed: true,
      };
    }

    const costDetails = await campaignEscrowService.calculateCampaignCost(campaignId, vendorId);

    // Create payment order record
    const paymentOrderData = await campaignEscrowService.createPaymentOrder(campaignId, vendorId, userId);

    try {
      // Create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
        amount: costDetails.totalAmount * 100, // Amount in paise
        currency: costDetails.currency,
        receipt: `campaign_${campaignId}_${Date.now()}`,
        notes: {
          campaignId: campaignId.toString(),
          vendorId: vendorId.toString(),
          paymentOrderId: paymentOrderData.paymentOrderId.toString(),
          paymentType: "fixed_campaign",
        },
      });
      await CampaignPaymentOrder.findByIdAndUpdate(paymentOrderData.paymentOrderId, {
        $set: {
          razorpayOrderId: razorpayOrder.id,
          initiatedAt: new Date(),
          notes: JSON.stringify(razorpayOrder.notes || {}),
        },
      });
      await auditService.log({
        actor: { _id: userId, role: "vendor" },
        action: "campaign.payment.initiated",
        entityType: "CampaignPaymentOrder",
        entityId: paymentOrderData.paymentOrderId,
        metadata: { campaignId, vendorId, razorpayOrderId: razorpayOrder.id, amount: costDetails.totalAmount },
      }).catch(() => {});

      return {
        campaignId,
        orderId: razorpayOrder.id,
        amount: costDetails.totalAmount,
        amountInPaise: costDetails.totalAmount * 100,
        currency: costDetails.currency,
        budgetBreakdown: {
          budgetAmount: costDetails.budgetAmount,
          platformFeeAmount: costDetails.platformFeeAmount,
          gatewayFeeAmount: costDetails.gatewayFeeAmount,
          taxAmount: costDetails.taxAmount,
        },
        paymentOrderId: paymentOrderData.paymentOrderId,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        notes: razorpayOrder.notes,
      };
    } catch (error) {
      // Mark payment order as failed
      const paymentOrder = await CampaignPaymentOrder.findById(paymentOrderData.paymentOrderId);
      if (paymentOrder) {
        paymentOrder.status = "failed";
        paymentOrder.failureReason = error.message;
        paymentOrder.failureCode = error.code || "RAZORPAY_ERROR";
        await paymentOrder.save();
      }

      throw new ApiError(500, `Failed to create Razorpay order: ${error.message}`);
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

    const gatewayPayment = await razorpay.payments.fetch(razorpayPaymentId);
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

    // Get payment order to find campaign
    const campaignId = paymentOrder.campaignId;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new ApiError(404, "Campaign not found");
    if (campaign.paymentType !== "fixed") {
      throw new ApiError(400, "Campaign is not a fixed payment campaign");
    }
    const nextState = campaign.influencerId ? "invitation_sent" : "active";
    if (campaign.state === "draft") {
      campaign.state = nextState;
      campaign.history = campaign.history || [];
      campaign.history.push({
        action: "campaign_activated_after_payment",
        state: nextState,
        actorId,
        timestamp: new Date(),
        details: {
          paymentOrderId,
          razorpayOrderId,
        },
      });
      await campaign.save();
    }

    if (campaign.influencerId) {
      await this.createCampaignInvitation(campaignId, vendorId, campaign.influencerId);
      const influencer = await InfluencerProfile.findById(campaign.influencerId).select("userId").lean();
      if (influencer?.userId) {
        await notificationService.createNotification({
          userId: influencer.userId,
          role: "INFLUENCER",
          module: "GROWTH",
          subModule: "INFLUENCER_COMMERCE",
          type: "INFLUENCER_COMMERCE",
          title: "Campaign invitation",
          message: `A funded fixed-payment campaign is ready for your review: ${campaign.title || "Campaign"}.`,
          referenceId: campaign._id,
          meta: { campaignId: String(campaign._id), vendorId: String(vendorId), escrowFunded: true },
        }).catch(() => null);
      }
    }

    return {
      ...verificationResult,
      campaignId,
      campaignStatus: nextState,
      invitationCreated: !!campaign.influencerId,
    };
  }

  /**
   * Create campaign invitation after payment
   */
  async createCampaignInvitation(campaignId, vendorId, influencerId) {
    return CampaignInvitation.findOneAndUpdate(
      { campaignId, influencerId },
      {
        $setOnInsert: { campaignId, vendorId, influencerId, invitedAt: new Date() },
        $set: {
          status: "invitation_sent",
          metadata: { sentAfterPayment: true, paymentType: "fixed" },
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
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

module.exports = new CampaignPaymentService();
