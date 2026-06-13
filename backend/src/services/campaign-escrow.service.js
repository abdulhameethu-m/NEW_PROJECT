const crypto = require("crypto");
const CampaignPaymentOrder = require("../models/CampaignPaymentOrder");
const CampaignEscrowWallet = require("../models/CampaignEscrowWallet");
const CampaignPaymentRelease = require("../models/CampaignPaymentRelease");
const CampaignRefund = require("../models/CampaignRefund");
const Ledger = require("../models/Ledger");
const Campaign = require("../modules/campaign/model");
const Vendor = require("../models/Vendor");
const User = require("../models/User");
const { ApiError } = require("../utils/ApiError");

/**
 * Campaign Escrow Service
 * Handles all escrow wallet operations for fixed payment campaigns
 */
class CampaignEscrowService {
  /**
   * Calculate total campaign cost with fees
   */
  async calculateCampaignCost(campaignId) {
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) {
      throw new ApiError(404, "Campaign not found");
    }

    if (campaign.paymentType !== "fixed") {
      throw new ApiError(400, "Campaign payment model is not fixed payment");
    }

    const budgetAmount = campaign.pricing?.fixedCost || campaign.fixedFee || 0;

    // Calculate platform fee (2% of budget)
    const platformFee = Math.round(budgetAmount * 0.02);

    // Calculate gateway fee (fixed ₹50)
    const gatewayFee = 50;

    // Calculate GST (18% on budget + platform fee)
    const taxableAmount = budgetAmount + platformFee;
    const tax = Math.round(taxableAmount * 0.18);

    const totalAmount = budgetAmount + platformFee + gatewayFee + tax;

    return {
      budgetAmount,
      platformFeeAmount: platformFee,
      gatewayFeeAmount: gatewayFee,
      taxAmount: tax,
      totalAmount,
      currency: campaign.pricing?.currency || "INR",
    };
  }

  /**
   * Create payment order for fixed payment campaign
   */
  async createPaymentOrder(campaignId, vendorId, userId) {
    // Validate campaign exists and belongs to vendor
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) {
      throw new ApiError(404, "Campaign not found");
    }

    if (campaign.vendorId.toString() !== vendorId.toString()) {
      throw new ApiError(403, "Campaign does not belong to this vendor");
    }

    if (campaign.paymentType !== "fixed") {
      throw new ApiError(400, "Campaign payment model is not fixed payment");
    }

    // Check if payment already exists
    const existingPayment = await CampaignPaymentOrder.findOne({
      campaignId,
      vendorId,
      status: { $ne: "failed" },
    });

    if (existingPayment) {
      throw new ApiError(400, "Payment order already exists for this campaign");
    }

    // Calculate costs
    const costDetails = await this.calculateCampaignCost(campaignId);

    // Create payment order
    const paymentOrder = new CampaignPaymentOrder({
      campaignId,
      vendorId,
      budgetAmount: costDetails.budgetAmount,
      platformFeeAmount: costDetails.platformFeeAmount,
      gatewayFeeAmount: costDetails.gatewayFeeAmount,
      taxAmount: costDetails.taxAmount,
      totalAmount: costDetails.totalAmount,
      currency: costDetails.currency,
      status: "pending",
    });

    await paymentOrder.save();

    return {
      paymentOrderId: paymentOrder._id,
      ...costDetails,
    };
  }

  /**
   * Verify payment signature and mark as paid
   */
  async verifyPaymentSignature(paymentOrderId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    const paymentOrder = await CampaignPaymentOrder.findById(paymentOrderId);
    if (!paymentOrder) {
      throw new ApiError(404, "Payment order not found");
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET || "")
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      paymentOrder.status = "failed";
      paymentOrder.failureReason = "Signature verification failed";
      paymentOrder.failureCode = "INVALID_SIGNATURE";
      await paymentOrder.save();

      throw new ApiError(400, "Payment signature verification failed");
    }

    // Mark as paid
    paymentOrder.razorpayOrderId = razorpayOrderId;
    paymentOrder.razorpayPaymentId = razorpayPaymentId;
    paymentOrder.status = "paid";
    paymentOrder.paidAt = new Date();
    paymentOrder.signatureVerified = true;
    paymentOrder.signatureVerifiedAt = new Date();
    paymentOrder.verificationDetails = {
      razorpayOrderId,
      razorpayPaymentId,
      verifiedAt: new Date(),
    };

    await paymentOrder.save();

    // Create escrow wallet
    await this.createEscrowWallet(paymentOrder);

    return {
      success: true,
      paymentOrderId: paymentOrder._id,
      status: "paid",
      message: "Payment verified and escrow wallet created",
    };
  }

  /**
   * Create escrow wallet after successful payment
   */
  async createEscrowWallet(paymentOrder) {
    // Check if escrow already exists
    const existingEscrow = await CampaignEscrowWallet.findOne({
      campaignId: paymentOrder.campaignId,
      vendorId: paymentOrder.vendorId,
    });

    if (existingEscrow) {
      return existingEscrow;
    }

    // Create escrow wallet
    const escrowWallet = new CampaignEscrowWallet({
      campaignId: paymentOrder.campaignId,
      vendorId: paymentOrder.vendorId,
      paymentOrderId: paymentOrder._id,
      budgetAmount: paymentOrder.budgetAmount,
      platformFeeAmount: paymentOrder.platformFeeAmount,
      gatewayFeeAmount: paymentOrder.gatewayFeeAmount,
      taxAmount: paymentOrder.taxAmount,
      totalEscrowAmount: paymentOrder.totalAmount,
      amountFunded: paymentOrder.totalAmount,
      amountRemaining: paymentOrder.budgetAmount,
      status: "funded",
      fundedAt: new Date(),
      currency: paymentOrder.currency,
    });

    // Add audit log
    escrowWallet.auditLog.push({
      action: "escrow_created_from_payment",
      actor: paymentOrder.vendorId,
      actorRole: "vendor",
      details: {
        paymentOrderId: paymentOrder._id,
        totalAmount: paymentOrder.totalAmount,
        budgetAmount: paymentOrder.budgetAmount,
      },
    });

    await escrowWallet.save();

    return escrowWallet;
  }

  /**
   * Get escrow wallet details
   */
  async getEscrowWallet(campaignId, vendorId) {
    const escrow = await CampaignEscrowWallet.findOne({
      campaignId,
      vendorId,
    })
      .populate("paymentOrderId")
      .lean();

    if (!escrow) {
      throw new ApiError(404, "Escrow wallet not found");
    }

    return escrow;
  }

  /**
   * Release payment for approved deliverables
   */
  async releasePaymentForDeliverables(campaignId, vendorId, influencerId, deliverables, releasedBy) {
    // Validate escrow exists and has funds
    const escrow = await CampaignEscrowWallet.findOne({
      campaignId,
      vendorId,
    });

    if (!escrow) {
      throw new ApiError(404, "Escrow wallet not found");
    }

    if (!["funded", "partially_released"].includes(escrow.status)) {
      throw new ApiError(400, `Cannot release payments in current escrow status: ${escrow.status}`);
    }

    // Calculate total release amount
    let totalReleaseAmount = 0;
    const processedDeliverables = [];

    for (const deliverable of deliverables) {
      const amount = deliverable.amount || 0;
      totalReleaseAmount += amount;

      processedDeliverables.push({
        deliverableId: deliverable.id,
        type: deliverable.type,
        title: deliverable.title,
        amount,
        approvedAt: new Date(),
        approvalNotes: deliverable.approvalNotes || "",
      });
    }

    // Validate sufficient funds
    if (totalReleaseAmount > escrow.amountRemaining) {
      throw new ApiError(400, `Insufficient escrow funds. Available: ₹${escrow.amountRemaining}, Requested: ₹${totalReleaseAmount}`);
    }

    // Calculate platform fee on release (deducted from amount going to influencer)
    const platformFeeOnRelease = Math.round(totalReleaseAmount * 0.02);
    const netAmount = totalReleaseAmount - platformFeeOnRelease;

    // Create payment release record
    const paymentRelease = new CampaignPaymentRelease({
      campaignId,
      escrowWalletId: escrow._id,
      vendorId,
      influencerId,
      deliverables: processedDeliverables,
      totalAmount: totalReleaseAmount,
      platformFeeAmount: platformFeeOnRelease,
      netAmount,
      status: "approved",
      approvedBy: releasedBy,
      approvalReason: "Deliverables approved by vendor",
      approvedAt: new Date(),
      releasedAt: new Date(),
      partialRelease: true,
    });

    await paymentRelease.save();

    // Update escrow wallet
    escrow.amountReleased += totalReleaseAmount;
    escrow.amountRemaining -= totalReleaseAmount;
    escrow.lastReleaseAt = new Date();

    if (escrow.amountRemaining === 0) {
      escrow.status = "fully_released";
    } else {
      escrow.status = "partially_released";
    }

    // Add to partial releases tracking
    escrow.partialReleases.push({
      releaseId: paymentRelease._id,
      amount: totalReleaseAmount,
      releasedAt: new Date(),
    });

    // Add audit log
    escrow.auditLog.push({
      action: "payment_released",
      actor: releasedBy,
      actorRole: "vendor",
      details: {
        releaseId: paymentRelease._id,
        totalAmount: totalReleaseAmount,
        deliverableCount: deliverables.length,
      },
    });

    await escrow.save();

    // Create wallet transaction (move funds to influencer wallet)
    await this.createInfluencerWalletTransaction(paymentRelease, campaignId, influencerId);

    return {
      releaseId: paymentRelease._id,
      totalAmount: totalReleaseAmount,
      netAmount,
      platformFee: platformFeeOnRelease,
      status: "released",
      message: "Payment released to influencer wallet",
    };
  }

  /**
   * Create wallet transaction for influencer
   */
  async createInfluencerWalletTransaction(paymentRelease, campaignId, influencerId) {
    // This integrates with the existing wallet system
    // Create ledger entry for influencer earnings
    const ledgerEntry = new Ledger({
      userId: influencerId,
      transactionType: "campaign_payment_release",
      amount: paymentRelease.netAmount,
      balance: 0, // Updated by wallet service
      reference: {
        campaignId,
        releaseId: paymentRelease._id,
        type: "campaign_fixed_payment",
      },
      description: `Payment for approved deliverables in campaign ${campaignId}`,
      status: "completed",
    });

    await ledgerEntry.save();

    // Update payment release with transaction ID
    paymentRelease.walletTransactionId = ledgerEntry._id;
    paymentRelease.settledAt = new Date();
    paymentRelease.status = "settled";
    await paymentRelease.save();

    return ledgerEntry;
  }

  /**
   * Refund campaign budget
   */
  async refundCampaignBudget(campaignId, vendorId, reason, description, requestedBy) {
    // Validate escrow exists
    const escrow = await CampaignEscrowWallet.findOne({
      campaignId,
      vendorId,
    });

    if (!escrow) {
      throw new ApiError(404, "Escrow wallet not found");
    }

    // Check if already refunded
    const existingRefund = await CampaignRefund.findOne({
      campaignId,
      status: { $in: ["approved", "processing", "completed"] },
    });

    if (existingRefund) {
      throw new ApiError(400, "Campaign already has an active or completed refund");
    }

    // Validate available amount to refund
    if (escrow.amountRemaining === 0 && escrow.status === "fully_released") {
      throw new ApiError(400, "No funds available to refund (all released to influencer)");
    }

    // Get payment order for refund details
    const paymentOrder = await CampaignPaymentOrder.findById(escrow.paymentOrderId);

    // Calculate refund amounts
    const refundAmount = escrow.amountRemaining; // Only refund remaining (unreleased) amount

    // Determine fee refund policy based on reason
    let refundPlatformFee = false;
    let refundGatewayFee = false;
    let refundTax = false;

    if (["campaign_cancelled_before_acceptance", "campaign_cancelled_no_deliverables"].includes(reason)) {
      // Full refund including fees for cancellation before acceptance
      refundPlatformFee = true;
      refundGatewayFee = true;
      refundTax = true;
    }

    // Calculate actual refund
    let totalRefund = refundAmount;
    if (refundPlatformFee) totalRefund += escrow.platformFeeAmount;
    if (refundGatewayFee) totalRefund += escrow.gatewayFeeAmount;
    if (refundTax) totalRefund += escrow.taxAmount;

    // Create refund record
    const refund = new CampaignRefund({
      campaignId,
      escrowWalletId: escrow._id,
      vendorId,
      paymentOrderId: paymentOrder._id,
      budgetAmount: refundAmount,
      platformFeeAmount: refundPlatformFee ? escrow.platformFeeAmount : 0,
      gatewayFeeAmount: refundGatewayFee ? escrow.gatewayFeeAmount : 0,
      taxAmount: refundTax ? escrow.taxAmount : 0,
      totalRefundAmount: totalRefund,
      refundPlatformFee,
      refundGatewayFee,
      refundTax,
      reason,
      description,
      requestedBy,
      requestedAt: new Date(),
      status: "requested",
      refundMethod: "original_payment_method",
      currency: escrow.currency,
    });

    // Add audit log
    refund.auditLog.push({
      action: "refund_requested",
      actor: requestedBy,
      actorRole: "admin",
      details: {
        reason,
        totalRefundAmount: totalRefund,
      },
    });

    await refund.save();

    return {
      refundId: refund._id,
      totalRefundAmount: totalRefund,
      budgetRefund: refundAmount,
      feeRefund: (refundPlatformFee ? escrow.platformFeeAmount : 0) + (refundGatewayFee ? escrow.gatewayFeeAmount : 0),
      taxRefund: refundTax ? escrow.taxAmount : 0,
      status: "requested",
      message: "Refund request created and pending approval",
    };
  }

  /**
   * Approve refund
   */
  async approveRefund(refundId, approvalReason, approvedBy) {
    const refund = await CampaignRefund.findById(refundId);
    if (!refund) {
      throw new ApiError(404, "Refund not found");
    }

    if (refund.status !== "requested") {
      throw new ApiError(400, `Cannot approve refund in status: ${refund.status}`);
    }

    // Update refund
    refund.status = "approved";
    refund.approvedBy = approvedBy;
    refund.approvalReason = approvalReason;
    refund.approvedAt = new Date();

    refund.auditLog.push({
      action: "refund_approved",
      actor: approvedBy,
      actorRole: "admin",
      details: { approvalReason },
    });

    await refund.save();

    // Update escrow wallet
    const escrow = await CampaignEscrowWallet.findById(refund.escrowWalletId);
    escrow.amountRefunded += refund.totalRefundAmount;
    escrow.status = "refunded";

    escrow.auditLog.push({
      action: "refund_approved",
      actor: approvedBy,
      actorRole: "admin",
      details: { refundId, totalRefundAmount: refund.totalRefundAmount },
    });

    await escrow.save();

    return {
      refundId: refund._id,
      status: "approved",
      totalRefundAmount: refund.totalRefundAmount,
      message: "Refund approved and ready for processing",
    };
  }

  /**
   * Get campaign escrow summary
   */
  async getCampaignEscrowSummary(campaignId, vendorId) {
    const escrow = await CampaignEscrowWallet.findOne({
      campaignId,
      vendorId,
    }).lean();

    if (!escrow) {
      return {
        status: "not_funded",
        message: "Campaign not yet funded",
      };
    }

    const paymentOrder = await CampaignPaymentOrder.findById(escrow.paymentOrderId).lean();

    return {
      escrowId: escrow._id,
      campaignId,
      vendorId,
      budgetAmount: escrow.budgetAmount,
      platformFeeAmount: escrow.platformFeeAmount,
      gatewayFeeAmount: escrow.gatewayFeeAmount,
      taxAmount: escrow.taxAmount,
      totalEscrowAmount: escrow.totalEscrowAmount,
      amountFunded: escrow.amountFunded,
      amountReleased: escrow.amountReleased,
      amountRefunded: escrow.amountRefunded,
      amountRemaining: escrow.amountRemaining,
      status: escrow.status,
      campaignStatus: escrow.campaignStatus,
      fundedAt: escrow.fundedAt,
      paymentOrderStatus: paymentOrder?.status,
      partialReleases: escrow.partialReleases.length,
    };
  }
}

module.exports = new CampaignEscrowService();
