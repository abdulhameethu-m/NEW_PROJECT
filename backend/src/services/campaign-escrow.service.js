const crypto = require("crypto");
const mongoose = require("mongoose");
const CampaignPaymentOrder = require("../models/CampaignPaymentOrder");
const CampaignEscrowWallet = require("../models/CampaignEscrowWallet");
const CampaignPaymentRelease = require("../models/CampaignPaymentRelease");
const CampaignRefund = require("../models/CampaignRefund");
const { Campaign } = require("../modules/campaign/model");
const { CampaignDeliverable, DeliverablePayout } = require("../modules/campaign/executionModel");
const { InfluencerWallet, InfluencerLedger } = require("../modules/commission/models");
const { withOptionalTransaction } = require("../utils/withOptionalTransaction");
const auditService = require("./audit.service");
const { ApiError } = require("../utils/ApiError");

function money(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
}

function withSession(query, session) {
  return session ? query.session(session) : query;
}

class CampaignEscrowService {
  async calculateCampaignCost(campaignId, vendorId = null) {
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) throw new ApiError(404, "Campaign not found");
    if (vendorId && String(campaign.vendorId) !== String(vendorId)) {
      throw new ApiError(403, "Campaign does not belong to this vendor");
    }
    if (campaign.paymentType !== "fixed") {
      throw new ApiError(400, "Campaign payment model is not fixed payment");
    }

    const budgetAmount = money(campaign.pricing?.fixedCost || campaign.fixedFee);
    if (budgetAmount <= 0) {
      throw new ApiError(400, "Fixed payment campaign budget must be greater than zero");
    }

    const platformFeeAmount = money(budgetAmount * 0.02);
    const gatewayFeeAmount = 50;
    const taxAmount = money((platformFeeAmount + gatewayFeeAmount) * 0.18);
    const totalAmount = money(budgetAmount + platformFeeAmount + gatewayFeeAmount + taxAmount);

    return {
      budgetAmount,
      platformFeeAmount,
      gatewayFeeAmount,
      taxAmount,
      totalAmount,
      currency: campaign.pricing?.currency || "INR",
    };
  }

  async createPaymentOrder(campaignId, vendorId) {
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) throw new ApiError(404, "Campaign not found");
    if (String(campaign.vendorId) !== String(vendorId)) {
      throw new ApiError(403, "Campaign does not belong to this vendor");
    }
    if (campaign.paymentType !== "fixed") {
      throw new ApiError(400, "Campaign payment model is not fixed payment");
    }

    const existingPayment = await CampaignPaymentOrder.findOne({ campaignId, vendorId });
    if (existingPayment && existingPayment.status !== "failed") {
      throw new ApiError(409, "Payment order already exists for this campaign");
    }

    const costDetails = await this.calculateCampaignCost(campaignId, vendorId);
    const paymentOrder = existingPayment || new CampaignPaymentOrder({ campaignId, vendorId });
    Object.assign(paymentOrder, {
      ...costDetails,
      status: "pending",
      razorpayOrderId: undefined,
      razorpayPaymentId: undefined,
      signatureVerified: false,
      signatureVerifiedAt: undefined,
      failureReason: "",
      failureCode: "",
    });
    await paymentOrder.save();

    return { paymentOrderId: paymentOrder._id, ...costDetails };
  }

  async verifyPaymentSignature(paymentOrderId, vendorId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    const paymentOrder = await CampaignPaymentOrder.findById(paymentOrderId);
    if (!paymentOrder) throw new ApiError(404, "Payment order not found");
    if (String(paymentOrder.vendorId) !== String(vendorId)) {
      throw new ApiError(403, "Payment order does not belong to this vendor");
    }
    if (paymentOrder.status === "paid" && paymentOrder.signatureVerified) {
      await this.createEscrowWallet(paymentOrder);
      return { success: true, paymentOrderId: paymentOrder._id, status: "paid", idempotent: true };
    }
    if (!paymentOrder.razorpayOrderId || paymentOrder.razorpayOrderId !== razorpayOrderId) {
      throw new ApiError(400, "Razorpay order does not match the payment order");
    }
    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw new ApiError(503, "Payment gateway is not configured");
    }

    const expectedHex = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");
    const expected = Buffer.from(expectedHex, "utf8");
    const received = Buffer.from(String(razorpaySignature), "utf8");

    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      paymentOrder.status = "failed";
      paymentOrder.failedAt = new Date();
      paymentOrder.failureReason = "Signature verification failed";
      paymentOrder.failureCode = "INVALID_SIGNATURE";
      await paymentOrder.save();
      throw new ApiError(400, "Payment signature verification failed");
    }

    paymentOrder.razorpayPaymentId = razorpayPaymentId;
    paymentOrder.status = "paid";
    paymentOrder.paidAt = new Date();
    paymentOrder.signatureVerified = true;
    paymentOrder.signatureVerifiedAt = new Date();
    paymentOrder.verificationDetails = { razorpayOrderId, razorpayPaymentId, verifiedAt: new Date() };
    await paymentOrder.save();
    await this.createEscrowWallet(paymentOrder);

    await auditService.log({
      actor: { _id: vendorId, role: "vendor" },
      action: "campaign.payment.success",
      entityType: "CampaignPaymentOrder",
      entityId: paymentOrder._id,
      metadata: { campaignId: paymentOrder.campaignId, razorpayOrderId, razorpayPaymentId },
    }).catch(() => {});

    return {
      success: true,
      paymentOrderId: paymentOrder._id,
      status: "paid",
      message: "Payment verified and escrow wallet created",
    };
  }

  async createEscrowWallet(paymentOrder) {
    const existingEscrow = await CampaignEscrowWallet.findOne({
      campaignId: paymentOrder.campaignId,
      vendorId: paymentOrder.vendorId,
    });
    if (existingEscrow) return existingEscrow;

    const escrowWallet = new CampaignEscrowWallet({
      campaignId: paymentOrder.campaignId,
      vendorId: paymentOrder.vendorId,
      paymentOrderId: paymentOrder._id,
      budgetAmount: paymentOrder.budgetAmount,
      platformFeeAmount: paymentOrder.platformFeeAmount,
      gatewayFeeAmount: paymentOrder.gatewayFeeAmount,
      taxAmount: paymentOrder.taxAmount,
      totalEscrowAmount: paymentOrder.budgetAmount,
      amountFunded: paymentOrder.budgetAmount,
      amountRemaining: paymentOrder.budgetAmount,
      status: "funded",
      campaignStatus: "active",
      fundedAt: new Date(),
      currency: paymentOrder.currency,
      auditLog: [{
        action: "escrow_created_from_payment",
        actor: paymentOrder.vendorId,
        actorRole: "vendor",
        details: {
          paymentOrderId: paymentOrder._id,
          paidAmount: paymentOrder.totalAmount,
          escrowAmount: paymentOrder.budgetAmount,
        },
      }],
    });
    await escrowWallet.save();
    return escrowWallet;
  }

  async getEscrowWallet(campaignId, vendorId) {
    const escrow = await CampaignEscrowWallet.findOne({ campaignId, vendorId })
      .populate("paymentOrderId")
      .lean();
    if (!escrow) throw new ApiError(404, "Escrow wallet not found");
    return escrow;
  }

  async releasePaymentForDeliverables(campaignId, vendorId, influencerId, deliverableIds, releasedBy) {
    const uniqueIds = [...new Set(deliverableIds.map(String))];
    if (!uniqueIds.length || uniqueIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      throw new ApiError(400, "Valid deliverable IDs are required");
    }

    const result = await withOptionalTransaction(async (session) => {
      if (!session) {
        throw new ApiError(503, "Escrow releases require MongoDB transaction support");
      }
      const campaign = await withSession(Campaign.findOne({ _id: campaignId, vendorId }), session);
      if (!campaign) throw new ApiError(404, "Campaign not found");
      if (campaign.paymentType !== "fixed") {
        throw new ApiError(400, "Campaign is not a fixed payment campaign");
      }
      if (String(campaign.influencerId) !== String(influencerId)) {
        throw new ApiError(400, "Influencer does not match this campaign");
      }
      if (["draft", "invitation_sent", "rejected", "cancelled", "expired"].includes(campaign.state)) {
        throw new ApiError(400, "Campaign must be accepted before earnings can be released");
      }
      const activeRefund = await withSession(CampaignRefund.findOne({
        campaignId,
        status: { $in: ["requested", "approved", "processing"] },
      }), session);
      if (activeRefund) {
        throw new ApiError(409, "Campaign earnings cannot be released while a refund is pending");
      }

      const escrow = await withSession(CampaignEscrowWallet.findOne({ campaignId, vendorId }), session);
      if (!escrow) throw new ApiError(404, "Escrow wallet not found");
      if (!["funded", "partially_released"].includes(escrow.status)) {
        throw new ApiError(400, `Cannot release payments in current escrow status: ${escrow.status}`);
      }

      const deliverables = await withSession(CampaignDeliverable.find({
        _id: { $in: uniqueIds },
        campaignId,
        vendorId,
        influencerId,
        approvalStatus: "approved",
        paymentEligibility: "eligible",
      }), session);
      if (deliverables.length !== uniqueIds.length) {
        throw new ApiError(400, "Every deliverable must be approved, eligible, and owned by this campaign");
      }

      const payouts = await withSession(DeliverablePayout.find({
        deliverableId: { $in: uniqueIds },
        campaignId,
        influencerId,
        paymentModel: "fixed",
        status: "eligible",
      }), session);
      if (payouts.length !== uniqueIds.length) {
        throw new ApiError(409, "One or more deliverables were already released or are not payable");
      }

      const payoutByDeliverable = new Map(payouts.map((row) => [String(row.deliverableId), row]));
      const processedDeliverables = deliverables.map((deliverable) => ({
        deliverableId: deliverable._id,
        type: deliverable.deliverableType,
        title: deliverable.title,
        amount: money(payoutByDeliverable.get(String(deliverable._id)).approvedAmount),
        approvedAt: deliverable.completedAt || new Date(),
      }));
      const totalReleaseAmount = money(processedDeliverables.reduce((sum, row) => sum + row.amount, 0));
      if (totalReleaseAmount <= 0) throw new ApiError(400, "Approved deliverables have no payable value");
      if (totalReleaseAmount > money(escrow.amountRemaining)) {
        throw new ApiError(400, `Insufficient escrow funds. Available: ${escrow.amountRemaining}, requested: ${totalReleaseAmount}`);
      }

      const [paymentRelease] = await CampaignPaymentRelease.create([{
        campaignId,
        escrowWalletId: escrow._id,
        vendorId,
        influencerId,
        deliverables: processedDeliverables,
        totalAmount: totalReleaseAmount,
        platformFeeAmount: 0,
        netAmount: totalReleaseAmount,
        status: "released",
        approvedBy: releasedBy,
        approvalReason: "Approved campaign deliverables",
        approvedAt: new Date(),
        releasedAt: new Date(),
        partialRelease: totalReleaseAmount < money(escrow.budgetAmount),
      }], { session: session || undefined });

      const updatedEscrow = await CampaignEscrowWallet.findOneAndUpdate(
        {
          _id: escrow._id,
          amountRemaining: { $gte: totalReleaseAmount },
          status: { $in: ["funded", "partially_released"] },
        },
        {
          $inc: { amountReleased: totalReleaseAmount, amountRemaining: -totalReleaseAmount },
          $set: {
            status: money(escrow.amountRemaining) === totalReleaseAmount ? "fully_released" : "partially_released",
            lastReleaseAt: new Date(),
            ...(escrow.firstReleaseAt ? {} : { firstReleaseAt: new Date() }),
          },
          $push: {
            partialReleases: { releaseId: paymentRelease._id, amount: totalReleaseAmount, releasedAt: new Date() },
            auditLog: {
              action: "payment_released",
              actor: releasedBy,
              actorRole: "vendor",
              details: { releaseId: paymentRelease._id, totalAmount: totalReleaseAmount, deliverableIds: uniqueIds },
            },
          },
        },
        { returnDocument: "after", session: session || undefined }
      );
      if (!updatedEscrow) throw new ApiError(409, "Escrow balance changed; retry the release");

      const wallet = await InfluencerWallet.findOneAndUpdate(
        { influencerId },
        { $setOnInsert: { influencerId } },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, session: session || undefined }
      );
      if (wallet.status !== "active") throw new ApiError(400, "Influencer wallet is not active");

      const updatedWallet = await InfluencerWallet.findByIdAndUpdate(
        wallet._id,
        { $inc: { availableBalance: totalReleaseAmount, totalEarnings: totalReleaseAmount } },
        { returnDocument: "after", runValidators: true, session: session || undefined }
      );
      const [ledgerEntry] = await InfluencerLedger.create([{
        influencerId,
        type: "CREDIT",
        amount: totalReleaseAmount,
        source: "CAMPAIGN",
        idempotencyKey: `campaign-release:${paymentRelease._id}`,
        balanceAfter: updatedWallet.availableBalance,
        meta: { campaignId, releaseId: paymentRelease._id, deliverableIds: uniqueIds },
      }], { session: session || undefined });

      await DeliverablePayout.updateMany(
        { _id: { $in: payouts.map((row) => row._id) }, status: "eligible" },
        { $set: { status: "released", "metadata.releaseId": paymentRelease._id, "metadata.releasedAt": new Date() } },
        { session: session || undefined }
      );
      paymentRelease.walletTransactionId = ledgerEntry._id;
      paymentRelease.settledAt = new Date();
      paymentRelease.status = "settled";
      await paymentRelease.save({ session: session || undefined });

      return {
        releaseId: paymentRelease._id,
        totalAmount: totalReleaseAmount,
        netAmount: totalReleaseAmount,
        platformFee: 0,
        status: "settled",
      };
    }, { source: "campaign-escrow-release" });

    await auditService.log({
      actor: { _id: releasedBy, role: "vendor" },
      action: "campaign.escrow.released",
      entityType: "CampaignPaymentRelease",
      entityId: result.releaseId,
      metadata: { campaignId, influencerId, amount: result.totalAmount, deliverableIds: uniqueIds },
    }).catch(() => {});
    return { ...result, message: "Approved earnings released to the influencer wallet" };
  }

  async refundCampaignBudget(campaignId, vendorId, reason, description, requestedBy) {
    const escrow = await CampaignEscrowWallet.findOne({ campaignId, vendorId });
    if (!escrow) throw new ApiError(404, "Escrow wallet not found");

    const existingRefund = await CampaignRefund.findOne({
      campaignId,
      status: { $in: ["requested", "approved", "processing", "completed"] },
    });
    if (existingRefund) throw new ApiError(409, "Campaign already has an active or completed refund");
    if (money(escrow.amountRemaining) <= 0) throw new ApiError(400, "No escrow funds are available to refund");

    const paymentOrder = await CampaignPaymentOrder.findById(escrow.paymentOrderId);
    if (!paymentOrder) throw new ApiError(404, "Campaign payment order not found");
    const totalRefundAmount = money(escrow.amountRemaining);

    const refund = new CampaignRefund({
      campaignId,
      escrowWalletId: escrow._id,
      vendorId,
      paymentOrderId: paymentOrder._id,
      budgetAmount: totalRefundAmount,
      platformFeeAmount: 0,
      gatewayFeeAmount: 0,
      taxAmount: 0,
      totalRefundAmount,
      refundPlatformFee: false,
      refundGatewayFee: false,
      refundTax: false,
      reason,
      description,
      requestedBy,
      requestedAt: new Date(),
      status: "requested",
      refundMethod: "original_payment_method",
      currency: escrow.currency,
      auditLog: [{
        action: "refund_requested",
        actor: requestedBy,
        actorRole: "vendor",
        details: { reason, totalRefundAmount },
      }],
    });
    await refund.save();

    return {
      refundId: refund._id,
      totalRefundAmount,
      budgetRefund: totalRefundAmount,
      feeRefund: 0,
      taxRefund: 0,
      status: "requested",
      message: "Refund request created and pending approval",
    };
  }

  async approveRefund(refundId, approvalReason, approvedBy) {
    const refund = await CampaignRefund.findOneAndUpdate(
      { _id: refundId, status: "requested" },
      {
        $set: { status: "approved", approvedBy, approvalReason, approvedAt: new Date() },
        $push: {
          auditLog: {
            action: "refund_approved",
            actor: approvedBy,
            actorRole: "admin",
            details: { approvalReason },
          },
        },
      },
      { returnDocument: "after" }
    );
    if (!refund) throw new ApiError(409, "Refund is not pending approval");
    return {
      refundId: refund._id,
      status: "approved",
      totalRefundAmount: refund.totalRefundAmount,
      message: "Refund approved and ready for processing",
    };
  }

  async getCampaignEscrowSummary(campaignId, vendorId) {
    const escrow = await CampaignEscrowWallet.findOne({ campaignId, vendorId }).lean();
    if (!escrow) return { status: "not_funded", message: "Campaign not yet funded" };
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
      totalPaidAmount: paymentOrder?.totalAmount,
      amountFunded: escrow.amountFunded,
      amountReleased: escrow.amountReleased,
      amountRefunded: escrow.amountRefunded,
      amountRemaining: escrow.amountRemaining,
      status: escrow.status,
      campaignStatus: escrow.campaignStatus,
      fundedAt: escrow.fundedAt,
      firstReleaseAt: escrow.firstReleaseAt,
      lastReleaseAt: escrow.lastReleaseAt,
      paymentOrderStatus: paymentOrder?.status,
      partialReleases: escrow.partialReleases,
    };
  }
}

module.exports = new CampaignEscrowService();
