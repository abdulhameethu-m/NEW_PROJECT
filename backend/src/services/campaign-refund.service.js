const Razorpay = require("razorpay");
const CampaignRefund = require("../models/CampaignRefund");
const CampaignEscrowWallet = require("../models/CampaignEscrowWallet");
const CampaignPaymentOrder = require("../models/CampaignPaymentOrder");
const CampaignDeliverableFunding = require("../models/CampaignDeliverableFunding");
const CampaignEscrowLedger = require("../models/CampaignEscrowLedger");
const { Campaign } = require("../modules/campaign/model");
const CampaignPaymentRelease = require("../models/CampaignPaymentRelease");
const { CampaignDeliverable, DeliverableSubmission } = require("../modules/campaign/executionModel");
const campaignEscrowService = require("./campaign-escrow.service");
const auditService = require("./audit.service");
const notificationService = require("./notification.service");
const campaignFeeService = require("./campaign-fee.service");
const { ApiError } = require("../utils/ApiError");

function money(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
}

function reasonLabel(value = "") {
  return String(value || "other").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeRefundReason(value = "") {
  const key = String(value || "").toLowerCase().trim();
  return {
    campaign_expired: "campaign_expired",
    influencer_no_show: "influencer_no_show",
    rejected_deliverables: "rejected_deliverables",
    vendor_cancelled: "vendor_cancelled",
    mutual_cancellation: "mutual_cancellation",
    admin_decision: "admin_decision",
    other: "other",
    upload_expired: "submission_deadline_expired",
    awaiting_upload: "influencer_no_show",
    vendor_request: "vendor_request",
    submission_deadline_expired: "submission_deadline_expired",
    campaign_expired_no_upload: "campaign_expired_no_upload",
    influencer_rejected: "influencer_rejected",
    influencer_inactive: "influencer_inactive",
    admin_terminated: "admin_terminated",
    pending_sla_breached: "pending_sla_breached",
  }[key] || "other";
}

function refundUiStatus(status = "", eligibilityStatus = "") {
  if (status === "requested") return "refund_requested";
  if (status === "approved") return "refund_approved";
  if (status === "processing") return "refund_processing";
  if (status === "completed") return "refund_completed";
  if (status === "failed") return "refund_failed";
  if (status === "rejected") return "refund_rejected";
  return eligibilityStatus || "refund_eligible";
}

function refundActionLabel(status = "") {
  return {
    requested: "Refund Requested",
    approved: "Refund Approved",
    processing: "Refund Processing",
    completed: "Refund Completed",
    failed: "Refund Failed",
    rejected: "Refund Rejected",
  }[status] || "Refund Eligible";
}

function deliverableStatusLabel({ deliverable, allocation, release, latestSubmission, dueExpired, refundableAmount }) {
  const paymentEligibility = String(deliverable.paymentEligibility || "").toLowerCase();
  const approvalStatus = String(deliverable.approvalStatus || "").toLowerCase();
  const status = String(deliverable.status || "").toLowerCase();
  const allocationStatus = String(allocation?.status || "").toLowerCase();
  const releaseStatus = String(release?.status || "").toLowerCase();

  if (
    paymentEligibility === "paid" ||
    allocationStatus === "released" ||
    Number(allocation?.releasedAmount || 0) > 0 ||
    ["released", "settled"].includes(releaseStatus)
  ) {
    return "Amount released";
  }
  if (["approved", "completed"].includes(status) || approvalStatus === "approved" || paymentEligibility === "eligible") {
    return "Approved - release pending";
  }
  if (allocationStatus === "refunded" || refundableAmount <= 0) {
    return "Refunded";
  }
  if (latestSubmission) {
    return "Submitted - under review";
  }
  if (dueExpired) {
    return "Due date expired - refund enabled";
  }
  return "Waiting for influencer upload";
}

function evaluateDeliverableRefund({ deliverable, allocation, release, latestSubmission, now = new Date() }) {
  const dueDate = deliverable.expectedCompletionDate || deliverable.snapshot?.dueDate || deliverable.snapshot?.expectedCompletionDate || null;
  const dueExpired = dueDate ? new Date(dueDate).getTime() < now.getTime() : false;
  const allocationAmount = money(allocation?.allocatedAmount ?? deliverable.totalPrice ?? deliverable.unitPrice);
  const releasedAmount = money(allocation?.releasedAmount || 0);
  const refundedAmount = money(allocation?.refundedAmount || 0);
  const remainingAmount = money(allocation?.remainingAmount ?? Math.max(0, allocationAmount - releasedAmount - refundedAmount));
  const releaseStatus = String(release?.status || "").toLowerCase();
  const allocationStatus = String(allocation?.status || "").toLowerCase();
  const status = String(deliverable.status || "").toLowerCase();
  const approvalStatus = String(deliverable.approvalStatus || "").toLowerCase();
  const paymentEligibility = String(deliverable.paymentEligibility || "").toLowerCase();
  const hasReleasedPayment =
    paymentEligibility === "paid" ||
    releasedAmount > 0 ||
    allocationStatus === "released" ||
    ["approved", "released", "settled"].includes(releaseStatus);
  const approvedOrCompleted =
    ["approved", "completed"].includes(status) ||
    approvalStatus === "approved" ||
    paymentEligibility === "eligible";
  const alreadyRefunded = allocationStatus === "refunded" || (remainingAmount <= 0 && refundedAmount > 0);
  const submitted = Boolean(latestSubmission);

  let disabledReason = "";
  if (!allocation) disabledReason = "Funding allocation not found";
  else if (hasReleasedPayment) disabledReason = "Amount already released for this deliverable";
  else if (approvedOrCompleted) disabledReason = "Approved deliverables cannot be refunded";
  else if (alreadyRefunded) disabledReason = "Deliverable already refunded";
  else if (remainingAmount <= 0) disabledReason = "No refundable balance remains";
  else if (submitted) disabledReason = "Influencer has submitted content for review";
  else if (!dueDate) disabledReason = "No deliverable due date is configured";
  else if (!dueExpired) disabledReason = "Refund unlocks after the deliverable due date";

  const enabled = !disabledReason;
  return {
    enabled,
    amount: enabled ? remainingAmount : 0,
    disabledReason,
    dueExpired,
    dueDate,
    releasedAmount,
    refundedAmount,
    remainingAmount,
    statusLabel: deliverableStatusLabel({ deliverable, allocation, release, latestSubmission, dueExpired, refundableAmount: remainingAmount }),
  };
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

/**
 * Campaign Refund Service
 * Handles refund logic for campaign models with an escrowed fixed reward.
 */
class CampaignRefundService {
  async evaluateCampaignRefundEligibility(campaign, escrow, { includeReason = true } = {}) {
    if (!campaign || !escrow) {
      return { eligible: false, refundEligible: false, refundAmount: 0, reason: "missing_escrow", message: "Escrow wallet not found" };
    }
    if (!["fixed", "hybrid"].includes(String(campaign.paymentType || "").toLowerCase())) {
      return { eligible: false, refundEligible: false, refundAmount: 0, reason: "unsupported_payment_model", message: "Only fixed and hybrid fixed rewards can be refunded" };
    }
    if (["completed", "refunded"].includes(String(campaign.state || "").toLowerCase())) {
      return { eligible: false, refundEligible: false, refundAmount: 0, reason: "campaign_closed", message: "Completed or refunded campaigns cannot be refunded again" };
    }
    if (["refunded", "fully_released", "completed"].includes(String(escrow.status || "").toLowerCase())) {
      return { eligible: false, refundEligible: false, refundAmount: 0, reason: "escrow_closed", message: "Escrow is already refunded, released, or completed" };
    }
    const [existingRefund, releases, deliverables, submissions] = await Promise.all([
      CampaignRefund.findOne({ campaignId: campaign._id, status: { $in: ["requested", "approved", "processing", "completed"] } }).lean(),
      CampaignPaymentRelease.find({ campaignId: campaign._id, status: { $in: ["queued", "settled", "released", "processing"] } }).lean(),
      CampaignDeliverable.find({ campaignId: campaign._id }).lean(),
      CampaignDeliverable.find({ campaignId: campaign._id }).select("_id").lean()
        .then((rows) => rows.length ? DeliverableSubmission.find({ deliverableId: { $in: rows.map((row) => row._id) } }).select("_id createdAt status").lean() : []),
    ]);
    if (existingRefund) {
      return { eligible: false, refundEligible: false, refundAmount: 0, reason: "refund_already_exists", message: "Campaign already has an active or completed refund", existingRefundId: existingRefund._id };
    }
    if (money(escrow.amountReleased) > 0 || releases.length) {
      return { eligible: false, refundEligible: false, refundAmount: 0, reason: "payment_released", message: "Admin already released escrow or wallet credit exists" };
    }
    if (deliverables.some((row) => ["approved", "completed"].includes(String(row.status || row.approvalStatus || "").toLowerCase()) || row.paymentEligibility === "eligible" || row.paymentEligibility === "paid")) {
      return { eligible: false, refundEligible: false, refundAmount: 0, reason: "deliverable_approved", message: "Approved deliverables block escrow refund" };
    }
    const available = money(Math.max(0, Number(escrow.amountRemaining || escrow.amountFunded || 0)));
    if (available <= 0) {
      return { eligible: false, refundEligible: false, refundAmount: 0, reason: "no_refundable_escrow", message: "No unreleased fixed escrow remains" };
    }

    const now = new Date();
    const deadline = campaign.deadline || campaign.marketplace?.applicationDeadline;
    const deadlineExpired = deadline ? new Date(deadline) < now : false;
    const state = String(campaign.state || "").toLowerCase();
    const hasUploads = submissions.length > 0;
    const pendingSlaHours = Number(process.env.ESCROW_REFUND_PENDING_SLA_HOURS || 72);
    const stalePending = deliverables.some((row) => {
      if (!["under_review", "uploaded", "pending"].includes(String(row.status || row.approvalStatus || "").toLowerCase())) return false;
      const updated = row.updatedAt || row.createdAt;
      return updated && (now - new Date(updated)) / 36e5 >= pendingSlaHours;
    });

    let reason = "influencer_no_show";
    let eligibilityStatus = hasUploads ? "refund_eligible" : "awaiting_upload";
    if (deadlineExpired && !hasUploads) {
      reason = "submission_deadline_expired";
      eligibilityStatus = "upload_expired";
    } else if (["expired"].includes(state)) {
      reason = "campaign_expired";
      eligibilityStatus = "upload_expired";
    } else if (["cancelled", "stopped"].includes(state)) {
      reason = "vendor_cancelled";
      eligibilityStatus = "refund_eligible";
    } else if (["rejected"].includes(state)) {
      reason = "influencer_rejected";
      eligibilityStatus = "refund_eligible";
    } else if (stalePending) {
      reason = "pending_sla_breached";
      eligibilityStatus = "refund_eligible";
    }

    return {
      eligible: true,
      refundEligible: true,
      reason: includeReason ? reason : "eligible",
      refundReason: reason,
      refundStatus: eligibilityStatus,
      message: "Fixed reward escrow is eligible for admin refund",
      refundAmount: available,
      availableAmount: available,
      escrowAmount: money(escrow.amountFunded || escrow.totalEscrowAmount || escrow.budgetAmount),
      releasedAmount: money(escrow.amountReleased),
      uploaded: hasUploads,
      deadlineExpired,
    };
  }

  async buildRefundRow(escrow) {
    const campaign = escrow.campaignId;
    const refund = await CampaignRefund.findOne({ campaignId: campaign?._id || escrow.campaignId }).sort({ createdAt: -1 }).lean();
    const eligibility = await this.evaluateCampaignRefundEligibility(campaign, escrow);
    const status = refund ? refundUiStatus(refund.status, refund.refundStatus) : eligibility.refundStatus;
    return {
      id: refund?._id || `eligible-${escrow._id}`,
      refundId: refund?._id || "",
      campaignId: campaign?._id || escrow.campaignId,
      campaignTitle: campaign?.title || "Campaign",
      vendor: escrow.vendorId,
      influencer: campaign?.influencerId || null,
      paymentModel: campaign?.paymentType || refund?.paymentModel || "",
      escrowAmount: eligibility.escrowAmount ?? money(escrow.amountFunded || escrow.totalEscrowAmount),
      releasedAmount: eligibility.releasedAmount ?? money(escrow.amountReleased),
      alreadyRefunded: money(escrow.amountRefunded),
      refundEligible: Boolean(eligibility.eligible) || Boolean(refund),
      refundAmount: refund ? money(refund.refundAmount || refund.grossRefundAmount || refund.totalRefundAmount) : money(eligibility.refundAmount),
      refundReason: refund?.refundReason || refund?.reason || eligibility.reason,
      refundReasonLabel: reasonLabel(refund?.refundReason || refund?.reason || eligibility.reason),
      createdDate: refund?.createdAt || escrow.createdAt,
      deadline: campaign?.deadline || null,
      status,
      rawStatus: refund?.status || "",
      statusLabel: refund ? refundActionLabel(refund.status) : reasonLabel(status),
      failureReason: refund?.failureReason || "",
      gatewayRefundId: refund?.gatewayRefundId || refund?.razorpayRefundId || "",
      notes: refund?.notes || "",
      eligibility,
    };
  }

  async getAdminEscrowRefundDashboard(filters = {}) {
    const limit = Math.min(100, Math.max(1, Number(filters.limit || 50)));
    const skip = Math.max(0, Number(filters.skip || 0));
    const walletQuery = { status: { $in: ["funded", "partially_released", "refunded"] } };
    if (filters.vendorId) walletQuery.vendorId = filters.vendorId;
    const wallets = await CampaignEscrowWallet.find(walletQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "campaignId",
        select: "title state paymentType deadline influencerId fixedPaymentWorkflow marketplace createdAt",
        populate: { path: "influencerId", select: "displayName username handle name" },
      })
      .populate("vendorId", "shopName companyName")
      .lean();
    const rows = await Promise.all(wallets
      .filter((wallet) => ["fixed", "hybrid"].includes(String(wallet.campaignId?.paymentType || "").toLowerCase()))
      .map((wallet) => this.buildRefundRow(wallet)));
    const filtered = filters.status ? rows.filter((row) => row.status === filters.status || row.rawStatus === filters.status) : rows;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return {
      cards: {
        pendingRefund: filtered.filter((row) => ["refund_eligible", "refund_requested", "awaiting_upload", "upload_expired"].includes(row.status)).length,
        refundedToday: filtered.filter((row) => row.status === "refund_completed" && row.createdDate && new Date(row.createdDate) >= todayStart).length,
        refundValue: money(filtered.reduce((sum, row) => sum + Number(row.refundAmount || 0), 0)),
        refundRequests: filtered.filter((row) => row.rawStatus === "requested").length,
        expiredCampaigns: filtered.filter((row) => row.refundReason === "campaign_expired" || row.refundReason === "submission_deadline_expired").length,
        pendingEscrow: money(filtered.reduce((sum, row) => sum + Number(row.escrowAmount || 0) - Number(row.releasedAmount || 0) - Number(row.alreadyRefunded || 0), 0)),
        releasedEscrow: money(filtered.reduce((sum, row) => sum + Number(row.releasedAmount || 0), 0)),
      },
      rows: filtered,
      total: filtered.length,
      limit,
      skip,
    };
  }

  async getVendorEscrowRefundDashboard(vendorId, filters = {}) {
    const limit = Math.min(100, Math.max(1, Number(filters.limit || 50)));
    const skip = Math.max(0, Number(filters.skip || 0));
    const wallets = await CampaignEscrowWallet.find({
      vendorId,
      status: { $in: ["funded", "partially_released", "fully_released", "refunded", "completed"] },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "campaignId",
        select: "title state paymentType deadline influencerId fixedPaymentWorkflow marketplace createdAt",
        populate: { path: "influencerId", select: "displayName username handle name" },
      })
      .populate("vendorId", "shopName companyName")
      .lean();

    const rows = await Promise.all(wallets
      .filter((wallet) => ["fixed", "hybrid"].includes(String(wallet.campaignId?.paymentType || "").toLowerCase()))
      .map((wallet) => this.buildRefundRow(wallet)));
    const filtered = filters.status ? rows.filter((row) => row.status === filters.status || row.rawStatus === filters.status) : rows;
    return {
      cards: {
        campaigns: filtered.length,
        escrowFunded: money(filtered.reduce((sum, row) => sum + Number(row.escrowAmount || 0), 0)),
        releasedAmount: money(filtered.reduce((sum, row) => sum + Number(row.releasedAmount || 0), 0)),
        refundedAmount: money(filtered.reduce((sum, row) => sum + Number(row.alreadyRefunded || 0), 0)),
        remainingEscrow: money(filtered.reduce((sum, row) => sum + Number(row.escrowAmount || 0) - Number(row.releasedAmount || 0) - Number(row.alreadyRefunded || 0), 0)),
        refundableAmount: money(filtered.reduce((sum, row) => sum + Number(row.refundAmount || 0), 0)),
      },
      rows: filtered,
      total: filtered.length,
      limit,
      skip,
    };
  }

  async getAdminEscrowRefundDeliverables(campaignId) {
    const [campaign, escrow] = await Promise.all([
      Campaign.findById(campaignId)
        .select("title state paymentType deadline influencerId vendorId marketplace fixedPaymentWorkflow")
        .populate("influencerId", "displayName username handle name")
        .populate("vendorId", "shopName companyName")
        .lean(),
      CampaignEscrowWallet.findOne({ campaignId }).lean(),
    ]);
    if (!campaign) throw new ApiError(404, "Campaign not found");
    if (!escrow) throw new ApiError(404, "Escrow wallet not found");
    if (!["fixed", "hybrid"].includes(String(campaign.paymentType || "").toLowerCase())) {
      throw new ApiError(400, "Only fixed and hybrid fixed reward escrow has deliverable refunds");
    }

    const deliverables = await CampaignDeliverable.find({ campaignId }).sort({ createdAt: 1 }).lean();
    const deliverableIds = deliverables.map((row) => row._id);
    const [allocations, releases, submissions] = await Promise.all([
      CampaignDeliverableFunding.find({ campaignId }).lean(),
      CampaignPaymentRelease.find({
        campaignId,
        status: { $in: ["approved", "released", "settled", "pending_approval"] },
      }).lean(),
      deliverableIds.length
        ? DeliverableSubmission.find({ deliverableId: { $in: deliverableIds } }).sort({ version: -1, submittedAt: -1, createdAt: -1 }).lean()
        : [],
    ]);

    const allocationByDeliverable = new Map(
      allocations
        .filter((row) => row.deliverableId)
        .map((row) => [String(row.deliverableId), row])
    );
    const releaseByDeliverable = new Map();
    releases.forEach((release) => {
      (release.deliverables || []).forEach((item) => {
        if (!item?.deliverableId) return;
        releaseByDeliverable.set(String(item.deliverableId), release);
      });
    });
    const submissionByDeliverable = new Map();
    submissions.forEach((submission) => {
      const key = String(submission.deliverableId || "");
      if (!submissionByDeliverable.has(key)) submissionByDeliverable.set(key, submission);
    });

    const rows = deliverables.map((deliverable) => {
      const allocation = allocationByDeliverable.get(String(deliverable._id)) ||
        allocations.find((row) => row.allocationKey && row.allocationKey === deliverable.snapshot?.allocationKey);
      const release = releaseByDeliverable.get(String(deliverable._id));
      const latestSubmission = submissionByDeliverable.get(String(deliverable._id)) || null;
      const refund = evaluateDeliverableRefund({ deliverable, allocation, release, latestSubmission });
      const rate = money(deliverable.totalPrice || allocation?.allocatedAmount || deliverable.unitPrice);
      return {
        id: deliverable._id,
        title: deliverable.title || deliverable.deliverableType || allocation?.deliverableName || "Deliverable",
        type: deliverable.deliverableType || allocation?.deliverableType || "",
        quantity: deliverable.quantity || 1,
        unitPrice: money(deliverable.unitPrice || (rate / Math.max(1, Number(deliverable.quantity || 1)))),
        rate,
        currency: deliverable.currency || allocation?.currency || escrow.currency || "INR",
        dueDate: refund.dueDate,
        status: deliverable.status,
        approvalStatus: deliverable.approvalStatus,
        completionStatus: deliverable.completionStatus,
        paymentEligibility: deliverable.paymentEligibility,
        latestSubmission: latestSubmission ? {
          id: latestSubmission._id,
          status: latestSubmission.status,
          submittedAt: latestSubmission.submittedAt || latestSubmission.createdAt,
          contentType: latestSubmission.contentType,
          contentUrl: latestSubmission.contentUrl,
        } : null,
        allocation: allocation ? {
          id: allocation._id,
          allocatedAmount: money(allocation.allocatedAmount),
          releasedAmount: refund.releasedAmount,
          refundedAmount: refund.refundedAmount,
          remainingAmount: refund.remainingAmount,
          status: allocation.status,
        } : null,
        refund,
      };
    });

    return {
      campaign: {
        id: campaign._id,
        title: campaign.title || "Campaign",
        state: campaign.state,
        paymentModel: campaign.paymentType,
        deadline: campaign.deadline || campaign.marketplace?.applicationDeadline || null,
        vendor: campaign.vendorId || escrow.vendorId,
        influencer: campaign.influencerId || null,
      },
      escrow: {
        id: escrow._id,
        escrowAmount: money(escrow.amountFunded || escrow.totalEscrowAmount || escrow.budgetAmount),
        releasedAmount: money(escrow.amountReleased),
        refundedAmount: money(escrow.amountRefunded),
        remainingAmount: money(escrow.amountRemaining),
        status: escrow.status,
      },
      deliverables: rows,
      totals: {
        deliverables: rows.length,
        refundableAmount: money(rows.reduce((sum, row) => sum + Number(row.refund?.amount || 0), 0)),
        releasedAmount: money(rows.reduce((sum, row) => sum + Number(row.allocation?.releasedAmount || 0), 0)),
      },
    };
  }

  async getVendorEscrowRefundDeliverables(vendorId, campaignId) {
    const escrow = await CampaignEscrowWallet.findOne({ vendorId, campaignId }).select("_id").lean();
    if (!escrow) throw new ApiError(404, "Escrow wallet not found for this vendor campaign");
    return this.getAdminEscrowRefundDeliverables(campaignId);
  }

  async refundDeliverableEscrow(campaignId, deliverableId, payload = {}, adminId) {
    const [campaign, escrow, deliverable] = await Promise.all([
      Campaign.findById(campaignId).lean(),
      CampaignEscrowWallet.findOne({ campaignId }),
      CampaignDeliverable.findOne({ _id: deliverableId, campaignId }).lean(),
    ]);
    if (!campaign) throw new ApiError(404, "Campaign not found");
    if (!escrow) throw new ApiError(404, "Escrow wallet not found");
    if (!deliverable) throw new ApiError(404, "Deliverable not found for this campaign");
    if (!["fixed", "hybrid"].includes(String(campaign.paymentType || "").toLowerCase())) {
      throw new ApiError(400, "Only fixed and hybrid fixed reward escrow can be refunded");
    }

    const [allocation, release, latestSubmission, paymentOrder] = await Promise.all([
      CampaignDeliverableFunding.findOne({ campaignId, deliverableId }),
      CampaignPaymentRelease.findOne({
        campaignId,
        status: { $in: ["approved", "released", "settled"] },
        "deliverables.deliverableId": deliverableId,
      }).lean(),
      DeliverableSubmission.findOne({ campaignId, deliverableId }).sort({ version: -1, submittedAt: -1, createdAt: -1 }).lean(),
      CampaignPaymentOrder.findById(escrow.paymentOrderId).lean(),
    ]);
    const eligibility = evaluateDeliverableRefund({ deliverable, allocation, release, latestSubmission });
    if (!eligibility.enabled) {
      throw new ApiError(409, eligibility.disabledReason || "Deliverable is not refund eligible");
    }
    const refundAmount = payload.refundAmount !== undefined ? money(payload.refundAmount) : eligibility.amount;
    if (refundAmount <= 0 || refundAmount > eligibility.amount) {
      throw new ApiError(400, "Refund amount must be greater than zero and cannot exceed this deliverable refundable balance");
    }
    if (!paymentOrder || !paymentOrder.razorpayPaymentId) {
      throw new ApiError(400, "Original payment not found for refund");
    }
    if (money(escrow.amountRemaining) < refundAmount) {
      throw new ApiError(409, "Escrow balance is no longer available for this deliverable refund");
    }

    const reason = normalizeRefundReason(payload.reason || "submission_deadline_expired");
    const refund = await CampaignRefund.create({
      refundId: `DRF-${Date.now()}-${String(deliverableId).slice(-6)}`,
      campaignId,
      escrowWalletId: escrow._id,
      vendorId: escrow.vendorId,
      influencerId: campaign.influencerId,
      paymentOrderId: escrow.paymentOrderId,
      paymentModel: campaign.paymentType,
      escrowAmount: money(escrow.amountFunded || escrow.totalEscrowAmount || escrow.budgetAmount),
      releasedAmount: money(escrow.amountReleased),
      refundAmount,
      budgetAmount: refundAmount,
      grossRefundAmount: refundAmount,
      totalRefundAmount: refundAmount,
      platformFeeAmount: 0,
      gatewayFeeAmount: 0,
      taxAmount: 0,
      reason,
      refundReason: reason,
      description: payload.notes || `Deliverable refund: ${deliverable.title || deliverable.deliverableType}`,
      status: "processing",
      refundStatus: "refund_processing",
      requestedBy: adminId,
      requestedAt: new Date(),
      approvedBy: adminId,
      approvedAt: new Date(),
      approvalReason: payload.notes || "Deliverable due date expired without published content",
      refundMethod: "original_payment_method",
      currency: escrow.currency || allocation.currency || "INR",
      notes: payload.notes || "",
      fundingAllocationIds: [allocation._id],
      auditLog: [
        {
          action: "deliverable_refund_processing",
          actor: adminId,
          actorRole: "admin",
          details: { campaignId, deliverableId, reason, refundAmount, source: "admin_deliverable_refund" },
        },
      ],
    });

    try {
      const razorpayRefund = await razorpay.payments.refund(paymentOrder.razorpayPaymentId, {
        amount: Math.round(refundAmount * 100),
        notes: {
          campaignId: String(campaignId),
          deliverableId: String(deliverableId),
          refundId: String(refund._id),
          reason,
        },
      });

      allocation.refundedAmount = money(Number(allocation.refundedAmount || 0) + refundAmount);
      allocation.remainingAmount = money(Number(allocation.remainingAmount || 0) - refundAmount);
      allocation.status = allocation.remainingAmount <= 0 ? "refunded" : "partially_refunded";
      await allocation.save();

      escrow.amountRefunded = money(Number(escrow.amountRefunded || 0) + refundAmount);
      escrow.amountRemaining = money(Number(escrow.amountRemaining || 0) - refundAmount);
      escrow.status = escrow.amountRemaining <= 0 ? "refunded" : (Number(escrow.amountReleased || 0) > 0 ? "partially_released" : "funded");
      escrow.refunds.push({ refundId: refund._id, amount: refundAmount, reason, refundedAt: new Date() });
      escrow.auditLog.push({
        action: "deliverable_refund_completed",
        actor: adminId,
        actorRole: "admin",
        details: { refundId: refund._id, deliverableId, amount: refundAmount, razorpayRefundId: razorpayRefund.id },
      });
      await escrow.save();

      refund.status = "completed";
      refund.refundStatus = "refund_completed";
      refund.razorpayRefundId = razorpayRefund.id;
      refund.gatewayRefundId = razorpayRefund.id;
      refund.gatewayPaymentId = paymentOrder.razorpayPaymentId;
      refund.completedAt = new Date();
      refund.transactionId = razorpayRefund.id;
      refund.auditLog.push({
        action: "deliverable_refund_completed",
        actor: adminId,
        actorRole: "admin",
        details: { razorpayRefundId: razorpayRefund.id, deliverableId, refundAmount },
      });
      await refund.save();

      await CampaignEscrowLedger.create({
        campaignId,
        escrowWalletId: escrow._id,
        paymentOrderId: paymentOrder._id,
        refundId: refund._id,
        vendorId: escrow.vendorId,
        influencerId: campaign.influencerId,
        entryType: "refund",
        direction: "debit",
        amount: refundAmount,
        balanceAfter: escrow.amountRemaining,
        currency: refund.currency,
        idempotencyKey: `campaign-deliverable-refund:${refund._id}`,
        metadata: {
          deliverableId: String(deliverableId),
          deliverableType: deliverable.deliverableType,
          reason,
        },
      });

      await CampaignDeliverable.updateOne(
        { _id: deliverableId, campaignId },
        {
          $set: {
            status: "cancelled",
            completionStatus: "cancelled",
            approvalStatus: "rejected",
            paymentEligibility: "not_eligible",
          },
        }
      );

      await Campaign.updateOne(
        { _id: campaignId },
        {
          $set: {
            "fixedPaymentWorkflow.status": escrow.amountRemaining <= 0 ? "refunded" : "partially_refunded",
            "fixedPaymentWorkflow.lastTransitionAt": new Date(),
          },
          $push: {
            history: {
              state: "deliverable_refunded",
              actorId: adminId,
              note: `${deliverable.title || deliverable.deliverableType} refunded: ${reasonLabel(reason)}`,
              changedAt: new Date(),
            },
          },
        }
      );
      await auditService.log({
        actor: { _id: adminId, role: "admin" },
        action: "campaign.deliverable_refund.completed",
        entityType: "CampaignRefund",
        entityId: refund._id,
        metadata: { campaignId, deliverableId, amount: refundAmount, razorpayRefundId: razorpayRefund.id },
      }).catch(() => {});

      return {
        refundId: refund._id,
        deliverableId,
        gatewayRefundId: razorpayRefund.id,
        refundAmount,
        status: "completed",
        message: "Deliverable refund processed to original payment method",
      };
    } catch (error) {
      refund.status = "failed";
      refund.refundStatus = "refund_failed";
      refund.failureReason = error.message;
      refund.auditLog.push({ action: "deliverable_refund_failed", actor: adminId, actorRole: "admin", details: { failureReason: error.message, deliverableId } });
      await refund.save().catch(() => {});
      throw new ApiError(error.statusCode || 500, `Failed to process deliverable refund: ${error.message}`, error.code || "DELIVERABLE_REFUND_FAILED");
    }
  }

  async createAdminRefund(campaignId, payload = {}, adminId) {
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) throw new ApiError(404, "Campaign not found");
    const escrow = await CampaignEscrowWallet.findOne({ campaignId }).lean();
    const eligibility = await this.evaluateCampaignRefundEligibility(campaign, escrow);
    if (!eligibility.eligible) throw new ApiError(409, eligibility.message || "Campaign is not refund eligible");
    const reason = normalizeRefundReason(payload.reason || eligibility.reason);
    const available = money(eligibility.refundAmount);
    const requestedAmount = payload.refundAmount !== undefined ? money(payload.refundAmount) : available;
    if (requestedAmount <= 0 || requestedAmount > available) throw new ApiError(400, "Refund amount must be greater than zero and cannot exceed refundable escrow");
    const allocationRows = await CampaignDeliverableFunding.find({ campaignId, remainingAmount: { $gt: 0 } }).select("_id").lean();
    const refund = await CampaignRefund.create({
      refundId: `ERF-${Date.now()}-${String(campaignId).slice(-6)}`,
      campaignId,
      escrowWalletId: escrow._id,
      vendorId: escrow.vendorId,
      influencerId: campaign.influencerId,
      paymentOrderId: escrow.paymentOrderId,
      paymentModel: campaign.paymentType,
      escrowAmount: eligibility.escrowAmount,
      releasedAmount: eligibility.releasedAmount,
      refundAmount: requestedAmount,
      budgetAmount: requestedAmount,
      grossRefundAmount: requestedAmount,
      totalRefundAmount: requestedAmount,
      platformFeeAmount: 0,
      gatewayFeeAmount: 0,
      taxAmount: 0,
      reason,
      refundReason: reason,
      description: payload.notes || payload.description || "",
      status: "requested",
      refundStatus: "refund_requested",
      requestedBy: adminId,
      requestedAt: new Date(),
      refundMethod: "original_payment_method",
      currency: escrow.currency || "INR",
      notes: payload.notes || "",
      fundingAllocationIds: allocationRows.map((row) => row._id),
      auditLog: [{ action: "refund_requested", actor: adminId, actorRole: "admin", details: { reason, refundAmount: requestedAmount, source: "admin_finance" } }],
    });
    await Campaign.updateOne({ _id: campaignId }, {
      $set: { state: "refund_requested", "fixedPaymentWorkflow.status": "refund_requested", "fixedPaymentWorkflow.contentEnabled": false, "fixedPaymentWorkflow.lastTransitionAt": new Date() },
      $push: { history: { state: "refund_requested", actorId: adminId, note: `Escrow refund requested: ${reasonLabel(reason)}`, changedAt: new Date() } },
    });
    await auditService.log({ actor: { _id: adminId, role: "admin" }, action: "campaign.refund.requested", entityType: "CampaignRefund", entityId: refund._id, metadata: { campaignId, reason, refundAmount: requestedAmount } }).catch(() => {});
    return refund;
  }

  async markExpiredCampaignsRefundEligible() {
    const wallets = await CampaignEscrowWallet.find({
      status: { $in: ["funded", "partially_released"] },
      amountRemaining: { $gt: 0 },
    })
      .populate({ path: "campaignId", select: "title state paymentType deadline fixedPaymentWorkflow marketplace" })
      .lean();
    let scanned = 0;
    let marked = 0;
    const now = new Date();

    for (const escrow of wallets) {
      const campaign = escrow.campaignId;
      if (!campaign || !["fixed", "hybrid"].includes(String(campaign.paymentType || "").toLowerCase())) continue;
      scanned += 1;
      const eligibility = await this.evaluateCampaignRefundEligibility(campaign, escrow);
      if (!eligibility.eligible || !["upload_expired", "refund_eligible"].includes(eligibility.refundStatus)) continue;
      if (["refund_requested", "refund_approved", "refunded"].includes(String(campaign.fixedPaymentWorkflow?.status || ""))) continue;
      await Campaign.updateOne(
        { _id: campaign._id },
        {
          $set: {
            state: eligibility.refundStatus,
            "fixedPaymentWorkflow.status": eligibility.refundStatus,
            "fixedPaymentWorkflow.contentEnabled": false,
            "fixedPaymentWorkflow.lastTransitionAt": now,
          },
          $push: {
            history: {
              state: eligibility.refundStatus,
              note: `Escrow marked ${eligibility.refundStatus} by scheduled refund scan`,
              changedAt: now,
            },
          },
        }
      );
      marked += 1;
    }

    return { scanned, marked };
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
        .populate("campaignId", "title paymentType deadline state influencerId")
        .populate("vendorId", "shopName companyName")
        .populate("influencerId", "displayName storeName")
        .populate("requestedBy", "email"),
      CampaignRefund.countDocuments(query),
    ]);

    return {
      refunds: refunds.map((row) => ({
        ...row.toObject(),
        refundAmount: row.refundAmount || row.grossRefundAmount || row.totalRefundAmount,
        refundStatus: row.refundStatus || refundUiStatus(row.status),
        paymentModel: row.paymentModel || row.campaignId?.paymentType,
      })),
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
    refund.refundStatus = "refund_rejected";
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
    const escrow = await CampaignEscrowWallet.findById(refund.escrowWalletId).select("status").lean();
    await Campaign.updateOne(
      { _id: refund.campaignId, paymentType: { $in: ["fixed", "hybrid"] } },
      {
        $set: {
          "fixedPaymentWorkflow.status": escrow?.status === "partially_released" ? "partially_released" : "funded",
          "fixedPaymentWorkflow.contentEnabled": true,
          "fixedPaymentWorkflow.lastTransitionAt": new Date(),
        },
      }
    );

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
      refund.refundStatus = "refund_processing";
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
      const releaseBlocker = await CampaignPaymentRelease.findOne({ campaignId: refund.campaignId, status: { $in: ["queued", "settled", "released", "processing"] } }).lean();
      if (releaseBlocker || Number(escrow.amountReleased || 0) > 0) {
        throw new ApiError(409, "Escrow release or wallet credit already exists; refund is blocked");
      }
      const approvedDeliverable = await CampaignDeliverable.findOne({
        campaignId: refund.campaignId,
        $or: [
          { status: { $in: ["approved", "completed"] } },
          { approvalStatus: "approved" },
          { paymentEligibility: { $in: ["eligible", "paid"] } },
        ],
      }).lean();
      if (approvedDeliverable) throw new ApiError(409, "Approved deliverables block escrow refund");

      const allocationRows = await CampaignDeliverableFunding.find({
        _id: { $in: refund.fundingAllocationIds || [] },
        campaignId: refund.campaignId,
        remainingAmount: { $gt: 0 },
      });
      const allocationGross = allocationRows.reduce((sum, row) => sum + Number(row.remainingAmount || 0), 0);
      if (money(allocationGross) < money(refund.grossRefundAmount)) {
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
      refund.refundStatus = "refund_completed";
      refund.razorpayRefundId = razorpayRefund.id;
      refund.gatewayRefundId = razorpayRefund.id;
      refund.gatewayPaymentId = paymentOrder.razorpayPaymentId;
      refund.failureReason = "";
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
      let remainingRefund = money(refund.grossRefundAmount);
      for (const allocation of allocationRows) {
        if (remainingRefund <= 0) break;
        const amount = Math.min(money(allocation.remainingAmount), remainingRefund);
        allocation.refundedAmount = Number(allocation.refundedAmount || 0) + amount;
        allocation.remainingAmount = money(Number(allocation.remainingAmount || 0) - amount);
        allocation.status = allocation.remainingAmount <= 0 ? "refunded" : "partially_refunded";
        remainingRefund = money(remainingRefund - amount);
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
        $set: {
          state: "cancelled",
          "fixedPaymentWorkflow.status": "refunded",
          "fixedPaymentWorkflow.contentEnabled": false,
          "fixedPaymentWorkflow.lastTransitionAt": new Date(),
        },
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
        refund.status = "failed";
        refund.refundStatus = "refund_failed";
        refund.failureReason = error.message;
        refund.auditLog.push({ action: "refund_failed", actor: processedBy, actorRole: "admin", details: { failureReason: error.message } });
        await refund.save().catch(() => {});
      }
      throw new ApiError(error.statusCode || 500, `Failed to process refund: ${error.message}`, error.code || "REFUND_PROCESSING_FAILED");
    }
  }

  async approveAndProcessRefund(refundId, payload = {}, approvedBy) {
    const refund = await CampaignRefund.findById(refundId);
    if (!refund) throw new ApiError(404, "Refund not found");
    if (refund.status === "requested") {
      refund.status = "approved";
      refund.refundStatus = "refund_approved";
      refund.approvedBy = approvedBy;
      refund.approvalReason = payload.approvalReason || payload.notes || "Approved by admin finance";
      refund.approvedAt = new Date();
      refund.notes = payload.notes ?? refund.notes;
      refund.auditLog.push({ action: "refund_approved", actor: approvedBy, actorRole: "admin", details: { approvalReason: refund.approvalReason } });
      await refund.save();
      await Campaign.updateOne({ _id: refund.campaignId }, {
        $set: { state: "refund_approved", "fixedPaymentWorkflow.status": "refund_approved", "fixedPaymentWorkflow.lastTransitionAt": new Date() },
        $push: { history: { state: "refund_approved", actorId: approvedBy, note: "Escrow refund approved", changedAt: new Date() } },
      });
    } else if (refund.status !== "approved") {
      throw new ApiError(400, `Cannot approve refund in status: ${refund.status}`);
    }
    return this.processRefundToPaymentMethod(refundId, approvedBy);
  }

  /**
   * Handle campaign cancellation refund
   */
  async handleCampaignCancellationRefund(campaignId, vendorId, cancellationReason, cancelledBy) {
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) {
      throw new ApiError(404, "Campaign not found");
    }

    if (!["fixed", "hybrid"].includes(campaign.paymentType)) {
      throw new ApiError(400, "Campaign has no fixed reward escrow");
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

    const escrow = await CampaignEscrowWallet.findOne({ campaignId, vendorId }).lean();
    const eligibility = await this.evaluateCampaignRefundEligibility(campaign, escrow);
    if (eligibility.eligible) {
      await Campaign.updateOne(
        { _id: campaignId },
        {
          $set: {
            state: "refund_eligible",
            "fixedPaymentWorkflow.status": "refund_eligible",
            "fixedPaymentWorkflow.contentEnabled": false,
            "fixedPaymentWorkflow.lastTransitionAt": new Date(),
          },
          $push: {
            history: {
              state: "refund_eligible",
              actorId: cancelledBy,
              note: `Campaign cancellation marked escrow refund eligible: ${refundReason}`,
              changedAt: new Date(),
            },
          },
        }
      );
    }

    return {
      campaignId,
      eligible: eligibility.eligible,
      refundEligible: eligibility.refundEligible,
      refundAmount: eligibility.refundAmount,
      reason: refundReason,
      message: eligibility.eligible
        ? "Campaign escrow is refund eligible and awaits admin finance approval"
        : eligibility.message,
    };
  }

  /**
   * Check refund eligibility
   */
  async checkRefundEligibility(campaignId, vendorId) {
    const campaign = await Campaign.findOne({ _id: campaignId, ...(vendorId ? { vendorId } : {}) }).lean();
    if (!campaign) return { eligible: false, reason: "campaign_not_found", message: "Campaign not found" };
    const escrow = await CampaignEscrowWallet.findOne({ campaignId, ...(vendorId ? { vendorId } : {}) }).lean();
    return this.evaluateCampaignRefundEligibility(campaign, escrow);
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
