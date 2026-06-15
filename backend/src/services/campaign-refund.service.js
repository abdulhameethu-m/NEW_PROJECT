const Razorpay = require("razorpay");
const CampaignRefund = require("../models/CampaignRefund");
const CampaignEscrowWallet = require("../models/CampaignEscrowWallet");
const CampaignPaymentOrder = require("../models/CampaignPaymentOrder");
const CampaignDeliverableFunding = require("../models/CampaignDeliverableFunding");
const CampaignEscrowLedger = require("../models/CampaignEscrowLedger");
const { Campaign } = require("../modules/campaign/model");
const campaignEscrowService = require("./campaign-escrow.service");
const auditService = require("./audit.service");
const notificationService = require("./notification.service");
const campaignFeeService = require("./campaign-fee.service");
const { ApiError } = require("../utils/ApiError");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
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
  async getRefundDetails(refundId, vendorId = null) {
    const query = { _id: refundId };
    if (vendorId) query.vendorId = vendorId;
    const refund = await CampaignRefund.findOne(query)
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

    let gatewaySucceeded = false;
    try {
      const escrow = await CampaignEscrowWallet.findOne({
        _id: refund.escrowWalletId,
        amountRemaining: { $gte: refund.grossRefundAmount },
        status: { $in: ["funded", "partially_released"] },
      });
      if (!escrow) throw new ApiError(409, "Escrow balance is no longer available for this refund");
      refund.status = "processing";
      refund.processingStartedAt = new Date();
      await refund.save();

      // Get original payment for refund
      const paymentOrder = await CampaignPaymentOrder.findById(refund.paymentOrderId);
      if (!paymentOrder || !paymentOrder.razorpayPaymentId) {
        throw new ApiError(400, "Original payment not found for refund");
      }
      if (Number(refund.totalRefundAmount || 0) <= 0) {
        throw new ApiError(409, "Configured refund fees consume the entire refundable amount");
      }
      const allocationRows = await CampaignDeliverableFunding.find({
        _id: { $in: refund.fundingAllocationIds || [] },
        campaignId: refund.campaignId,
        remainingAmount: { $gt: 0 },
      });
      const allocationGross = allocationRows.reduce((sum, row) => sum + Number(row.remainingAmount || 0), 0);
      if (Number(allocationGross.toFixed(2)) !== Number(refund.grossRefundAmount.toFixed(2))) {
        throw new ApiError(409, "Deliverable funding changed while refund was pending");
      }

      // Process refund via Razorpay
      const razorpayRefund = await razorpay.payments.refund(
        paymentOrder.razorpayPaymentId,
        {
          amount: Math.round(refund.totalRefundAmount * 100),
          notes: {
            campaignId: refund.campaignId.toString(),
            refundId: refund._id.toString(),
            reason: refund.reason,
          },
        }
      );
      gatewaySucceeded = true;

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
      for (const allocation of allocationRows) {
        const amount = Number(allocation.remainingAmount || 0);
        allocation.refundedAmount = Number(allocation.refundedAmount || 0) + amount;
        allocation.remainingAmount = 0;
        allocation.status = "refunded";
        await allocation.save();
      }
      escrow.amountRefunded = Number(escrow.amountRefunded || 0) + refund.grossRefundAmount;
      escrow.amountRemaining = Math.max(0, Number(escrow.amountRemaining || 0) - refund.grossRefundAmount);
      escrow.status = escrow.amountRemaining === 0 ? "refunded" : escrow.status;
      escrow.campaignStatus = "cancelled";
      escrow.refunds.push({
        refundId: refund._id,
        amount: refund.grossRefundAmount,
        reason: refund.reason,
        refundedAt: new Date(),
      });
      escrow.auditLog.push({
        action: "refund_completed",
        actor: processedBy,
        actorRole: "admin",
        details: {
          refundId: refund._id,
          grossAmount: refund.grossRefundAmount,
          paidAmount: refund.totalRefundAmount,
          razorpayRefundId: razorpayRefund.id,
        },
      });
      await escrow.save();
      await CampaignEscrowLedger.create({
        campaignId: refund.campaignId,
        escrowWalletId: escrow._id,
        paymentOrderId: paymentOrder._id,
        refundId: refund._id,
        vendorId: refund.vendorId,
        entryType: "refund",
        direction: "debit",
        amount: refund.grossRefundAmount,
        balanceAfter: escrow.amountRemaining,
        currency: refund.currency,
        idempotencyKey: `campaign-refund:${refund._id}`,
        metadata: {
          vendorRefundAmount: refund.totalRefundAmount,
          processingFeeAmount: refund.processingFeeAmount,
          partialRefundFeeAmount: refund.partialRefundFeeAmount,
        },
      });
      await Campaign.findByIdAndUpdate(refund.campaignId, {
        $set: { state: "cancelled" },
        $push: { history: { state: "cancelled", actorId: processedBy, note: "Remaining escrow refunded", changedAt: new Date() } },
      });
      await auditService.log({
        actor: { _id: processedBy, role: "admin" },
        action: "campaign.refund.completed",
        entityType: "CampaignRefund",
        entityId: refund._id,
        metadata: { campaignId: refund.campaignId, amount: refund.totalRefundAmount, razorpayRefundId: razorpayRefund.id },
      }).catch(() => {});
      await notificationService.notifyVendorUser(refund.vendorId, {
        module: "FINANCE",
        subModule: "INFLUENCER_COMMERCE",
        type: "REFUND_COMPLETED",
        title: "Campaign refund processed",
        message: `INR ${refund.totalRefundAmount} was refunded for the unreleased campaign balance.`,
        referenceId: refund._id,
        meta: { campaignId: String(refund.campaignId), refundId: String(refund._id) },
      }).catch(() => null);

      return {
        refundId: refund._id,
        razorpayRefundId: razorpayRefund.id,
        totalRefundAmount: refund.totalRefundAmount,
        status: "completed",
        message: "Refund processed to original payment method",
      };
    } catch (error) {
      if (!gatewaySucceeded && refund.status === "processing") {
        refund.status = "approved";
        await refund.save().catch(() => {});
      }
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
      ...(await campaignFeeService.calculateRefundFees(escrow.amountRemaining, {
        partial: Number(escrow.amountReleased || 0) > 0,
      })),
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
