const Razorpay = require("razorpay");
const CampaignRefund = require("../models/CampaignRefund");
const CampaignEscrowWallet = require("../models/CampaignEscrowWallet");
const CampaignPaymentOrder = require("../models/CampaignPaymentOrder");
const CampaignPaymentRelease = require("../models/CampaignPaymentRelease");
const Ledger = require("../models/Ledger");
const Campaign = require("../modules/campaign/model");
const campaignEscrowService = require("./campaign-escrow.service");
const { ApiError } = require("../utils/ApiError");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_SECRET || "",
});

/**
 * Campaign Refund Service
 * Handles refund logic for fixed payment campaigns
 */
class CampaignRefundService {
  /**
   * Request refund (vendor-initiated)
   */
  async requestRefund(campaignId, vendorId, reason, description, requestedBy) {
    // Validate campaign exists
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) {
      throw new ApiError(404, "Campaign not found");
    }

    if (campaign.vendorId.toString() !== vendorId.toString()) {
      throw new ApiError(403, "Campaign does not belong to this vendor");
    }

    if (campaign.paymentType !== "fixed") {
      throw new ApiError(400, "Campaign is not a fixed payment campaign");
    }

    // Create refund via escrow service
    const refund = await campaignEscrowService.refundCampaignBudget(
      campaignId,
      vendorId,
      reason,
      description,
      requestedBy
    );

    return refund;
  }

  /**
   * Get refund requests (for admin dashboard)
   */
  async getRefundRequests(filters = {}) {
    const {
      status,
      reason,
      vendorId,
      startDate,
      endDate,
      limit = 20,
      skip = 0,
    } = filters;

    const query = {};

    if (status) query.status = status;
    if (reason) query.reason = reason;
    if (vendorId) query.vendorId = vendorId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [refunds, total] = await Promise.all([
      CampaignRefund.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate("campaignId", "title")
        .populate("vendorId", "shopName")
        .populate("requestedBy", "email"),
      CampaignRefund.countDocuments(query),
    ]);

    return {
      refunds,
      total,
      limit,
      skip,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get refund details
   */
  async getRefundDetails(refundId) {
    const refund = await CampaignRefund.findById(refundId)
      .populate("campaignId")
      .populate("escrowWalletId")
      .populate("vendorId")
      .populate("requestedBy", "email")
      .populate("approvedBy", "email")
      .lean();

    if (!refund) {
      throw new ApiError(404, "Refund not found");
    }

    return refund;
  }

  /**
   * Approve refund (admin)
   */
  async approveRefund(refundId, approvalReason, approvedBy) {
    const refund = await CampaignRefund.findById(refundId);
    if (!refund) {
      throw new ApiError(404, "Refund not found");
    }

    if (refund.status !== "requested") {
      throw new ApiError(400, `Cannot approve refund in status: ${refund.status}`);
    }

    // Approve via escrow service
    const result = await campaignEscrowService.approveRefund(refundId, approvalReason, approvedBy);

    // Mark for processing
    refund.status = "processing";
    refund.processingStartedAt = new Date();

    refund.auditLog.push({
      action: "refund_processing_started",
      actor: approvedBy,
      actorRole: "admin",
      timestamp: new Date(),
    });

    await refund.save();

    return result;
  }

  /**
   * Reject refund (admin)
   */
  async rejectRefund(refundId, rejectionReason, rejectedBy) {
    const refund = await CampaignRefund.findById(refundId);
    if (!refund) {
      throw new ApiError(404, "Refund not found");
    }

    if (refund.status !== "requested") {
      throw new ApiError(400, `Cannot reject refund in status: ${refund.status}`);
    }

    refund.status = "rejected";
    refund.rejectedBy = rejectedBy;
    refund.rejectionReason = rejectionReason;
    refund.rejectedAt = new Date();

    refund.auditLog.push({
      action: "refund_rejected",
      actor: rejectedBy,
      actorRole: "admin",
      details: { rejectionReason },
    });

    await refund.save();

    return {
      refundId: refund._id,
      status: "rejected",
      message: "Refund request rejected",
    };
  }

  /**
   * Process refund to original payment method (via Razorpay)
   */
  async processRefundToPaymentMethod(refundId, processedBy) {
    const refund = await CampaignRefund.findById(refundId);
    if (!refund) {
      throw new ApiError(404, "Refund not found");
    }

    if (refund.status !== "approved") {
      throw new ApiError(400, `Cannot process refund in status: ${refund.status}`);
    }

    try {
      // Get original payment for refund
      const paymentOrder = await CampaignPaymentOrder.findById(refund.paymentOrderId);
      if (!paymentOrder || !paymentOrder.razorpayPaymentId) {
        throw new ApiError(400, "Original payment not found for refund");
      }

      // Process refund via Razorpay
      const razorpayRefund = await razorpay.payments.refund(
        paymentOrder.razorpayPaymentId,
        {
          amount: refund.totalRefundAmount * 100, // Amount in paise
          notes: {
            campaignId: refund.campaignId.toString(),
            refundId: refund._id.toString(),
            reason: refund.reason,
          },
        }
      );

      // Update refund record
      refund.status = "completed";
      refund.razorpayRefundId = razorpayRefund.id;
      refund.completedAt = new Date();
      refund.transactionId = razorpayRefund.id;

      refund.auditLog.push({
        action: "refund_completed",
        actor: processedBy,
        actorRole: "admin",
        details: {
          razorpayRefundId: razorpayRefund.id,
        },
      });

      await refund.save();

      // Create ledger entry for audit
      const ledgerEntry = new Ledger({
        vendorId: refund.vendorId,
        transactionType: "campaign_refund",
        amount: refund.totalRefundAmount,
        reference: {
          campaignId: refund.campaignId,
          refundId: refund._id,
          razorpayRefundId: razorpayRefund.id,
        },
        description: `Campaign refund for ${refund.reason}`,
        status: "completed",
      });

      await ledgerEntry.save();

      return {
        refundId: refund._id,
        razorpayRefundId: razorpayRefund.id,
        totalRefundAmount: refund.totalRefundAmount,
        status: "completed",
        message: "Refund processed to original payment method",
      };
    } catch (error) {
      throw new ApiError(500, `Failed to process refund: ${error.message}`);
    }
  }

  /**
   * Handle campaign cancellation refund
   */
  async handleCampaignCancellationRefund(campaignId, vendorId, cancellationReason, cancelledBy) {
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) {
      throw new ApiError(404, "Campaign not found");
    }

    if (campaign.paymentType !== "fixed") {
      throw new ApiError(400, "Campaign is not a fixed payment campaign");
    }

    // Get campaign state to determine refund reason
    let refundReason = "other";
    if (campaign.state === "draft") {
      refundReason = "campaign_cancelled_before_acceptance";
    } else if (campaign.state === "active") {
      // Check if any deliverables are completed
      const completedCount = (campaign.deliverables || []).filter(
        (d) => d.status === "approved"
      ).length;

      if (completedCount === 0) {
        refundReason = "campaign_cancelled_no_deliverables";
      } else {
        refundReason = "partial_completion_cancelled";
      }
    }

    // Request refund
    const refundRequest = await this.requestRefund(
      campaignId,
      vendorId,
      refundReason,
      cancellationReason,
      cancelledBy
    );

    // Auto-approve for cancellation scenarios
    if (["campaign_cancelled_before_acceptance", "campaign_cancelled_no_deliverables"].includes(refundReason)) {
      const approved = await this.approveRefund(refundRequest.refundId, "Auto-approved: Campaign cancellation before acceptance", cancelledBy);
      return approved;
    }

    return refundRequest;
  }

  /**
   * Check refund eligibility
   */
  async checkRefundEligibility(campaignId, vendorId) {
    const escrow = await CampaignEscrowWallet.findOne({
      campaignId,
      vendorId,
    }).lean();

    if (!escrow) {
      return {
        eligible: false,
        reason: "No escrow wallet found",
        message: "Campaign has not been funded yet",
      };
    }

    // Check existing refunds
    const existingRefund = await CampaignRefund.findOne({
      campaignId,
      status: { $in: ["requested", "approved", "processing", "completed"] },
    }).lean();

    if (existingRefund) {
      return {
        eligible: false,
        reason: "Refund already exists",
        message: "Campaign already has an active or completed refund",
      };
    }

    // Check if funds available
    if (escrow.amountRemaining === 0 && escrow.status === "fully_released") {
      return {
        eligible: false,
        reason: "No funds available",
        message: "All funds have been released to influencer",
      };
    }

    return {
      eligible: true,
      reason: "Eligible for refund",
      availableAmount: escrow.amountRemaining,
      totalRefundAmount: escrow.amountRemaining + (escrow.platformFeeAmount || 0) + (escrow.gatewayFeeAmount || 0) + (escrow.taxAmount || 0),
    };
  }

  /**
   * Get refund statistics
   */
  async getRefundStatistics(filters = {}) {
    const { vendorId, startDate, endDate } = filters;

    const query = {};
    if (vendorId) query.vendorId = vendorId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const refunds = await CampaignRefund.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalRefundAmount" },
        },
      },
    ]);

    const refundsByReason = await CampaignRefund.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$reason",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalRefundAmount" },
        },
      },
    ]);

    return {
      byStatus: refunds,
      byReason: refundsByReason,
      total: refunds.reduce((sum, r) => sum + r.totalAmount, 0),
    };
  }
}

module.exports = new CampaignRefundService();
