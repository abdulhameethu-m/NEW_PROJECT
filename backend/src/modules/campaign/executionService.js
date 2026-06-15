const mongoose = require("mongoose");
const { AppError } = require("../../utils/AppError");
const auditService = require("../../services/audit.service");
const notificationService = require("../../services/notification.service");
const vendorRepo = require("../../repositories/vendor.repository");
const influencerService = require("../influencer/service");
const { CommissionRecord } = require("../commission/models");
const { Campaign, CampaignStatusHistory } = require("./model");
const { Reel } = require("../reel/model");
const CampaignDeliverableFunding = require("../../models/CampaignDeliverableFunding");
const CampaignEscrowWallet = require("../../models/CampaignEscrowWallet");
const {
  CampaignDeliverable,
  DeliverableSubmission,
  DeliverableReview,
  DeliverablePayout,
  CampaignExecutionAudit,
} = require("./executionModel");

const ACTIVE_STATES = [
  "accepted",
  "active",
  "product_shipped",
  "content_in_progress",
  "content_submitted",
  "under_review",
  "revision_requested",
  "approved",
  "published",
  "tracking_active",
  "partially_completed",
  "completed",
];

function money(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
}

function objectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function titleize(value = "") {
  return String(value || "Deliverable").replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function serviceRows(campaign = {}) {
  const payment = campaign.paymentModelSnapshot || {};
  const rate = campaign.influencerRateSnapshot || {};
  const contract = campaign.contractSnapshot || {};
  return [
    ...(Array.isArray(rate.selectedServices) ? rate.selectedServices : []),
    ...(Array.isArray(payment.selectedServices) ? payment.selectedServices : []),
    ...(Array.isArray(payment.services) ? payment.services : []),
    ...(Array.isArray(contract.paymentModel?.selectedServices) ? contract.paymentModel.selectedServices : []),
    ...(Array.isArray(contract.influencerRateCard?.selectedServices) ? contract.influencerRateCard.selectedServices : []),
  ];
}

function fallbackDeliverables(campaign = {}) {
  const required = campaign.marketplace?.requiredDeliverables || [];
  return required.map((name) => ({
    deliverableType: String(name || "deliverable").toLowerCase().replace(/\s+/g, "_"),
    title: titleize(name),
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
    currency: campaign.pricing?.currency || "INR",
    source: "marketplace_required_deliverables",
    snapshot: { name },
  }));
}

function normalizeServiceDeliverable(row = {}, campaign = {}) {
  const quantity = Math.max(1, Number(row.quantity || row.units || 1));
  const total = money(row.total || row.totalPrice || row.price || row.packagePrice || 0);
  const unitPrice = money(row.unitPrice || (quantity ? total / quantity : total));
  const serviceName = row.serviceName || row.packageName || row.serviceType || row.serviceTypeKey || row.type || "Deliverable";
  return {
    deliverableType: String(row.serviceTypeKey || row.serviceType || row.type || serviceName).toLowerCase().replace(/\s+/g, "_"),
    title: serviceName,
    quantity,
    unitPrice,
    totalPrice: money(total || unitPrice * quantity),
    currency: row.currency || campaign.pricing?.currency || "INR",
    expectedCompletionDate: row.dueDate || campaign.deadline || campaign.marketplace?.requirements?.contentSubmissionDeadline || undefined,
    source: "selected_services",
    snapshot: row,
  };
}

function dedupeDeliverables(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    const key = [row.deliverableType, row.title, row.quantity, row.totalPrice].join(":");
    if (!map.has(key)) map.set(key, row);
  });
  return [...map.values()];
}

function deriveDeliverables(campaign = {}) {
  const rows = dedupeDeliverables(serviceRows(campaign).map((row) => normalizeServiceDeliverable(row, campaign)));
  if (rows.length) return rows;
  return fallbackDeliverables(campaign);
}

function progress(deliverables = []) {
  const total = deliverables.length;
  const completed = deliverables.filter((row) => row.completionStatus === "completed" || row.status === "completed").length;
  return {
    completed,
    total,
    completionPercent: total ? Math.round((completed / total) * 100) : 0,
  };
}

function campaignBudget(campaign = {}) {
  return money(campaign.pricing?.totalBudget || campaign.fixedFee || campaign.paymentModelSnapshot?.expectedBudget || 0);
}

async function assertFixedContentEnabled(campaign) {
  if (campaign.paymentType !== "fixed") return;
  const escrow = await CampaignEscrowWallet.findOne({
    campaignId: campaign._id,
    vendorId: campaign.vendorId?._id || campaign.vendorId,
    status: { $in: ["funded", "partially_released", "fully_released"] },
  }).select("_id status").lean();
  if (!campaign.fixedPaymentWorkflow?.contentEnabled || !escrow) {
    throw new AppError(
      "Content creation is locked until the vendor funds escrow and Razorpay confirms the payment",
      409,
      "ESCROW_FUNDING_REQUIRED"
    );
  }
}

async function audit({ actorId, role, action, campaignId, deliverableId = null, submissionId = null, oldValue = null, newValue = null, metadata = {} }) {
  await CampaignExecutionAudit.create({ userId: actorId, role, action, campaignId, deliverableId, submissionId, oldValue, newValue, metadata });
  await auditService.log({
    actor: { _id: actorId, role },
    action: `campaign.execution.${action}`,
    entityType: "CampaignExecution",
    entityId: deliverableId || campaignId,
    metadata: { campaignId, deliverableId, submissionId, oldValue, newValue, ...metadata },
  }).catch(() => {});
}

class CampaignExecutionService {
  async ensureDeliverables(campaign) {
    const existing = await CampaignDeliverable.find({ campaignId: campaign._id }).sort({ createdAt: 1 });
    if (existing.length) return existing;
    const rows = deriveDeliverables(campaign);
    if (!rows.length) return [];
    const allocations = campaign.paymentType === "fixed"
      ? await CampaignDeliverableFunding.find({ campaignId: campaign._id }).sort({ allocationKey: 1 })
      : [];
    const created = await CampaignDeliverable.insertMany(rows.map((row, index) => ({
      ...row,
      campaignId: campaign._id,
      influencerId: campaign.influencerId?._id || campaign.influencerId,
      vendorId: campaign.vendorId?._id || campaign.vendorId,
      fundingAllocationId: allocations[index]?._id || null,
    })));
    if (allocations.length) {
      await Promise.all(created.map((deliverable, index) => {
        const allocation = allocations[index];
        if (!allocation) return null;
        return CampaignDeliverableFunding.updateOne(
          { _id: allocation._id, deliverableId: null },
          { $set: { deliverableId: deliverable._id } }
        );
      }));
    }
    return created;
  }

  async influencerExecution(userId, campaignId) {
    const profile = await influencerService.getProfile(userId);
    const campaign = await Campaign.findById(campaignId).populate("vendorId", "shopName companyName").lean();
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
    if (String(campaign.influencerId || "") !== String(profile._id)) throw new AppError("Forbidden", 403, "FORBIDDEN");
    if (!ACTIVE_STATES.includes(campaign.state)) throw new AppError("Campaign must be accepted before content execution", 409, "INVALID_STATE");
    await assertFixedContentEnabled(campaign);
    const deliverables = await this.ensureDeliverables(campaign);
    return this.presentExecution(campaign, deliverables, profile._id);
  }

  async vendorExecution(userId, campaignId) {
    const vendor = await vendorRepo.findByUserId(userId);
    if (!vendor) throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
    const campaign = await Campaign.findOne({ _id: campaignId, vendorId: vendor._id }).populate({ path: "influencerId", populate: { path: "userId", select: "name email username" } }).lean();
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
    const deliverables = await this.ensureDeliverables(campaign);
    return this.presentExecution(campaign, deliverables, campaign.influencerId?._id || campaign.influencerId);
  }

  async presentExecution(campaign, deliverables, influencerId) {
    const deliverableIds = deliverables.map((row) => row._id);
    const [submissions, payouts, commissions] = await Promise.all([
      deliverableIds.length ? DeliverableSubmission.find({ deliverableId: { $in: deliverableIds } }).sort({ submittedAt: -1 }).lean() : [],
      deliverableIds.length ? DeliverablePayout.find({ deliverableId: { $in: deliverableIds } }).lean() : [],
      CommissionRecord.find({ campaignId: campaign._id, influencerId }).lean().catch(() => []),
    ]);
    const submissionMap = submissions.reduce((map, row) => {
      const key = String(row.deliverableId);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
      return map;
    }, new Map());
    const payoutMap = new Map(payouts.map((row) => [String(row.deliverableId), row]));
    const approvedValue = money(deliverables.filter((row) => row.paymentEligibility === "eligible" || row.status === "completed").reduce((sum, row) => sum + Number(row.totalPrice || 0), 0));
    const totalDeliverableValue = money(deliverables.reduce((sum, row) => sum + Number(row.totalPrice || 0), 0));
    const commissionPayout = money(commissions.reduce((sum, row) => sum + Number(row.influencerShare || 0), 0));
    const paymentType = campaign.paymentType || "commission";
    const fixedFee = money(campaign.fixedFee || campaign.pricing?.fixedCost || 0);
    const hybridRatio = totalDeliverableValue ? approvedValue / totalDeliverableValue : 0;
    const fixedEligible = paymentType === "fixed" ? approvedValue : paymentType === "hybrid" ? money((fixedFee || totalDeliverableValue) * hybridRatio) : 0;
    const eligiblePayout = paymentType === "commission"
      ? commissionPayout
      : paymentType === "hybrid"
        ? money(fixedEligible + commissionPayout)
        : paymentType === "free_product"
          ? 0
          : fixedEligible;
    return {
      campaign: {
        id: campaign._id,
        title: campaign.title || "Campaign",
        campaignType: campaign.campaignType,
        vendor: campaign.vendorId,
        influencer: campaign.influencerId,
        paymentModel: paymentType,
        budget: campaignBudget(campaign),
        startDate: campaign.createdAt,
        endDate: campaign.deadline || campaign.marketplace?.applicationDeadline || null,
        status: campaign.state,
        fixedPaymentWorkflow: campaign.fixedPaymentWorkflow || null,
        contentEnabled: paymentType !== "fixed" || Boolean(campaign.fixedPaymentWorkflow?.contentEnabled),
      },
      progress: progress(deliverables),
      payout: {
        paymentModel: paymentType,
        approvedDeliverableValue: approvedValue,
        totalDeliverableValue,
        fixedFeeEligible: fixedEligible,
        commissionEarnings: commissionPayout,
        eligiblePayout,
        releasedEarnings: money(payouts.filter((row) => row.status === "released").reduce((sum, row) => sum + Number(row.approvedAmount || 0), 0)),
      },
      deliverables: deliverables.map((row) => ({
        id: row._id,
        deliverableType: row.deliverableType,
        title: row.title || titleize(row.deliverableType),
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        totalPrice: row.totalPrice,
        currency: row.currency,
        expectedCompletionDate: row.expectedCompletionDate,
        status: row.status,
        approvalStatus: row.approvalStatus,
        completionStatus: row.completionStatus,
        paymentEligibility: row.paymentEligibility,
        latestSubmissionId: row.latestSubmissionId,
        fundingAllocationId: row.fundingAllocationId,
        submissions: submissionMap.get(String(row._id)) || [],
        payout: payoutMap.get(String(row._id)) || null,
      })),
    };
  }

  async submit(userId, campaignId, deliverableId, payload = {}) {
    const profile = await influencerService.getProfile(userId);
    const campaign = await Campaign.findOne({ _id: campaignId, influencerId: profile._id }).lean();
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
    await assertFixedContentEnabled(campaign);
    const deliverable = await CampaignDeliverable.findOne({ _id: deliverableId, campaignId, influencerId: profile._id });
    if (!deliverable) throw new AppError("Deliverable not found", 404, "NOT_FOUND");
    if (["approved", "completed", "cancelled"].includes(deliverable.status)) throw new AppError("This deliverable is closed for uploads", 409, "INVALID_STATE");
    const latest = await DeliverableSubmission.findOne({ deliverableId }).sort({ version: -1 }).lean();
    const oldValue = { status: deliverable.status, approvalStatus: deliverable.approvalStatus };
    const submission = await DeliverableSubmission.create({
      deliverableId,
      campaignId,
      influencerId: profile._id,
      contentUrl: payload.contentUrl,
      contentType: payload.contentType || "url",
      uploadedBy: userId,
      version: Number(latest?.version || 0) + 1,
      status: "under_review",
      notes: payload.notes || "",
    });
    deliverable.status = "under_review";
    deliverable.approvalStatus = "under_review";
    deliverable.latestSubmissionId = submission._id;
    await deliverable.save();
    await Campaign.findByIdAndUpdate(campaignId, { $set: { state: "under_review" }, $push: { history: { state: "under_review", actorId: userId, note: "Deliverable content uploaded", changedAt: new Date() } } });
    await audit({ actorId: userId, role: "influencer", action: "content_uploaded", campaignId, deliverableId, submissionId: submission._id, oldValue, newValue: { status: "under_review" } });
    return this.influencerExecution(userId, campaignId);
  }

  async review(userId, campaignId, deliverableId, payload = {}) {
    const vendor = await vendorRepo.findByUserId(userId);
    if (!vendor) throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
    const campaign = await Campaign.findOne({ _id: campaignId, vendorId: vendor._id });
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
    const deliverable = await CampaignDeliverable.findOne({ _id: deliverableId, campaignId, vendorId: vendor._id });
    if (!deliverable) throw new AppError("Deliverable not found", 404, "NOT_FOUND");
    const submission = await DeliverableSubmission.findById(payload.submissionId || deliverable.latestSubmissionId);
    if (!submission || String(submission.deliverableId) !== String(deliverable._id)) throw new AppError("Submission not found", 404, "NOT_FOUND");
    const decision = payload.decision === "approve" ? "approve" : payload.decision === "reject" ? "reject" : "revision_requested";
    const oldValue = { status: deliverable.status, approvalStatus: deliverable.approvalStatus };
    await DeliverableReview.create({
      submissionId: submission._id,
      deliverableId: deliverable._id,
      campaignId: campaign._id,
      vendorId: vendor._id,
      decision,
      comments: payload.comments || payload.note || "",
      reviewedBy: userId,
    });
    if (decision === "approve") {
      const allDeliverables = await CampaignDeliverable.find({ campaignId: campaign._id }).lean();
      const totalDeliverableValue = money(allDeliverables.reduce((sum, row) => sum + Number(row.totalPrice || 0), 0));
      const fixedFee = money(campaign.fixedFee || campaign.pricing?.fixedCost || 0);
      const funding = campaign.paymentType === "fixed"
        ? await CampaignDeliverableFunding.findOne({ campaignId: campaign._id, deliverableId: deliverable._id }).lean()
        : null;
      const approvedAmount = funding
        ? funding.remainingAmount
        : campaign.paymentType === "hybrid" && totalDeliverableValue
        ? money((Number(deliverable.totalPrice || 0) / totalDeliverableValue) * (fixedFee || totalDeliverableValue))
        : deliverable.totalPrice;
      submission.status = "approved";
      deliverable.status = campaign.paymentType === "fixed" ? "approved" : "completed";
      deliverable.approvalStatus = "approved";
      deliverable.completionStatus = "completed";
      deliverable.paymentEligibility = "eligible";
      deliverable.completedAt = new Date();
      await DeliverablePayout.findOneAndUpdate(
        { deliverableId: deliverable._id, influencerId: deliverable.influencerId },
        {
          $setOnInsert: {
            deliverableId: deliverable._id,
            campaignId: campaign._id,
            influencerId: deliverable.influencerId,
          },
          $set: {
            approvedAmount: ["fixed", "hybrid"].includes(campaign.paymentType) ? approvedAmount : 0,
            currency: deliverable.currency,
            status: campaign.paymentType === "commission" || campaign.paymentType === "free_product" ? "not_eligible" : "eligible",
            paymentModel: campaign.paymentType,
            metadata: { approvedBy: userId },
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
      if (campaign.paymentType === "fixed") {
        campaign.fixedPaymentWorkflow.status = "vendor_approved";
        campaign.fixedPaymentWorkflow.lastTransitionAt = new Date();
        await campaign.save();
        await notificationService.notifyAdmins({
          module: "FINANCE",
          subModule: "INFLUENCER_COMMERCE",
          type: "INFLUENCER_COMMERCE",
          title: "Fixed campaign release ready",
          message: `${campaign.title || "Campaign"} has an approved deliverable awaiting escrow release.`,
          referenceId: campaign._id,
          meta: {
            campaignId: String(campaign._id),
            deliverableId: String(deliverable._id),
            influencerId: String(deliverable.influencerId),
          },
        }, "influencerCommerce.read").catch(() => null);
      }
    } else {
      submission.status = decision === "reject" ? "rejected" : "revision_requested";
      deliverable.status = decision === "reject" ? "rejected" : "revision_requested";
      deliverable.approvalStatus = decision === "reject" ? "rejected" : "revision_requested";
      deliverable.paymentEligibility = "not_eligible";
    }
    await submission.save();
    await deliverable.save();
    await this.refreshCampaignStatus(campaign._id, userId);
    await audit({ actorId: userId, role: "vendor", action: decision === "approve" ? "deliverable_approved" : decision === "reject" ? "deliverable_rejected" : "revision_requested", campaignId, deliverableId, submissionId: submission._id, oldValue, newValue: { status: deliverable.status, approvalStatus: deliverable.approvalStatus } });
    return this.vendorExecution(userId, campaignId);
  }

  async refreshCampaignStatus(campaignId, actorId) {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return null;
    const deliverables = await CampaignDeliverable.find({ campaignId }).lean();
    const current = progress(deliverables);
    let nextStatus = campaign.state;
    // Only set to partially_completed or under_review, NOT completed
    // Campaign should only be marked completed when influencer publishes content
    if (current.completed > 0) nextStatus = "partially_completed";
    else if (deliverables.some((row) => row.status === "under_review")) nextStatus = "under_review";
    
    if (nextStatus !== campaign.state) {
      await CampaignStatusHistory.create({ campaignId, oldStatus: campaign.state, newStatus: nextStatus, changedBy: actorId, changedByRole: "system", reason: "Deliverable execution progress updated" });
      campaign.state = nextStatus;
      campaign.history.push({ state: nextStatus, actorId, note: "Deliverable execution progress updated", changedAt: new Date() });
      await campaign.save();
      await audit({ actorId, role: "system", action: "partial_completion", campaignId, oldValue: { state: campaign.state }, newValue: { state: nextStatus, progress: current } });
    }
    return campaign;
  }

  async reviewQueue(userId, query = {}) {
    const vendor = await vendorRepo.findByUserId(userId);
    if (!vendor) throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
    const campaignMatch = { vendorId: vendor._id };
    if (objectId(query.campaignId)) campaignMatch._id = objectId(query.campaignId);
    const campaigns = await Campaign.find(campaignMatch).select("_id title campaignType paymentType influencerId").lean();
    const campaignMap = new Map(campaigns.map((row) => [String(row._id), row]));
    const filter = { vendorId: vendor._id, campaignId: { $in: campaigns.map((row) => row._id) } };
    if (query.status) filter.status = query.status;
    else filter.status = { $in: ["under_review", "revision_requested", "rejected", "completed"] };
    const deliverables = await CampaignDeliverable.find(filter)
      .populate({ path: "influencerId", populate: { path: "userId", select: "name email username" } })
      .sort({ updatedAt: -1 })
      .limit(Math.min(100, Number(query.limit) || 50))
      .lean();
    const submissionIds = deliverables.map((row) => row.latestSubmissionId).filter(Boolean);
    const submissions = submissionIds.length ? await DeliverableSubmission.find({ _id: { $in: submissionIds } }).lean() : [];
    const submissionMap = new Map(submissions.map((row) => [String(row._id), row]));
    return {
      items: deliverables.map((row) => ({
        id: row._id,
        campaign: campaignMap.get(String(row.campaignId)) || null,
        influencer: row.influencerId,
        title: row.title || titleize(row.deliverableType),
        deliverableType: row.deliverableType,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        totalPrice: row.totalPrice,
        status: row.status,
        approvalStatus: row.approvalStatus,
        completionStatus: row.completionStatus,
        paymentEligibility: row.paymentEligibility,
        latestSubmission: submissionMap.get(String(row.latestSubmissionId)) || null,
      })),
    };
  }

  async checkAndCompleteCampaign(userId, campaignId) {
    // Get profile to verify influencer
    const profile = await influencerService.getProfile(userId);
    
    // Get campaign and verify it belongs to influencer
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
    if (String(campaign.influencerId || "") !== String(profile._id)) throw new AppError("Forbidden", 403, "FORBIDDEN");
    
    // Get all deliverables for campaign
    const deliverables = await CampaignDeliverable.find({ campaignId }).lean();
    if (!deliverables.length) return { success: false, message: "No deliverables found" };
    
    // Check if all deliverables have associated published content
    const publishedContent = await Reel.find({
      campaignId: campaignId,
      visibility: "published"
    }).lean().catch(() => []);
    
    const publishedCount = publishedContent.length;
    const totalDeliverables = deliverables.length;
    
    if (publishedCount === totalDeliverables && campaign.state !== "completed") {
      // All deliverables have been published - mark campaign as completed
      await CampaignStatusHistory.create({
        campaignId,
        oldStatus: campaign.state,
        newStatus: "completed",
        changedBy: userId,
        changedByRole: "influencer",
        reason: "All deliverables published to platform"
      });
      
      campaign.state = "completed";
      campaign.history.push({
        state: "completed",
        actorId: userId,
        note: "All deliverables published to platform",
        changedAt: new Date()
      });
      await campaign.save();
      
      await auditService.log({
        actorId: userId,
        role: "influencer",
        action: "campaign_completed",
        campaignId,
        metadata: { reason: "All deliverables published", publishedCount, totalDeliverables }
      });
      
      return { success: true, message: "Campaign marked as completed", campaignState: "completed" };
    }
    
    return { 
      success: false, 
      message: `Not all deliverables are published. ${publishedCount}/${totalDeliverables} published`,
      publishedCount,
      totalDeliverables
    };
  }
}

module.exports = new CampaignExecutionService();
module.exports.__private__ = { deriveDeliverables, progress, money };
