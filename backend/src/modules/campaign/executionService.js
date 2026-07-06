const mongoose = require("mongoose");
const { AppError } = require("../../utils/AppError");
const auditService = require("../../services/audit.service");
const notificationService = require("../../services/notification.service");
const vendorRepo = require("../../repositories/vendor.repository");
const influencerService = require("../influencer/service");
const commissionService = require("../commission/service");
const { CommissionRecord } = require("../commission/models");
const { Campaign, CampaignStatusHistory } = require("./model");
const { Reel } = require("../reel/model");
const { InfluencerProfile } = require("../influencer/model");
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

function assertObjectId(value, field = "id") {
  const id = objectId(value);
  if (!id) {
    throw new AppError(`Invalid ${field}`, 400, "INVALID_ID", { field });
  }
  return id;
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
  const packageQuantity = Math.max(1, Number(row.packageQuantity || row.snapshot?.package?.packageQuantity || 1));
  const packageCount = Math.max(1, Number(row.quantity || row.units || 1));
  const quantity = packageQuantity * packageCount;
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
    expectedCompletionDate: row.dueDate || campaign.deadline || undefined,
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

function requiredPublishedContentCount(deliverables = []) {
  return deliverables.reduce((sum, row) => sum + Math.max(1, Number(row.quantity || 1)), 0);
}

function allDeliverablesPublished(deliverables = [], publishedCount = 0) {
  const requiredCount = requiredPublishedContentCount(deliverables);
  return {
    requiredCount,
    publishedCount: Number(publishedCount || 0),
    complete: requiredCount > 0 && Number(publishedCount || 0) >= requiredCount,
  };
}

function deliverableRefundLock(allocation = null) {
  if (!allocation) {
    return {
      locked: false,
      refundedAmount: 0,
      remainingAmount: 0,
      status: "",
      message: "",
    };
  }
  const refundedAmount = money(allocation.refundedAmount || 0);
  const remainingAmount = money(allocation.remainingAmount || 0);
  const status = String(allocation.status || "").toLowerCase();
  const locked = status === "refunded" || (refundedAmount > 0 && remainingAmount <= 0);
  return {
    locked,
    refundedAmount,
    remainingAmount,
    status,
    message: locked
      ? "You can't create content for this deliverable because the amount was refunded to the vendor."
      : "",
  };
}

const EXECUTABLE_EXTENSIONS = new Set(["exe", "bat", "cmd", "sh", "msi", "js", "jar", "scr", "ps1", "com", "dll"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "qt"]);
const DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx"]);
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const DOCUMENT_MIME_TYPES = new Set(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);

const SUBMISSION_RULES = {
  post: {
    message: "Only POST content is accepted for this deliverable.",
    mediaTypes: new Set(["instagram_post", "facebook_post", "image", "carousel", "document"]),
    platforms: new Set(["instagram", "facebook", "upload"]),
  },
  reel: {
    message: "Only REEL content is accepted for this deliverable.",
    mediaTypes: new Set(["instagram_reel", "youtube_shorts", "tiktok_video", "facebook_reel", "video"]),
    platforms: new Set(["instagram", "youtube", "tiktok", "facebook", "upload"]),
  },
};

function deliverableKind(deliverable = {}) {
  const raw = String(deliverable.deliverableType || deliverable.type || deliverable.title || "").toLowerCase();
  if (/(^|[_\s-])(reel|short|shorts|video|ugc)([_\s-]|$)/.test(raw) || raw.includes("reel")) return "reel";
  return "post";
}

function extensionFromUrl(value = "") {
  const clean = String(value || "").split("?")[0].split("#")[0];
  const ext = clean.includes(".") ? clean.split(".").pop().toLowerCase() : "";
  return ext;
}

function parseSafeUrl(value = "") {
  const trimmed = String(value || "").trim();
  if (!trimmed) throw new AppError("Content URL is required", 400, "VALIDATION_ERROR", { field: "contentUrl" });
  if (/^(javascript|data|file|vbscript):/i.test(trimmed)) {
    throw new AppError("Unsupported content URL", 400, "VALIDATION_ERROR", { field: "contentUrl" });
  }
  if (trimmed.startsWith("/uploads/")) return { internal: true, href: trimmed, host: "", path: trimmed.toLowerCase() };
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    throw new AppError("Invalid content URL", 400, "VALIDATION_ERROR", { field: "contentUrl" });
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new AppError("Unsupported content URL", 400, "VALIDATION_ERROR", { field: "contentUrl" });
  }
  return { internal: false, href: url.toString(), host: url.hostname.replace(/^www\./, "").toLowerCase(), path: url.pathname.toLowerCase() };
}

function assertPlatformUrl(url, mediaType) {
  if (mediaType === "instagram_post" && !(url.host.endsWith("instagram.com") && url.path.includes("/p/"))) {
    throw new AppError("Instagram Post URL is not valid for this POST deliverable.", 400, "VALIDATION_ERROR", { field: "contentUrl" });
  }
  if (mediaType === "instagram_reel" && !(url.host.endsWith("instagram.com") && (url.path.includes("/reel/") || url.path.includes("/reels/")))) {
    throw new AppError("Instagram Reel URL is not valid for this REEL deliverable.", 400, "VALIDATION_ERROR", { field: "contentUrl" });
  }
  if (mediaType === "facebook_post" && !((url.host.endsWith("facebook.com") || url.host.endsWith("fb.com")) && !url.path.includes("/reel"))) {
    throw new AppError("Facebook Post URL is not valid for this POST deliverable.", 400, "VALIDATION_ERROR", { field: "contentUrl" });
  }
  if (mediaType === "facebook_reel" && !((url.host.endsWith("facebook.com") || url.host.endsWith("fb.watch")) && (url.path.includes("/reel") || url.path.includes("/watch") || url.host.endsWith("fb.watch")))) {
    throw new AppError("Facebook Reel URL is not valid for this REEL deliverable.", 400, "VALIDATION_ERROR", { field: "contentUrl" });
  }
  if (mediaType === "youtube_shorts" && !((url.host.endsWith("youtube.com") && url.path.includes("/shorts/")) || url.host.endsWith("youtu.be"))) {
    throw new AppError("YouTube Shorts URL is not valid for this REEL deliverable.", 400, "VALIDATION_ERROR", { field: "contentUrl" });
  }
  if (mediaType === "tiktok_video" && !(url.host.endsWith("tiktok.com") && url.path.includes("/video/"))) {
    throw new AppError("TikTok URL is not valid for this REEL deliverable.", 400, "VALIDATION_ERROR", { field: "contentUrl" });
  }
}

function assertFileSafety(payload = {}) {
  const urls = [payload.contentUrl, ...(Array.isArray(payload.mediaUrls) ? payload.mediaUrls : [])].filter(Boolean);
  urls.forEach((url) => {
    parseSafeUrl(url);
    const ext = extensionFromUrl(url);
    if (EXECUTABLE_EXTENSIONS.has(ext)) {
      throw new AppError("Executable files are not allowed", 400, "VALIDATION_ERROR", { field: "contentUrl" });
    }
    if (payload.mediaType === "video" && ext && !VIDEO_EXTENSIONS.has(ext)) {
      throw new AppError("Only MP4, WebM, or MOV video files are accepted for this deliverable.", 400, "VALIDATION_ERROR", { field: "contentUrl" });
    }
    if (["image", "carousel"].includes(payload.mediaType) && ext && !IMAGE_EXTENSIONS.has(ext)) {
      throw new AppError("Only JPEG, PNG, WebP, or GIF images are accepted for this deliverable.", 400, "VALIDATION_ERROR", { field: "contentUrl" });
    }
    if (payload.mediaType === "document" && ext && !DOCUMENT_EXTENSIONS.has(ext)) {
      throw new AppError("Only PDF, DOC, or DOCX documents are accepted as proof.", 400, "VALIDATION_ERROR", { field: "contentUrl" });
    }
  });
  (Array.isArray(payload.fileMetadata) ? payload.fileMetadata : []).forEach((file) => {
    const ext = extensionFromUrl(file?.name || "");
    const mime = String(file?.mimeType || file?.type || "").toLowerCase();
    if (EXECUTABLE_EXTENSIONS.has(ext)) throw new AppError("Executable files are not allowed", 400, "VALIDATION_ERROR", { field: "fileMetadata" });
    if (payload.mediaType === "video" && (!VIDEO_EXTENSIONS.has(ext) || !VIDEO_MIME_TYPES.has(mime))) throw new AppError("Only MP4, WebM, or MOV video files are accepted for this deliverable.", 400, "VALIDATION_ERROR", { field: "fileMetadata" });
    if (["image", "carousel"].includes(payload.mediaType) && (!IMAGE_EXTENSIONS.has(ext) || !IMAGE_MIME_TYPES.has(mime))) throw new AppError("Only JPEG, PNG, WebP, or GIF images are accepted for this deliverable.", 400, "VALIDATION_ERROR", { field: "fileMetadata" });
    if (payload.mediaType === "document" && (!DOCUMENT_EXTENSIONS.has(ext) || !DOCUMENT_MIME_TYPES.has(mime))) throw new AppError("Only PDF, DOC, or DOCX documents are accepted as proof.", 400, "VALIDATION_ERROR", { field: "fileMetadata" });
  });
}

function validateSubmissionPayload(deliverable, payload = {}) {
  const requiredKind = deliverableKind(deliverable);
  const rule = SUBMISSION_RULES[requiredKind];
  const contentType = String(payload.contentType || "").toLowerCase();
  const sourcePlatform = String(payload.sourcePlatform || "").toLowerCase();
  const mediaType = String(payload.mediaType || "").toLowerCase();
  const uploadMethod = String(payload.uploadMethod || "").toLowerCase();
  if (contentType !== requiredKind) throw new AppError(rule.message, 400, "DELIVERABLE_CONTENT_TYPE_MISMATCH", { field: "contentType" });
  if (!rule.mediaTypes.has(mediaType) || !rule.platforms.has(sourcePlatform)) {
    throw new AppError(rule.message, 400, "DELIVERABLE_CONTENT_TYPE_MISMATCH", { field: "mediaType" });
  }
  if (uploadMethod === "url") {
    if (!["instagram_post", "facebook_post", "instagram_reel", "youtube_shorts", "tiktok_video", "facebook_reel"].includes(mediaType)) {
      throw new AppError(rule.message, 400, "DELIVERABLE_CONTENT_TYPE_MISMATCH", { field: "uploadMethod" });
    }
    assertPlatformUrl(parseSafeUrl(payload.contentUrl), mediaType);
  } else if (uploadMethod === "file") {
    if (!["image", "carousel", "document", "video"].includes(mediaType)) {
      throw new AppError(rule.message, 400, "DELIVERABLE_CONTENT_TYPE_MISMATCH", { field: "uploadMethod" });
    }
    const url = parseSafeUrl(payload.contentUrl);
    if (!url.internal) throw new AppError("Uploaded media must come from the secure media uploader.", 400, "VALIDATION_ERROR", { field: "contentUrl" });
    assertFileSafety(payload);
  } else {
    throw new AppError("Upload method is required", 400, "VALIDATION_ERROR", { field: "uploadMethod" });
  }
  return {
    contentUrl: String(payload.contentUrl || "").trim(),
    contentType: requiredKind,
    sourcePlatform,
    mediaType,
    uploadMethod,
    mediaUrls: Array.isArray(payload.mediaUrls) ? payload.mediaUrls.map((url) => String(url || "").trim()).filter(Boolean) : [],
    fileMetadata: Array.isArray(payload.fileMetadata) ? payload.fileMetadata : [],
    notes: payload.notes || "",
  };
}

function campaignBudget(campaign = {}) {
  return money(campaign.pricing?.totalBudget || campaign.fixedFee || campaign.paymentModelSnapshot?.expectedBudget || 0);
}

const ESCROW_VIEW_STATUSES = ["funded", "partially_released", "fully_released", "refunded", "completed"];
const ESCROW_UPLOAD_STATUSES = ["funded", "partially_released", "fully_released"];

async function findCampaignEscrow(campaign, statuses = ESCROW_VIEW_STATUSES) {
  if (!["fixed", "hybrid"].includes(campaign.paymentType)) return null;
  return CampaignEscrowWallet.findOne({
    campaignId: campaign._id,
    vendorId: campaign.vendorId?._id || campaign.vendorId,
    status: { $in: statuses },
  }).select("_id status amountFunded amountReleased amountRefunded amountRemaining").lean();
}

async function assertFixedExecutionVisible(campaign) {
  if (!["fixed", "hybrid"].includes(campaign.paymentType)) return;
  const escrow = await findCampaignEscrow(campaign, ESCROW_VIEW_STATUSES);
  if (!escrow) {
    throw new AppError(
      "Content creation is locked until the vendor funds escrow and Razorpay confirms the payment",
      409,
      "ESCROW_FUNDING_REQUIRED"
    );
  }
  return escrow;
}

async function assertFixedContentEnabled(campaign) {
  if (!["fixed", "hybrid"].includes(campaign.paymentType)) return;
  const escrow = await findCampaignEscrow(campaign, ESCROW_UPLOAD_STATUSES);
  if (!campaign.fixedPaymentWorkflow?.contentEnabled || !escrow) {
    throw new AppError(
      "Content creation is locked until the vendor funds escrow and Razorpay confirms the payment",
      409,
      "ESCROW_FUNDING_REQUIRED"
    );
  }
  return escrow;
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
    const allocations = ["fixed", "hybrid"].includes(campaign.paymentType)
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
    const campaignObjectId = assertObjectId(campaignId, "campaignId");
    const profile = await influencerService.getProfile(userId);
    const campaign = await Campaign.findById(campaignObjectId).populate("vendorId", "shopName companyName").lean();
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
    if (String(campaign.influencerId || "") !== String(profile._id)) throw new AppError("Forbidden", 403, "FORBIDDEN");
    if (!ACTIVE_STATES.includes(campaign.state)) throw new AppError("Campaign must be accepted before content execution", 409, "INVALID_STATE");
    await assertFixedExecutionVisible(campaign);
    const deliverables = await this.ensureDeliverables(campaign);
    return this.presentExecution(campaign, deliverables, profile._id);
  }

  async vendorExecution(userId, campaignId) {
    const campaignObjectId = assertObjectId(campaignId, "campaignId");
    const vendor = await vendorRepo.findByUserId(userId);
    if (!vendor) throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
    const campaign = await Campaign.findOne({ _id: campaignObjectId, vendorId: vendor._id }).populate({ path: "influencerId", populate: { path: "userId", select: "name email username" } }).lean();
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
    const deliverables = await this.ensureDeliverables(campaign);
    return this.presentExecution(campaign, deliverables, campaign.influencerId?._id || campaign.influencerId);
  }

  async presentExecution(campaign, deliverables, influencerId) {
    const deliverableIds = deliverables.map((row) => row._id);
    const [submissions, reviews, payouts, fundings, commissions] = await Promise.all([
      deliverableIds.length ? DeliverableSubmission.find({ deliverableId: { $in: deliverableIds } }).sort({ submittedAt: -1 }).lean() : [],
      deliverableIds.length ? DeliverableReview.find({ deliverableId: { $in: deliverableIds } }).sort({ reviewedAt: -1 }).lean() : [],
      deliverableIds.length ? DeliverablePayout.find({ deliverableId: { $in: deliverableIds } }).lean() : [],
      deliverableIds.length ? CampaignDeliverableFunding.find({ deliverableId: { $in: deliverableIds } }).lean() : [],
      CommissionRecord.find({ campaignId: campaign._id, influencerId }).lean().catch(() => []),
    ]);
    const submissionMap = submissions.reduce((map, row) => {
      const key = String(row.deliverableId);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
      return map;
    }, new Map());
    const reviewMap = reviews.reduce((map, row) => {
      const key = String(row.deliverableId);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
      return map;
    }, new Map());
    const payoutMap = new Map(payouts.map((row) => [String(row.deliverableId), row]));
    const fundingMap = new Map(fundings.map((row) => [String(row.deliverableId), row]));
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
        contentEnabled: !["fixed", "hybrid"].includes(paymentType) || Boolean(campaign.fixedPaymentWorkflow?.contentEnabled),
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
      deliverables: deliverables.map((row) => {
        const deliverableReviews = reviewMap.get(String(row._id)) || [];
        const funding = fundingMap.get(String(row._id)) || null;
        return {
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
        latestReview: deliverableReviews[0] || null,
        reviews: deliverableReviews,
        payout: payoutMap.get(String(row._id)) || null,
        funding: funding
          ? {
              id: funding._id,
              status: funding.status,
              allocatedAmount: money(funding.allocatedAmount),
              releasedAmount: money(funding.releasedAmount),
              refundedAmount: money(funding.refundedAmount),
              remainingAmount: money(funding.remainingAmount),
            }
          : null,
        refundLock: deliverableRefundLock(funding),
        };
      }),
    };
  }

  async submit(userId, campaignId, deliverableId, payload = {}) {
    const campaignObjectId = assertObjectId(campaignId, "campaignId");
    const deliverableObjectId = assertObjectId(deliverableId, "deliverableId");
    const profile = await influencerService.getProfile(userId);
    const campaign = await Campaign.findOne({ _id: campaignObjectId, influencerId: profile._id }).lean();
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
    await assertFixedContentEnabled(campaign);
    const deliverable = await CampaignDeliverable.findOne({ _id: deliverableObjectId, campaignId: campaignObjectId, influencerId: profile._id });
    if (!deliverable) throw new AppError("Deliverable not found", 404, "NOT_FOUND");
    if (["approved", "completed", "cancelled"].includes(deliverable.status)) throw new AppError("This deliverable is closed for uploads", 409, "INVALID_STATE");
    const funding = await CampaignDeliverableFunding.findOne({ campaignId: campaignObjectId, deliverableId: deliverableObjectId }).lean();
    const refundLock = deliverableRefundLock(funding);
    if (refundLock.locked) {
      throw new AppError(
        "You can't create content for this deliverable because the amount was refunded to the vendor.",
        409,
        "DELIVERABLE_REFUNDED",
        { field: "deliverableId", refundedAmount: refundLock.refundedAmount }
      );
    }
    const validatedSubmission = validateSubmissionPayload(deliverable, payload);
    const latest = await DeliverableSubmission.findOne({ deliverableId: deliverableObjectId }).sort({ version: -1 }).lean();
    const oldValue = { status: deliverable.status, approvalStatus: deliverable.approvalStatus };
    const submission = await DeliverableSubmission.create({
      deliverableId: deliverableObjectId,
      campaignId: campaignObjectId,
      influencerId: profile._id,
      contentUrl: validatedSubmission.contentUrl,
      contentType: validatedSubmission.contentType,
      sourcePlatform: validatedSubmission.sourcePlatform,
      mediaType: validatedSubmission.mediaType,
      uploadMethod: validatedSubmission.uploadMethod,
      mediaUrls: validatedSubmission.mediaUrls,
      fileMetadata: validatedSubmission.fileMetadata,
      uploadedBy: userId,
      version: Number(latest?.version || 0) + 1,
      status: "under_review",
      notes: validatedSubmission.notes,
    });
    deliverable.status = "under_review";
    deliverable.approvalStatus = "under_review";
    deliverable.latestSubmissionId = submission._id;
    await deliverable.save();
    await Campaign.findByIdAndUpdate(campaignObjectId, { $set: { state: "under_review" }, $push: { history: { state: "under_review", actorId: userId, note: "Deliverable content uploaded", changedAt: new Date() } } });
    await audit({ actorId: userId, role: "influencer", action: "content_uploaded", campaignId: campaignObjectId, deliverableId: deliverableObjectId, submissionId: submission._id, oldValue, newValue: { status: "under_review" } });
    return this.influencerExecution(userId, campaignObjectId);
  }

  async review(userId, campaignId, deliverableId, payload = {}) {
    const campaignObjectId = assertObjectId(campaignId, "campaignId");
    const deliverableObjectId = assertObjectId(deliverableId, "deliverableId");
    const vendor = await vendorRepo.findByUserId(userId);
    if (!vendor) throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
    const campaign = await Campaign.findOne({ _id: campaignObjectId, vendorId: vendor._id });
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
    const deliverable = await CampaignDeliverable.findOne({ _id: deliverableObjectId, campaignId: campaignObjectId, vendorId: vendor._id });
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
      const funding = ["fixed", "hybrid"].includes(campaign.paymentType)
        ? await CampaignDeliverableFunding.findOne({ campaignId: campaign._id, deliverableId: deliverable._id }).lean()
        : null;
      const approvedAmount = funding
        ? funding.remainingAmount
        : campaign.paymentType === "hybrid" && totalDeliverableValue
        ? money((Number(deliverable.totalPrice || 0) / totalDeliverableValue) * (fixedFee || totalDeliverableValue))
        : deliverable.totalPrice;
      submission.status = "approved";
      deliverable.status = ["fixed", "hybrid"].includes(campaign.paymentType) ? "approved" : "completed";
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
      if (["fixed", "hybrid"].includes(campaign.paymentType)) {
        campaign.fixedPaymentWorkflow.status = "vendor_approved";
        campaign.fixedPaymentWorkflow.lastTransitionAt = new Date();
        await campaign.save();
        await notificationService.notifyAdmins({
          module: "FINANCE",
          subModule: "INFLUENCER_COMMERCE",
          type: "INFLUENCER_COMMERCE",
          title: `${campaign.paymentType === "hybrid" ? "Hybrid" : "Fixed"} campaign release ready`,
          message: `${campaign.title || "Campaign"} has an approved deliverable awaiting escrow release.`,
          referenceId: campaign._id,
          meta: {
            campaignId: String(campaign._id),
            deliverableId: String(deliverable._id),
            influencerId: String(deliverable.influencerId),
          },
        }, "influencerCommerce.read").catch(() => null);
      }
      if (["commission", "hybrid"].includes(campaign.paymentType)) {
        campaign.commissionWorkflow = {
          ...(campaign.commissionWorkflow || {}),
          contentEnabled: true,
          publishEnabled: true,
          contentApprovedAt: new Date(),
        };
        await campaign.save();
        await commissionService.ensureCampaignAffiliateLinks(campaign._id, { activate: false, actor: { _id: userId, role: "vendor" } });
        const influencerProfile = await InfluencerProfile.findById(deliverable.influencerId).select("userId").lean();
        if (influencerProfile?.userId) {
          await notificationService.createNotification({
            userId: influencerProfile.userId,
            role: "INFLUENCER",
            module: "GROWTH",
            subModule: "INFLUENCER_COMMERCE",
            type: "CONTENT_APPROVED",
            title: "Content approved",
            message: `${campaign.title || "Campaign"} content was approved. Publishing is now enabled.`,
            referenceId: campaign._id,
            meta: { campaignId: String(campaign._id), deliverableId: String(deliverable._id) },
          }).catch(() => null);
        }
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
    if (current.total > 0 && current.completed === current.total) nextStatus = "approved";
    else if (current.completed > 0) nextStatus = "partially_completed";
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
    const campaignObjectId = assertObjectId(campaignId, "campaignId");
    // Get profile to verify influencer
    const profile = await influencerService.getProfile(userId);
    
    // Get campaign and verify it belongs to influencer
    const campaign = await Campaign.findById(campaignObjectId);
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
    if (String(campaign.influencerId || "") !== String(profile._id)) throw new AppError("Forbidden", 403, "FORBIDDEN");
    
    // Get all deliverables for campaign
    const deliverables = await CampaignDeliverable.find({ campaignId: campaignObjectId }).lean();
    if (!deliverables.length) return { success: false, message: "No deliverables found" };
    
    // Check if all deliverables have associated published content
    const publishedContent = await Reel.find({
      campaignId: campaignObjectId,
      visibility: "published"
    }).lean().catch(() => []);
    
    const publishedCount = publishedContent.length;
    const publication = allDeliverablesPublished(deliverables, publishedCount);
    const totalDeliverables = publication.requiredCount;
    
    if (publication.complete && campaign.state !== "completed") {
      // All deliverables have been published - mark campaign as completed
      await CampaignStatusHistory.create({
        campaignId: campaignObjectId,
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
        campaignId: campaignObjectId,
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
module.exports.__private__ = { deriveDeliverables, progress, money, requiredPublishedContentCount, allDeliverablesPublished };
