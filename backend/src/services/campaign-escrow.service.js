const crypto = require("crypto");
const mongoose = require("mongoose");
const CampaignPaymentOrder = require("../models/CampaignPaymentOrder");
const CampaignEscrowWallet = require("../models/CampaignEscrowWallet");
const CampaignPaymentRelease = require("../models/CampaignPaymentRelease");
const CampaignRefund = require("../models/CampaignRefund");
const CampaignDeliverableFunding = require("../models/CampaignDeliverableFunding");
const CampaignEscrowLedger = require("../models/CampaignEscrowLedger");
const PlatformRevenueTransaction = require("../models/PlatformRevenueTransaction");
const { Campaign, CampaignStatusHistory } = require("../modules/campaign/model");
const { CampaignDeliverable, DeliverablePayout } = require("../modules/campaign/executionModel");
const campaignExecutionService = require("../modules/campaign/executionService");
const { InfluencerWallet, InfluencerLedger } = require("../modules/commission/models");
const { withOptionalTransaction } = require("../utils/withOptionalTransaction");
const auditService = require("./audit.service");
const campaignFeeService = require("./campaign-fee.service");
const notificationService = require("./notification.service");
const { InfluencerProfile } = require("../modules/influencer/model");
const { emitDomainEvent } = require("../modules/events/event-bus");
const { ApiError } = require("../utils/ApiError");
const { roundMoney: money } = require("../modules/shared/helpers");

function withSession(query, session) {
  return session ? query.session(session) : query;
}

function platformFeePercentageFromSnapshot(feeLines = []) {
  const platformLines = (feeLines || []).filter((line) => line?.feeCode === "platform_fee");
  return money(platformLines.reduce((sum, line) => sum + Number(line.percentageValue || 0), 0));
}

function hasFixedRewardCampaign(campaign) {
  return ["fixed", "hybrid"].includes(String(campaign?.paymentType || "").toLowerCase());
}

function sortedDeliverableIds(deliverableIds = []) {
  return [...new Set((deliverableIds || []).map((id) => String(id)).filter(Boolean))].sort();
}

function buildReleaseKey(campaignId, influencerId, deliverableIds) {
  return crypto
    .createHash("sha256")
    .update([String(campaignId), String(influencerId), ...sortedDeliverableIds(deliverableIds)].join(":"))
    .digest("hex");
}

function releasedDeliverableIds(paymentRelease) {
  return sortedDeliverableIds((paymentRelease?.deliverables || []).map((row) => row.deliverableId));
}

function releaseContainsDeliverables(paymentRelease, deliverableIds) {
  const claimedIds = new Set(releasedDeliverableIds(paymentRelease));
  return sortedDeliverableIds(deliverableIds).every((id) => claimedIds.has(id));
}

function releaseMatchesExactDeliverables(paymentRelease, deliverableIds) {
  const claimedIds = releasedDeliverableIds(paymentRelease);
  const requestedIds = sortedDeliverableIds(deliverableIds);
  return claimedIds.length === requestedIds.length && claimedIds.every((id, index) => id === requestedIds[index]);
}

function releaseResponse(paymentRelease, extra = {}) {
  return {
    releaseId: paymentRelease._id,
    totalAmount: money(paymentRelease.totalAmount),
    netAmount: money(paymentRelease.netAmount),
    platformFee: money(paymentRelease.platformFeeAmount),
    status: paymentRelease.status,
    ...extra,
  };
}

class CampaignEscrowService {
  standaloneReleaseEnabled() {
    if (process.env.NODE_ENV === "production") return false;
    return String(process.env.ALLOW_STANDALONE_ESCROW_RELEASES || "true").toLowerCase() !== "false";
  }

  async findReleaseClaim(campaignId, influencerId, deliverableIds, session = null) {
    const releaseKey = buildReleaseKey(campaignId, influencerId, deliverableIds);
    return withSession(
      CampaignPaymentRelease.findOne({
        campaignId,
        $or: [
          { releaseKey },
          { "deliverables.deliverableId": { $in: deliverableIds } },
        ],
      }).sort({ createdAt: -1 }),
      session
    );
  }

  assertReleaseClaimMatches(paymentRelease, campaignId, influencerId, deliverableIds) {
    if (!paymentRelease) return;
    if (
      String(paymentRelease.campaignId) !== String(campaignId)
      || String(paymentRelease.influencerId) !== String(influencerId)
      || !releaseContainsDeliverables(paymentRelease, deliverableIds)
    ) {
      throw new ApiError(
        409,
        "One or more deliverables are already attached to a different payment release",
        "DELIVERABLE_ALREADY_CLAIMED",
        { deliverableIds: sortedDeliverableIds(deliverableIds), releaseId: paymentRelease._id }
      );
    }
  }

  async calculateCampaignCost(campaignId, vendorId = null) {
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) throw new ApiError(404, "Campaign not found");
    if (vendorId && String(campaign.vendorId) !== String(vendorId)) {
      throw new ApiError(403, "Campaign does not belong to this vendor");
    }
    if (!hasFixedRewardCampaign(campaign)) {
      throw new ApiError(400, "Campaign payment model is not fixed payment or hybrid");
    }
    const budgetAmount = money(campaign.pricing?.fixedCost || campaign.fixedFee);
    if (budgetAmount <= 0) {
      throw new ApiError(400, "Fixed payment campaign budget must be greater than zero");
    }

    return campaignFeeService.calculateFundingSummary(
      budgetAmount,
      campaign.pricing?.currency || "INR",
      new Date(),
      campaign.paymentType
    );
  }

  async createPaymentOrder(campaignId, vendorId) {
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) throw new ApiError(404, "Campaign not found");
    if (String(campaign.vendorId) !== String(vendorId)) {
      throw new ApiError(403, "Campaign does not belong to this vendor");
    }
    if (!hasFixedRewardCampaign(campaign)) {
      throw new ApiError(400, "Campaign payment model has no fixed reward escrow");
    }
    if (
      !["accepted_awaiting_funding", "funding_pending"].includes(campaign.fixedPaymentWorkflow?.status)
    ) {
      throw new ApiError(
        409,
        "The influencer must accept this fixed-payment campaign before escrow can be funded",
        "CAMPAIGN_ACCEPTANCE_REQUIRED"
      );
    }

    const existingPayment = await CampaignPaymentOrder.findOne({ campaignId, vendorId });
    if (existingPayment && existingPayment.status !== "failed") {
      throw new ApiError(409, "Payment order already exists for this campaign");
    }

    const costDetails = await this.calculateCampaignCost(campaignId, vendorId);
    const paymentOrder = existingPayment || new CampaignPaymentOrder({ campaignId, vendorId });
    Object.assign(paymentOrder, {
      ...costDetails,
      escrowAmount: costDetails.escrowAmount,
      feeConfigurationSnapshot: costDetails.feeConfigurationSnapshot,
      status: "pending",
      razorpayOrderId: undefined,
      razorpayPaymentId: undefined,
      signatureVerified: false,
      signatureVerifiedAt: undefined,
      failureReason: "",
      failureCode: "",
      gatewayStatusUnknownAt: undefined,
      orderCreationLock: "",
      orderCreationLockExpiresAt: undefined,
    });
    await paymentOrder.save();
    await Campaign.updateOne(
      { _id: campaignId, paymentType: { $in: ["fixed", "hybrid"] } },
      {
        $set: {
          "fixedPaymentWorkflow.status": "funding_pending",
          "fixedPaymentWorkflow.fundingStartedAt": new Date(),
          "fixedPaymentWorkflow.lastTransitionAt": new Date(),
        },
      }
    );

    return { paymentOrderId: paymentOrder._id, ...costDetails };
  }

  async verifyPaymentSignature(paymentOrderId, vendorId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    const paymentOrder = await CampaignPaymentOrder.findById(paymentOrderId);
    if (!paymentOrder) throw new ApiError(404, "Payment order not found");
    if (String(paymentOrder.vendorId) !== String(vendorId)) {
      throw new ApiError(403, "Payment order does not belong to this vendor");
    }
    if (["authorized", "paid"].includes(paymentOrder.status) && paymentOrder.signatureVerified) {
      return { success: true, paymentOrderId: paymentOrder._id, status: paymentOrder.status, idempotent: true };
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
      throw new ApiError(400, "Payment checkout signature verification failed");
    }
    paymentOrder.razorpayPaymentId = razorpayPaymentId;
    paymentOrder.status = "authorized";
    paymentOrder.authorizedAt = new Date();
    paymentOrder.signatureVerified = true;
    paymentOrder.signatureVerifiedAt = new Date();
    paymentOrder.verificationDetails = {
      razorpayOrderId,
      razorpayPaymentId,
      checkoutSignature: razorpaySignature,
      clientConfirmedAt: new Date(),
      fundingAuthority: "razorpay_webhook",
    };
    await paymentOrder.save();

    await auditService.log({
      actor: { _id: vendorId, role: "vendor" },
      action: "campaign.payment.checkout_confirmed",
      entityType: "CampaignPaymentOrder",
      entityId: paymentOrder._id,
      metadata: { campaignId: paymentOrder.campaignId, razorpayOrderId, razorpayPaymentId },
    }).catch(() => {});

    return {
      success: true,
      paymentOrderId: paymentOrder._id,
      status: "authorized",
      message: "Checkout confirmed. Escrow funding is pending verified Razorpay webhook processing.",
    };
  }

  async createEscrowWallet(paymentOrder, webhookEventId = "") {
    let escrowWallet = await CampaignEscrowWallet.findOne({
      campaignId: paymentOrder.campaignId,
      vendorId: paymentOrder.vendorId,
    });

    const campaign = await Campaign.findById(paymentOrder.campaignId).lean();
    if (!campaign || !hasFixedRewardCampaign(campaign)) {
      throw new ApiError(409, "Fixed-reward campaign not found for escrow funding");
    }
    if (
      !campaign.influencerId ||
      ![
        "accepted_awaiting_funding",
        "funding_pending",
        "funded",
        "content_in_progress",
        "vendor_approved",
        "partially_released",
        "fully_released",
      ].includes(campaign.fixedPaymentWorkflow?.status)
    ) {
      throw new ApiError(409, "Escrow cannot be funded before the influencer accepts the campaign");
    }
    if (!escrowWallet) {
      escrowWallet = new CampaignEscrowWallet({
        campaignId: paymentOrder.campaignId,
        vendorId: paymentOrder.vendorId,
        paymentOrderId: paymentOrder._id,
        budgetAmount: paymentOrder.budgetAmount,
        platformFeeAmount: paymentOrder.platformFeeAmount,
        gatewayFeeAmount: paymentOrder.gatewayFeeAmount,
        taxAmount: paymentOrder.taxAmount,
        totalEscrowAmount: paymentOrder.budgetAmount,
        paidAmount: paymentOrder.totalAmount,
        feeConfigurationSnapshot: paymentOrder.feeConfigurationSnapshot,
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
    }
    const allocationCount = await CampaignDeliverableFunding.countDocuments({ escrowWalletId: escrowWallet._id });
    if (!allocationCount) {
    const derived = campaignExecutionService.__private__.deriveDeliverables(campaign);
    const sourceRows = derived.length ? derived : [{
      deliverableType: "campaign_budget",
      title: campaign.title || "Campaign budget",
      quantity: 1,
      totalPrice: paymentOrder.budgetAmount,
      snapshot: {},
    }];
    const sourceTotal = money(sourceRows.reduce((sum, row) => sum + Number(row.totalPrice || 0), 0));
    let allocated = 0;
    const allocationRows = sourceRows.map((row, index) => {
      const isLast = index === sourceRows.length - 1;
      const amount = isLast
        ? money(paymentOrder.budgetAmount - allocated)
        : money(sourceTotal > 0
          ? (Number(row.totalPrice || 0) / sourceTotal) * paymentOrder.budgetAmount
          : paymentOrder.budgetAmount / sourceRows.length);
      allocated = money(allocated + amount);
      return {
        campaignId: campaign._id,
        escrowWalletId: escrowWallet._id,
        allocationKey: String(index + 1).padStart(4, "0"),
        deliverableType: row.deliverableType || "deliverable",
        deliverableName: row.title || `Deliverable ${index + 1}`,
        allocatedAmount: amount,
        remainingAmount: amount,
        status: "funded",
        currency: paymentOrder.currency,
        snapshot: row.snapshot || row,
      };
    });
    await CampaignDeliverableFunding.insertMany(allocationRows);
    }
    const now = new Date();
    await Campaign.updateOne(
      { _id: campaign._id },
      {
        $set: {
          state: "active",
          startDate: campaign.startDate || now,
          "fixedPaymentWorkflow.status": "funded",
          "fixedPaymentWorkflow.contentEnabled": true,
          "fixedPaymentWorkflow.fundedAt": now,
          "fixedPaymentWorkflow.lastTransitionAt": now,
          "scheduling.activatedAt": now,
        },
        $push: {
          history: {
            state: "active",
            actorId: paymentOrder.vendorId,
            note: "Escrow funded and campaign activated",
            changedAt: now,
          },
        },
      }
    );
    await CampaignStatusHistory.create({
      campaignId: campaign._id,
      oldStatus: campaign.state,
      newStatus: "active",
      changedBy: paymentOrder.vendorId,
      changedByRole: "vendor",
      reason: "Escrow funded and campaign activated",
    }).catch(() => null);
    await CampaignEscrowLedger.findOneAndUpdate({
      idempotencyKey: `campaign-vendor-payment:${paymentOrder._id}`,
    }, {
      $setOnInsert: {
        campaignId: campaign._id,
        escrowWalletId: escrowWallet._id,
        paymentOrderId: paymentOrder._id,
        vendorId: paymentOrder.vendorId,
        entryType: "vendor_payment",
        direction: "credit",
        amount: paymentOrder.totalAmount,
        balanceAfter: paymentOrder.totalAmount,
        currency: paymentOrder.currency,
        idempotencyKey: `campaign-vendor-payment:${paymentOrder._id}`,
        metadata: { webhookEventId },
      },
    }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
    await CampaignEscrowLedger.findOneAndUpdate({
      idempotencyKey: `campaign-escrow-funding:${paymentOrder._id}`,
    }, {
      $setOnInsert: {
      campaignId: campaign._id,
      escrowWalletId: escrowWallet._id,
      paymentOrderId: paymentOrder._id,
      vendorId: paymentOrder.vendorId,
      entryType: "escrow_funding",
      direction: "credit",
      amount: paymentOrder.budgetAmount,
      balanceAfter: paymentOrder.budgetAmount,
      currency: paymentOrder.currency,
      idempotencyKey: `campaign-escrow-funding:${paymentOrder._id}`,
        metadata: { webhookEventId, paidAmount: paymentOrder.totalAmount },
      },
    }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
    await PlatformRevenueTransaction.findOneAndUpdate({
      idempotencyKey: `campaign-platform-revenue:${paymentOrder._id}`,
    }, {
      $setOnInsert: {
        campaignId: campaign._id,
        vendorId: paymentOrder.vendorId,
        paymentOrderId: paymentOrder._id,
        paymentModel: campaign.paymentType,
        platformFeePercentage: platformFeePercentageFromSnapshot(paymentOrder.feeConfigurationSnapshot),
        platformFeeAmount: paymentOrder.platformFeeAmount,
        gatewayFeeAmount: paymentOrder.gatewayFeeAmount,
        taxAmount: paymentOrder.taxAmount,
        campaignBudget: paymentOrder.budgetAmount,
        grossPaidAmount: paymentOrder.totalAmount,
        currency: paymentOrder.currency,
        status: "collected",
        feeConfigurationSnapshot: paymentOrder.feeConfigurationSnapshot,
        idempotencyKey: `campaign-platform-revenue:${paymentOrder._id}`,
        metadata: { webhookEventId, escrowWalletId: escrowWallet._id },
      },
    }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
    if (money(paymentOrder.platformFeeAmount) > 0) {
      await CampaignEscrowLedger.findOneAndUpdate({
        idempotencyKey: `campaign-platform-revenue:${paymentOrder._id}`,
      }, {
        $setOnInsert: {
          campaignId: campaign._id,
          escrowWalletId: escrowWallet._id,
          paymentOrderId: paymentOrder._id,
          vendorId: paymentOrder.vendorId,
          entryType: "platform_revenue",
          direction: "credit",
          amount: paymentOrder.platformFeeAmount,
          balanceAfter: paymentOrder.platformFeeAmount,
          currency: paymentOrder.currency,
          idempotencyKey: `campaign-platform-revenue:${paymentOrder._id}`,
          metadata: { webhookEventId },
        },
      }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
    }
    if (money(paymentOrder.gatewayFeeAmount) > 0) {
      await CampaignEscrowLedger.findOneAndUpdate({
        idempotencyKey: `campaign-gateway-expense:${paymentOrder._id}`,
      }, {
        $setOnInsert: {
          campaignId: campaign._id,
          escrowWalletId: escrowWallet._id,
          paymentOrderId: paymentOrder._id,
          vendorId: paymentOrder.vendorId,
          entryType: "gateway_expense",
          direction: "debit",
          amount: paymentOrder.gatewayFeeAmount,
          balanceAfter: 0,
          currency: paymentOrder.currency,
          idempotencyKey: `campaign-gateway-expense:${paymentOrder._id}`,
          metadata: { webhookEventId },
        },
      }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
    }
    if (money(paymentOrder.taxAmount) > 0) {
      await CampaignEscrowLedger.findOneAndUpdate({
        idempotencyKey: `campaign-tax-collected:${paymentOrder._id}`,
      }, {
        $setOnInsert: {
          campaignId: campaign._id,
          escrowWalletId: escrowWallet._id,
          paymentOrderId: paymentOrder._id,
          vendorId: paymentOrder.vendorId,
          entryType: "tax_collected",
          direction: "credit",
          amount: paymentOrder.taxAmount,
          balanceAfter: paymentOrder.taxAmount,
          currency: paymentOrder.currency,
          idempotencyKey: `campaign-tax-collected:${paymentOrder._id}`,
          metadata: { webhookEventId },
        },
      }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
    }
    return escrowWallet;
  }

  async getEscrowWallet(campaignId, vendorId) {
    const escrow = await CampaignEscrowWallet.findOne({ campaignId, vendorId })
      .populate("paymentOrderId")
      .lean();
    if (!escrow) throw new ApiError(404, "Escrow wallet not found");
    return escrow;
  }

  async releasePaymentForDeliverables(campaignId, influencerId, deliverableIds, releasedBy) {
    const uniqueIds = [...new Set(deliverableIds.map(String))];
    if (!uniqueIds.length || uniqueIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      throw new ApiError(400, "Valid deliverable IDs are required");
    }

    // Read this before opening the transaction. It gives retries a stable,
    // domain-level result and avoids relying on a Mongo E11000 response for
    // normal release retries.
    const priorRelease = await this.findReleaseClaim(campaignId, influencerId, uniqueIds);
    if (priorRelease) {
      this.assertReleaseClaimMatches(priorRelease, campaignId, influencerId, uniqueIds);
      if (priorRelease.status === "settled") {
        return {
          ...releaseResponse(priorRelease, { idempotent: true }),
          message: "Approved earnings were already released to the influencer wallet",
        };
      }
      if (releaseMatchesExactDeliverables(priorRelease, uniqueIds)) {
        // A prior standalone attempt can persist its release claim before a
        // later operation fails. Resume that same claim instead of creating a
        // second release or making an admin manually repair the records.
        const recovered = await this.releasePaymentWithRecovery(campaignId, influencerId, uniqueIds, releasedBy);
        return {
          ...recovered,
          message: recovered.idempotent
            ? "Approved earnings were already released to the influencer wallet"
            : "Existing payment release recovered and settled successfully",
        };
      }
      throw new ApiError(
        409,
        "This deliverable belongs to a payment release that is already in progress. Refresh the release queue.",
        "RELEASE_IN_PROGRESS",
        { releaseId: priorRelease._id }
      );
    }

    const result = await withOptionalTransaction(async (session) => {
      if (!session) {
        if (!this.standaloneReleaseEnabled()) {
          throw new ApiError(
            503,
            "Escrow releases require MongoDB transaction support. Use a replica set or explicitly enable the recoverable development release mode."
          );
        }
        return this.releasePaymentWithRecovery(campaignId, influencerId, uniqueIds, releasedBy);
      }
      const campaign = await withSession(Campaign.findById(campaignId), session);
      if (!campaign) throw new ApiError(404, "Campaign not found");
      if (!hasFixedRewardCampaign(campaign)) {
        throw new ApiError(400, "Campaign has no fixed reward to release");
      }
      if (String(campaign.influencerId) !== String(influencerId)) {
        throw new ApiError(400, "Influencer does not match this campaign");
      }
      const vendorId = campaign.vendorId;
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

      const claimedRelease = await this.findReleaseClaim(campaignId, influencerId, uniqueIds, session);
      if (claimedRelease) {
        this.assertReleaseClaimMatches(claimedRelease, campaignId, influencerId, uniqueIds);
        if (claimedRelease.status === "settled") {
          return releaseResponse(claimedRelease, { idempotent: true });
        }
        throw new ApiError(
          409,
          "A payment release for these deliverables is already in progress. Refresh the release queue.",
          "RELEASE_IN_PROGRESS",
          { releaseId: claimedRelease._id }
        );
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

      const allocations = await withSession(CampaignDeliverableFunding.find({
        deliverableId: { $in: uniqueIds },
        campaignId,
        escrowWalletId: escrow._id,
        remainingAmount: { $gt: 0 },
        status: { $in: ["funded", "partially_released"] },
      }), session);
      if (allocations.length !== uniqueIds.length) {
        throw new ApiError(409, "One or more deliverable allocations were already released or are not funded");
      }
      const allocationByDeliverable = new Map(allocations.map((row) => [String(row.deliverableId), row]));
      const processedDeliverables = deliverables.map((deliverable) => ({
        deliverableId: deliverable._id,
        type: deliverable.deliverableType,
        title: deliverable.title,
        amount: money(allocationByDeliverable.get(String(deliverable._id)).remainingAmount),
        approvedAt: deliverable.completedAt || new Date(),
      }));
      const totalReleaseAmount = money(processedDeliverables.reduce((sum, row) => sum + row.amount, 0));
      if (totalReleaseAmount <= 0) throw new ApiError(400, "Approved deliverables have no payable value");
      if (totalReleaseAmount > money(escrow.amountRemaining)) {
        throw new ApiError(400, `Insufficient escrow funds. Available: ${escrow.amountRemaining}, requested: ${totalReleaseAmount}`);
      }

      let paymentRelease;
      try {
        [paymentRelease] = await CampaignPaymentRelease.create([{
          campaignId,
          escrowWalletId: escrow._id,
          vendorId,
          influencerId,
          releaseKey: buildReleaseKey(campaignId, influencerId, uniqueIds),
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
      } catch (error) {
        if (error?.code !== 11000) throw error;
        // A competing request won the unique index race. The transaction will
        // roll back, but the caller still receives an actionable domain error.
        throw new ApiError(
          409,
          "A payment release for one or more deliverables already exists. Refresh the release queue.",
          "DELIVERABLE_ALREADY_CLAIMED",
          { deliverableIds: sortedDeliverableIds(uniqueIds) }
        );
      }

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
              actorRole: "admin",
              details: { releaseId: paymentRelease._id, totalAmount: totalReleaseAmount, deliverableIds: uniqueIds },
            },
          },
        },
        { returnDocument: "after", session: session || undefined }
      );
      if (!updatedEscrow) throw new ApiError(409, "Escrow balance changed; retry the release");
      for (const allocation of allocations) {
        const releaseAmount = money(allocation.remainingAmount);
        const updated = await CampaignDeliverableFunding.findOneAndUpdate(
          { _id: allocation._id, remainingAmount: releaseAmount },
          {
            $inc: { releasedAmount: releaseAmount, remainingAmount: -releaseAmount },
            $set: { status: "released" },
          },
          { returnDocument: "after", session }
        );
        if (!updated) throw new ApiError(409, "Deliverable funding allocation changed; retry the release");
      }

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
      await CampaignEscrowLedger.create([{
        campaignId,
        escrowWalletId: escrow._id,
        releaseId: paymentRelease._id,
        vendorId,
        influencerId,
        entryType: "deliverable_release",
        direction: "debit",
        amount: totalReleaseAmount,
        balanceAfter: updatedEscrow.amountRemaining,
        currency: escrow.currency,
        idempotencyKey: `campaign-release:${paymentRelease._id}`,
        metadata: { deliverableIds: uniqueIds, influencerLedgerId: ledgerEntry._id },
      }], { session });

      await DeliverablePayout.updateMany(
        { deliverableId: { $in: uniqueIds }, campaignId, status: "eligible" },
        { $set: { status: "released", "metadata.releaseId": paymentRelease._id, "metadata.releasedAt": new Date() } },
        { session: session || undefined }
      );
      await CampaignDeliverable.updateMany(
        { _id: { $in: uniqueIds }, campaignId },
        {
          $set: {
            status: "completed",
            completionStatus: "completed",
            paymentEligibility: "paid",
            completedAt: new Date(),
          },
        },
        { session }
      );
      paymentRelease.walletTransactionId = ledgerEntry._id;
      paymentRelease.settledAt = new Date();
      paymentRelease.status = "settled";
      await paymentRelease.save({ session: session || undefined });
      await Campaign.updateOne(
        { _id: campaignId },
        {
          $set: {
            "fixedPaymentWorkflow.status":
              money(updatedEscrow.amountRemaining) === 0 ? "fully_released" : "partially_released",
            "fixedPaymentWorkflow.lastTransitionAt": new Date(),
          },
        },
        { session }
      );

      return {
        releaseId: paymentRelease._id,
        totalAmount: totalReleaseAmount,
        netAmount: totalReleaseAmount,
        platformFee: 0,
        status: "settled",
      };
    }, { source: "campaign-escrow-release" });

    if (!result.idempotent) {
      await auditService.log({
        actor: { _id: releasedBy, role: "admin" },
        action: "campaign.escrow.released",
        entityType: "CampaignPaymentRelease",
        entityId: result.releaseId,
        metadata: { campaignId, influencerId, amount: result.totalAmount, deliverableIds: uniqueIds },
      }).catch(() => {});
      await emitDomainEvent("ESCROW_RELEASED", {
        campaignId,
        influencerId,
        releaseId: result.releaseId,
        amount: result.totalAmount,
        deliverableIds: uniqueIds,
      }).catch(() => null);
      const influencer = await InfluencerProfile.findById(influencerId).select("userId").lean();
      if (influencer?.userId) {
        await notificationService.createNotification({
          userId: influencer.userId,
          role: "INFLUENCER",
          module: "FINANCE",
          subModule: "INFLUENCER_COMMERCE",
          type: "COMMISSION_PAID",
          title: "Campaign earnings released",
          message: `INR ${result.totalAmount} from approved campaign deliverables is now available in your wallet.`,
          referenceId: result.releaseId,
          meta: { campaignId: String(campaignId), releaseId: String(result.releaseId) },
        }).catch(() => null);
      }
    }
    return { ...result, message: "Approved earnings released to the influencer wallet" };
  }

  async releasePaymentWithRecovery(campaignId, influencerId, uniqueIds, releasedBy) {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new ApiError(404, "Campaign not found");
    if (!hasFixedRewardCampaign(campaign)) {
      throw new ApiError(400, "Campaign has no fixed reward to release");
    }
    if (String(campaign.influencerId) !== String(influencerId)) {
      throw new ApiError(400, "Influencer does not match this campaign");
    }
    const vendorId = campaign.vendorId;
    const activeRefund = await CampaignRefund.findOne({
      campaignId,
      status: { $in: ["requested", "approved", "processing"] },
    });
    if (activeRefund) {
      throw new ApiError(409, "Campaign earnings cannot be released while a refund is pending");
    }

    const escrow = await CampaignEscrowWallet.findOne({ campaignId, vendorId });
    if (!escrow) throw new ApiError(404, "Escrow wallet not found");
    if (!["funded", "partially_released", "fully_released"].includes(escrow.status)) {
      throw new ApiError(400, `Cannot release payments in current escrow status: ${escrow.status}`);
    }

    const deliverables = await CampaignDeliverable.find({
      _id: { $in: uniqueIds },
      campaignId,
      vendorId,
      influencerId,
      approvalStatus: "approved",
      paymentEligibility: { $in: ["eligible", "paid"] },
    });
    if (deliverables.length !== uniqueIds.length) {
      throw new ApiError(400, "Every deliverable must be approved and owned by this campaign");
    }

    const allocations = await CampaignDeliverableFunding.find({
      deliverableId: { $in: uniqueIds },
      campaignId,
      escrowWalletId: escrow._id,
    });
    if (allocations.length !== uniqueIds.length) {
      throw new ApiError(409, "One or more deliverable funding allocations are missing");
    }
    const allocationByDeliverable = new Map(allocations.map((row) => [String(row.deliverableId), row]));
    const processedDeliverables = deliverables.map((deliverable) => {
      const allocation = allocationByDeliverable.get(String(deliverable._id));
      return {
        deliverableId: deliverable._id,
        type: deliverable.deliverableType,
        title: deliverable.title,
        amount: money(allocation.allocatedAmount),
        approvedAt: deliverable.completedAt || new Date(),
      };
    });
    let totalReleaseAmount = money(processedDeliverables.reduce((sum, row) => sum + row.amount, 0));

    let paymentRelease = await this.findReleaseClaim(campaignId, influencerId, uniqueIds);
    if (paymentRelease) {
      this.assertReleaseClaimMatches(paymentRelease, campaignId, influencerId, uniqueIds);
      if (paymentRelease.status === "settled") {
        return releaseResponse(paymentRelease, { idempotent: true });
      }
      if (!releaseMatchesExactDeliverables(paymentRelease, uniqueIds)) {
        throw new ApiError(
          409,
          "This deliverable belongs to a payment release that is already in progress. Refresh the release queue.",
          "RELEASE_IN_PROGRESS",
          { releaseId: paymentRelease._id }
        );
      }
      totalReleaseAmount = money(paymentRelease.totalAmount);
    } else {
      try {
        paymentRelease = await CampaignPaymentRelease.create({
          campaignId,
          escrowWalletId: escrow._id,
          vendorId,
          influencerId,
          releaseKey: buildReleaseKey(campaignId, influencerId, uniqueIds),
          deliverables: processedDeliverables,
          totalAmount: totalReleaseAmount,
          platformFeeAmount: 0,
          netAmount: totalReleaseAmount,
          status: "approved",
          approvedBy: releasedBy,
          approvalReason: "Approved campaign deliverables",
          approvedAt: new Date(),
          partialRelease: totalReleaseAmount < money(escrow.budgetAmount),
          auditLog: [{
            action: "standalone_release_claimed",
            actor: releasedBy,
            actorRole: "admin",
            details: { deliverableIds: uniqueIds },
          }],
        });
      } catch (error) {
        if (error?.code !== 11000) throw error;
        paymentRelease = await this.findReleaseClaim(campaignId, influencerId, uniqueIds);
        if (!paymentRelease) throw error;
        this.assertReleaseClaimMatches(paymentRelease, campaignId, influencerId, uniqueIds);
        if (paymentRelease.status === "settled") return releaseResponse(paymentRelease, { idempotent: true });
        if (!releaseMatchesExactDeliverables(paymentRelease, uniqueIds)) {
          throw new ApiError(
            409,
            "This deliverable belongs to a payment release that is already in progress. Refresh the release queue.",
            "RELEASE_IN_PROGRESS",
            { releaseId: paymentRelease._id }
          );
        }
        totalReleaseAmount = money(paymentRelease.totalAmount);
      }
    }

    const releaseId = paymentRelease._id;
    let updatedEscrow = await CampaignEscrowWallet.findById(escrow._id);
    const escrowAlreadyDebited = updatedEscrow.partialReleases.some(
      (row) => String(row.releaseId) === String(releaseId)
    );
    if (!escrowAlreadyDebited) {
      updatedEscrow = await CampaignEscrowWallet.findOneAndUpdate(
        {
          _id: escrow._id,
          amountRemaining: { $gte: totalReleaseAmount },
          status: { $in: ["funded", "partially_released"] },
          "partialReleases.releaseId": { $ne: releaseId },
        },
        {
          $inc: { amountReleased: totalReleaseAmount, amountRemaining: -totalReleaseAmount },
          $set: {
            status: money(escrow.amountRemaining) === totalReleaseAmount ? "fully_released" : "partially_released",
            lastReleaseAt: new Date(),
            ...(escrow.firstReleaseAt ? {} : { firstReleaseAt: new Date() }),
          },
          $push: {
            partialReleases: { releaseId, amount: totalReleaseAmount, releasedAt: new Date() },
            auditLog: {
              action: "payment_released",
              actor: releasedBy,
              actorRole: "admin",
              details: { releaseId, totalAmount: totalReleaseAmount, deliverableIds: uniqueIds },
            },
          },
        },
        { returnDocument: "after" }
      );
      if (!updatedEscrow) throw new ApiError(409, "Escrow balance changed; retry the release");
    }

    for (const allocation of allocations) {
      if (allocation.status === "released" && money(allocation.remainingAmount) === 0) continue;
      const releaseAmount = money(allocation.remainingAmount);
      const updated = await CampaignDeliverableFunding.findOneAndUpdate(
        {
          _id: allocation._id,
          remainingAmount: releaseAmount,
          status: { $in: ["funded", "partially_released"] },
        },
        {
          $inc: { releasedAmount: releaseAmount, remainingAmount: -releaseAmount },
          $set: { status: "released" },
        },
        { returnDocument: "after" }
      );
      if (!updated) {
        const current = await CampaignDeliverableFunding.findById(allocation._id).lean();
        if (current?.status !== "released" || money(current.remainingAmount) !== 0) {
          throw new ApiError(409, "Deliverable allocation changed; retry the release");
        }
      }
    }

    let wallet = await InfluencerWallet.findOneAndUpdate(
      { influencerId },
      { $setOnInsert: { influencerId } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    if (wallet.status !== "active") throw new ApiError(400, "Influencer wallet is not active");
    if (!wallet.creditedCampaignReleaseIds.some((id) => String(id) === String(releaseId))) {
      wallet = await InfluencerWallet.findOneAndUpdate(
        {
          _id: wallet._id,
          status: "active",
          creditedCampaignReleaseIds: { $ne: releaseId },
        },
        {
          $inc: { availableBalance: totalReleaseAmount, totalEarnings: totalReleaseAmount },
          $addToSet: { creditedCampaignReleaseIds: releaseId },
        },
        { returnDocument: "after", runValidators: true }
      );
      if (!wallet) wallet = await InfluencerWallet.findOne({ influencerId });
    }

    const ledgerEntry = await InfluencerLedger.findOneAndUpdate(
      { idempotencyKey: `campaign-release:${releaseId}` },
      {
        $setOnInsert: {
          influencerId,
          type: "CREDIT",
          amount: totalReleaseAmount,
          source: "CAMPAIGN",
          idempotencyKey: `campaign-release:${releaseId}`,
          balanceAfter: wallet.availableBalance,
          meta: { campaignId, releaseId, deliverableIds: uniqueIds },
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    await CampaignEscrowLedger.findOneAndUpdate(
      { idempotencyKey: `campaign-release:${releaseId}` },
      {
        $setOnInsert: {
          campaignId,
          escrowWalletId: escrow._id,
          releaseId,
          vendorId,
          influencerId,
          entryType: "deliverable_release",
          direction: "debit",
          amount: totalReleaseAmount,
          balanceAfter: updatedEscrow.amountRemaining,
          currency: escrow.currency,
          idempotencyKey: `campaign-release:${releaseId}`,
          metadata: { deliverableIds: uniqueIds, influencerLedgerId: ledgerEntry._id },
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    await DeliverablePayout.updateMany(
      { deliverableId: { $in: uniqueIds }, campaignId },
      { $set: { status: "released", "metadata.releaseId": releaseId, "metadata.releasedAt": new Date() } }
    );
    await CampaignDeliverable.updateMany(
      { _id: { $in: uniqueIds }, campaignId },
      {
        $set: {
          status: "completed",
          completionStatus: "completed",
          paymentEligibility: "paid",
          completedAt: new Date(),
        },
      }
    );
    await Campaign.updateOne(
      { _id: campaignId },
      {
        $set: {
          "fixedPaymentWorkflow.status":
            money(updatedEscrow.amountRemaining) === 0 ? "fully_released" : "partially_released",
          "fixedPaymentWorkflow.lastTransitionAt": new Date(),
        },
      }
    );
    paymentRelease.walletTransactionId = ledgerEntry._id;
    paymentRelease.releasedAt = paymentRelease.releasedAt || new Date();
    paymentRelease.settledAt = new Date();
    paymentRelease.status = "settled";
    paymentRelease.auditLog.push({
      action: "standalone_release_settled",
      actor: releasedBy,
      actorRole: "admin",
      details: { recoverable: true },
    });
    await paymentRelease.save();

    return {
      releaseId,
      totalAmount: totalReleaseAmount,
      netAmount: totalReleaseAmount,
      platformFee: 0,
      status: "settled",
      recoverableStandaloneMode: true,
    };
  }

  async listAdminReleaseQueue(filters = {}) {
    const campaignFilter = { paymentType: { $in: ["fixed", "hybrid"] } };
    if (filters.campaignId) campaignFilter._id = filters.campaignId;
    if (filters.vendorId) campaignFilter.vendorId = filters.vendorId;
    const campaigns = await Campaign.find(campaignFilter)
      .select("_id title state vendorId influencerId fixedPaymentWorkflow")
      .populate("vendorId", "shopName companyName")
      .populate({ path: "influencerId", populate: { path: "userId", select: "name email username" } })
      .lean();
    const campaignIds = campaigns.map((row) => row._id);
    if (!campaignIds.length) return { items: [], total: 0 };

    const deliverables = await CampaignDeliverable.find({
      campaignId: { $in: campaignIds },
      approvalStatus: "approved",
      paymentEligibility: "eligible",
    }).lean();
    const allocations = deliverables.length
      ? await CampaignDeliverableFunding.find({
          deliverableId: { $in: deliverables.map((row) => row._id) },
          remainingAmount: { $gt: 0 },
          status: { $in: ["funded", "partially_released"] },
        }).lean()
      : [];
    const settledReleases = await CampaignPaymentRelease.find({
      campaignId: { $in: campaignIds },
      status: "settled",
    }).select("deliverables.deliverableId").lean();
    const settledDeliverableIds = new Set(
      settledReleases.flatMap((release) => (release.deliverables || []).map((row) => String(row.deliverableId)))
    );
    const allocationMap = new Map(allocations.map((row) => [String(row.deliverableId), row]));
    const campaignMap = new Map(campaigns.map((row) => [String(row._id), row]));
    const items = deliverables
      .filter((row) => allocationMap.has(String(row._id)) && !settledDeliverableIds.has(String(row._id)))
      .map((row) => {
        const campaign = campaignMap.get(String(row.campaignId));
        const allocation = allocationMap.get(String(row._id));
        return {
          campaign,
          deliverableId: row._id,
          deliverableType: row.deliverableType,
          title: row.title,
          approvalStatus: row.approvalStatus,
          paymentEligibility: row.paymentEligibility,
          amount: allocation.remainingAmount,
          allocationStatus: allocation.status,
        };
      });
    const pendingReleases = await CampaignPaymentRelease.find({
      campaignId: { $in: campaignIds },
      status: { $in: ["approved", "released"] },
    }).lean();
    const existingDeliverableIds = new Set(items.map((row) => String(row.deliverableId)));
    for (const release of pendingReleases) {
      const campaign = campaignMap.get(String(release.campaignId));
      for (const row of release.deliverables || []) {
        if (existingDeliverableIds.has(String(row.deliverableId))) continue;
        items.push({
          campaign,
          deliverableId: row.deliverableId,
          deliverableType: row.type,
          title: row.title,
          approvalStatus: "approved",
          paymentEligibility: "eligible",
          amount: row.amount,
          allocationStatus: "release_recovery",
        });
      }
    }
    return { items, total: items.length };
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
    const fundingAllocations = await CampaignDeliverableFunding.find({
      campaignId,
      escrowWalletId: escrow._id,
      remainingAmount: { $gt: 0 },
      status: { $in: ["funded", "partially_released"] },
    }).lean();
    const grossRefundAmount = money(fundingAllocations.reduce((sum, row) => sum + Number(row.remainingAmount || 0), 0));
    if (grossRefundAmount <= 0) throw new ApiError(400, "No unreleased deliverable funding is available to refund");
    const refundFees = await campaignFeeService.calculateRefundFees(grossRefundAmount, {
      partial: money(escrow.amountReleased) > 0,
    });

    const refund = new CampaignRefund({
      campaignId,
      escrowWalletId: escrow._id,
      vendorId,
      paymentOrderId: paymentOrder._id,
      budgetAmount: grossRefundAmount,
      platformFeeAmount: 0,
      gatewayFeeAmount: 0,
      taxAmount: 0,
      grossRefundAmount,
      processingFeeAmount: refundFees.processingFeeAmount,
      partialRefundFeeAmount: refundFees.partialRefundFeeAmount,
      totalRefundAmount: refundFees.totalRefundAmount,
      feeConfigurationSnapshot: refundFees.feeConfigurationSnapshot,
      fundingAllocationIds: fundingAllocations.map((row) => row._id),
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
        details: { reason, grossRefundAmount, totalRefundAmount: refundFees.totalRefundAmount },
      }],
    });
    await refund.save();
    await Campaign.updateOne(
      { _id: campaignId, paymentType: { $in: ["fixed", "hybrid"] } },
      {
        $set: {
          "fixedPaymentWorkflow.status": "refund_pending",
          "fixedPaymentWorkflow.contentEnabled": false,
          "fixedPaymentWorkflow.lastTransitionAt": new Date(),
        },
      }
    );

    return {
      refundId: refund._id,
      totalRefundAmount: refundFees.totalRefundAmount,
      grossRefundAmount,
      budgetRefund: grossRefundAmount,
      processingFeeAmount: refundFees.processingFeeAmount,
      partialRefundFeeAmount: refundFees.partialRefundFeeAmount,
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
        $set: { status: "approved", refundStatus: "refund_approved", approvedBy, approvalReason, approvedAt: new Date() },
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
    const allocations = await CampaignDeliverableFunding.find({ campaignId, escrowWalletId: escrow._id })
      .sort({ allocationKey: 1 })
      .lean();
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
      feeConfigurationSnapshot: escrow.feeConfigurationSnapshot,
      fundingAllocations: allocations,
    };
  }
}

module.exports = new CampaignEscrowService();
