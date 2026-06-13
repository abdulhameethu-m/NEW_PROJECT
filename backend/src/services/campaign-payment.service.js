const Razorpay = require("razorpay");
const CampaignPaymentOrder = require("../models/CampaignPaymentOrder");
const CampaignEscrowWallet = require("../models/CampaignEscrowWallet");
const Campaign = require("../modules/campaign/model");
const campaignEscrowService = require("./campaign-escrow.service");
const { ApiError } = require("../utils/ApiError");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_SECRET || "",
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
    // Calculate cost
    const costDetails = await campaignEscrowService.calculateCampaignCost(campaignId);

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

      return {
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
  async verifyPaymentAndActivateCampaign(paymentOrderId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    // Verify payment
    const verificationResult = await campaignEscrowService.verifyPaymentSignature(
      paymentOrderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    // Get payment order to find campaign
    const paymentOrder = await CampaignPaymentOrder.findById(paymentOrderId);
    const campaignId = paymentOrder.campaignId;
    const vendorId = paymentOrder.vendorId;

    // Update campaign status to "active" (state: "active")
    const campaign = await Campaign.findById(campaignId);
    if (campaign) {
      campaign.state = "active";
      campaign.history = campaign.history || [];
      campaign.history.push({
        action: "campaign_activated_after_payment",
        timestamp: new Date(),
        details: {
          paymentOrderId,
          razorpayOrderId,
        },
      });
      await campaign.save();
    }

    // Create invitation for the influencer (if direct invitation, not marketplace)
    if (campaign.influencerId) {
      await this.createCampaignInvitation(campaignId, vendorId, campaign.influencerId);
    }

    return {
      ...verificationResult,
      campaignId,
      campaignStatus: "active",
      invitationCreated: !!campaign.influencerId,
    };
  }

  /**
   * Create campaign invitation after payment
   */
  async createCampaignInvitation(campaignId, vendorId, influencerId) {
    const CampaignInvitation = require("../campaign/model").CampaignInvitation;

    const invitation = new CampaignInvitation({
      campaignId,
      vendorId,
      influencerId,
      status: "invitation_sent",
      invitedAt: new Date(),
      metadata: {
        sentAfterPayment: true,
        paymentType: "fixed",
      },
    });

    await invitation.save();
    return invitation;
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(paymentOrderId) {
    const paymentOrder = await CampaignPaymentOrder.findById(paymentOrderId);
    if (!paymentOrder) {
      throw new ApiError(404, "Payment order not found");
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

    const [orders, total] = await Promise.all([
      CampaignPaymentOrder.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip),
      CampaignPaymentOrder.countDocuments(query),
    ]);

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
