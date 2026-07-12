const mongoose = require("mongoose");
const { AppError } = require("../../utils/AppError");
const auditService = require("../../services/audit.service");
const notificationService = require("../../services/notification.service");
const vendorRepo = require("../../repositories/vendor.repository");
const influencerService = require("../influencer/service");
const commissionService = require("../commission/service");
const schedulingService = require("../../services/campaign-scheduling.service");
const { CommissionRecord, AffiliateLink } = require("../commission/models");
const { Campaign, CampaignInvitation, CampaignStatusHistory } = require("./model");
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
  "content_creation",
  "active",
  "product_shipped",
  "content_in_progress",
  "content_submitted",
  "under_review",
  "revision_requested",
  "approved",
  "ready_for_publish",
  "publish_scheduled",
  "published",
  "tracking_active",
  "live",
  "partially_completed",
  "completed",
];

const LIFECYCLE = Object.freeze({
  INVITATION_PENDING: "INVITATION_PENDING",
  INVITATION_EXPIRED: "INVITATION_EXPIRED",
  CONTENT_CREATION: "CONTENT_CREATION",
  UNDER_REVIEW: "UNDER_REVIEW",
  READY_FOR_PUBLISH: "READY_FOR_PUBLISH",
  PUBLISH_SCHEDULED: "PUBLISH_SCHEDULED",
  LIVE: "LIVE",
  CONTENT_DEADLINE_MISSED: "CONTENT_DEADLINE_MISSED",
  COMPLETED: "COMPLETED",
});

const CONTENT_UPLOAD_LIFECYCLES = [
  LIFECYCLE.CONTENT_CREATION,
  LIFECYCLE.UNDER_REVIEW,
  LIFECYCLE.READY_FOR_PUBLISH,
  LIFECYCLE.PUBLISH_SCHEDULED,
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
  const dueDate = row.dueDate || row.deliveryDate || row.expectedCompletionDate || campaign.endDate || campaign.deadline || undefined;
  return {
    deliverableType: String(row.serviceTypeKey || row.serviceType || row.type || serviceName).toLowerCase().replace(/\s+/g, "_"),
    title: serviceName,
    quantity,
    unitPrice,
    totalPrice: money(total || unitPrice * quantity),
    currency: row.currency || campaign.pricing?.currency || "INR",
    expectedCompletionDate: dueDate,
    dueDate,
    dueTime: row.dueTime || row.deliveryTime || "",
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

function isDeliverableDueExpired(deliverable = {}, now = new Date()) {
  const due = deliverable.dueDate || deliverable.expectedCompletionDate;
  if (!due) return false;
  const date = new Date(due);
  if (Number.isNaN(date.getTime())) return false;
  date.setUTCHours(23, 59, 59, 999);
  return date.getTime() < now.getTime();
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + Number(days || 0));
  return next;
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
    contentTitle: String(payload.contentTitle || "").trim(),
    contentDescription: String(payload.contentDescription || "").trim(),
    contentCaption: String(payload.contentCaption || "").trim(),
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
      dueDate: schedulingService.validateDeliverableDueDate(row.dueDate || row.expectedCompletionDate, campaign) || row.dueDate || row.expectedCompletionDate,
      expectedCompletionDate: schedulingService.validateDeliverableDueDate(row.dueDate || row.expectedCompletionDate, campaign) || row.expectedCompletionDate,
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
    const [submissions, reviews, payouts, fundings, commissions, affiliateLinks] = await Promise.all([
      deliverableIds.length ? DeliverableSubmission.find({ deliverableId: { $in: deliverableIds } }).sort({ submittedAt: -1 }).lean() : [],
      deliverableIds.length ? DeliverableReview.find({ deliverableId: { $in: deliverableIds } }).sort({ reviewedAt: -1 }).lean() : [],
      deliverableIds.length ? DeliverablePayout.find({ deliverableId: { $in: deliverableIds } }).lean() : [],
      deliverableIds.length ? CampaignDeliverableFunding.find({ deliverableId: { $in: deliverableIds } }).lean() : [],
      CommissionRecord.find({ campaignId: campaign._id, influencerId }).lean().catch(() => []),
      deliverableIds.length ? AffiliateLink.find({ deliverableId: { $in: deliverableIds } }).sort({ createdAt: 1 }).lean() : [],
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
    const affiliateLinkMap = affiliateLinks.reduce((map, row) => {
      const key = String(row.deliverableId || "");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
      return map;
    }, new Map());
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
    const affiliateTotals = deliverables.reduce((totals, row) => {
      const metrics = row.affiliateMetrics || {};
      totals.clicks += Number(metrics.clicks || 0);
      totals.orders += Number(metrics.orders || 0);
      totals.conversions += Number(metrics.conversions || 0);
      totals.revenue += Number(metrics.revenue || 0);
      totals.commission += Number(metrics.commissionGenerated || 0);
      if (row.status === "published") totals.publishedDeliverables += 1;
      else if (!["expired", "cancelled", "missed_deadline"].includes(String(row.status || "").toLowerCase())) totals.pendingDeliverables += 1;
      return totals;
    }, { clicks: 0, orders: 0, conversions: 0, revenue: 0, commission: 0, publishedDeliverables: 0, pendingDeliverables: 0 });
    return {
      campaign: {
        id: campaign._id,
        title: campaign.title || "Campaign",
        campaignType: campaign.campaignType,
        vendor: campaign.vendorId,
        influencer: campaign.influencerId,
        paymentModel: paymentType,
        budget: campaignBudget(campaign),
        startDate: campaign.startDate || campaign.createdAt,
        endDate: campaign.endDate || campaign.deadline || campaign.marketplace?.applicationDeadline || null,
        lifecycleStatus: campaign.currentLifecycleStatus || null,
        lifecycle: {
          invitationSentAt: campaign.invitationSentAt || null,
          invitationDeadline: campaign.invitationDeadline || campaign.marketplace?.applicationDeadline || null,
          acceptedAt: campaign.acceptedAt || null,
          contentCreationStartDate: campaign.contentCreationStartDate || null,
          contentCreationDeadline: campaign.contentCreationDeadline || null,
          publishScheduledAt: campaign.publishScheduledAt || null,
          publishedAt: campaign.publishedAt || null,
          campaignStartedAt: campaign.campaignStartedAt || null,
          campaignEndDate: campaign.campaignEndDate || campaign.endDate || null,
          campaignCompletedAt: campaign.campaignCompletedAt || null,
          campaignDurationDays: campaign.campaignDurationDays || null,
          affiliateEnabled: Boolean(campaign.scheduling?.affiliateEnabled),
          trackingEnabled: Boolean(campaign.scheduling?.trackingEnabled),
          commissionEnabled: Boolean(campaign.scheduling?.commissionEnabled),
        },
        status: campaign.state,
        scheduling: campaign.scheduling || null,
        fixedPaymentWorkflow: campaign.fixedPaymentWorkflow || null,
        contentEnabled: !["fixed", "hybrid"].includes(paymentType) || Boolean(campaign.fixedPaymentWorkflow?.contentEnabled),
      },
      progress: progress(deliverables),
      affiliatePerformance: {
        ...affiliateTotals,
        revenue: money(affiliateTotals.revenue),
        commission: money(affiliateTotals.commission),
        conversionRate: affiliateTotals.clicks ? Number(((affiliateTotals.conversions / affiliateTotals.clicks) * 100).toFixed(2)) : 0,
      },
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
        const links = affiliateLinkMap.get(String(row._id)) || [];
        const primaryLink = links.find((link) => String(link.status).toLowerCase() === "active") || links[0] || null;
        const affiliateMetrics = row.affiliateMetrics || {};
        const impressions = Number(row.snapshot?.impressions || row.snapshot?.views || 0);
        return {
        id: row._id,
        deliverableType: row.deliverableType,
        title: row.title || titleize(row.deliverableType),
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        totalPrice: row.totalPrice,
        currency: row.currency,
        expectedCompletionDate: row.expectedCompletionDate,
        dueDate: row.dueDate || row.expectedCompletionDate,
        dueTime: row.dueTime || "",
        status: row.status,
        approvalStatus: row.approvalStatus,
        completionStatus: row.completionStatus,
        paymentEligibility: row.paymentEligibility,
        approvedAt: row.approvedAt,
        publishDate: row.publishDate,
        publishTime: row.publishTime,
        publishTimezone: row.publishTimezone,
        scheduledPublishAt: row.scheduledPublishAt,
        publishedAt: row.publishedAt,
        trackingStartDate: row.trackingStartDate || null,
        trackingEndDate: row.trackingEndDate || null,
        trackingStatus: row.trackingStatus || "inactive",
        affiliateStatus: row.affiliateStatus || "pending_content",
        affiliateLink: primaryLink?.destinationUrl || "",
        affiliateTrackingCode: primaryLink?.trackingCode || "",
        affiliateLinks: links.map((link) => ({
          id: link._id,
          productId: link.productId,
          url: link.destinationUrl,
          trackingCode: link.trackingCode,
          status: link.status,
          trackingStatus: link.trackingStatus,
          trackingStartDate: link.activatedAt || null,
          trackingEndDate: link.expiresAt || null,
        })),
        affiliateMetrics: {
          clicks: Number(affiliateMetrics.clicks || 0),
          orders: Number(affiliateMetrics.orders || 0),
          conversions: Number(affiliateMetrics.conversions || 0),
          revenue: money(affiliateMetrics.revenue),
          commission: money(affiliateMetrics.commissionGenerated),
          conversionRate: Number(affiliateMetrics.clicks || 0) ? Number(((Number(affiliateMetrics.conversions || 0) / Number(affiliateMetrics.clicks)) * 100).toFixed(2)) : 0,
          ctr: impressions ? Number(((Number(affiliateMetrics.clicks || 0) / impressions) * 100).toFixed(2)) : 0,
        },
        expiredAt: row.expiredAt,
        refundEligible: Boolean(row.refundEligible),
        refundStatus: row.refundStatus || "not_eligible",
        missedDeadline: Boolean(row.missedDeadline),
        uploadLocked: ["expired", "missed_deadline", "cancelled", "published"].includes(String(row.status || "").toLowerCase()) || isDeliverableDueExpired(row),
        publishLocked: Boolean(row.scheduledPublishAt && new Date(row.scheduledPublishAt).getTime() > Date.now()),
        publishAvailableAt: row.scheduledPublishAt || null,
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
    if (!CONTENT_UPLOAD_LIFECYCLES.includes(campaign.currentLifecycleStatus)) {
      throw new AppError("Content upload is not available in the current campaign lifecycle phase", 409, "CAMPAIGN_UPLOAD_LOCKED", {
        lifecycleStatus: campaign.currentLifecycleStatus,
      });
    }
    if (campaign.contentCreationDeadline && new Date(campaign.contentCreationDeadline).getTime() < Date.now()) {
      throw new AppError("Content creation deadline has passed. Upload is disabled.", 409, "CONTENT_CREATION_DEADLINE_EXPIRED");
    }
    await assertFixedContentEnabled(campaign);
    const deliverable = await CampaignDeliverable.findOne({ _id: deliverableObjectId, campaignId: campaignObjectId, influencerId: profile._id });
    if (!deliverable) throw new AppError("Deliverable not found", 404, "NOT_FOUND");
    schedulingService.assertUploadOpen(deliverable);
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
      contentTitle: validatedSubmission.contentTitle,
      contentDescription: validatedSubmission.contentDescription,
      contentCaption: validatedSubmission.contentCaption,
      uploadedBy: userId,
      version: Number(latest?.version || 0) + 1,
      status: "under_review",
      notes: validatedSubmission.notes,
    });
    deliverable.status = "under_review";
    deliverable.approvalStatus = "under_review";
    deliverable.latestSubmissionId = submission._id;
    await deliverable.save();
    await Campaign.findByIdAndUpdate(campaignObjectId, {
      $set: {
        state: "under_review",
        currentLifecycleStatus: LIFECYCLE.UNDER_REVIEW,
      },
      $push: { history: { state: "under_review", actorId: userId, note: "Deliverable content uploaded; vendor review requested", changedAt: new Date() } },
    });
    await audit({ actorId: userId, role: "influencer", action: "content_uploaded", campaignId: campaignObjectId, deliverableId: deliverableObjectId, submissionId: submission._id, oldValue, newValue: { status: "under_review" } });
    return this.influencerExecution(userId, campaignObjectId);
  }

  async updateSubmissionDetails(userId, campaignId, deliverableId, payload = {}) {
    const campaignObjectId = assertObjectId(campaignId, "campaignId");
    const deliverableObjectId = assertObjectId(deliverableId, "deliverableId");
    const profile = await influencerService.getProfile(userId);
    const campaign = await Campaign.findOne({ _id: campaignObjectId, influencerId: profile._id }).lean();
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
    const deliverable = await CampaignDeliverable.findOne({ _id: deliverableObjectId, campaignId: campaignObjectId, influencerId: profile._id }).lean();
    if (!deliverable) throw new AppError("Deliverable not found", 404, "NOT_FOUND");
    const submission = await DeliverableSubmission.findById(deliverable.latestSubmissionId || payload.submissionId);
    if (!submission || String(submission.deliverableId) !== String(deliverable._id)) throw new AppError("Submission not found", 404, "NOT_FOUND");
    if (deliverable.status === "published" || submission.status === "published") {
      throw new AppError("Published content details cannot be changed.", 409, "DELIVERABLE_ALREADY_PUBLISHED");
    }
    const oldValue = {
      contentTitle: submission.contentTitle,
      contentDescription: submission.contentDescription,
      contentCaption: submission.contentCaption,
    };
    submission.contentTitle = String(payload.contentTitle || "").trim();
    submission.contentDescription = String(payload.contentDescription || "").trim();
    submission.contentCaption = String(payload.contentCaption || "").trim();
    await submission.save();
    await audit({
      actorId: userId,
      role: "influencer",
      action: "submission_details_updated",
      campaignId: campaignObjectId,
      deliverableId: deliverableObjectId,
      submissionId: submission._id,
      oldValue,
      newValue: {
        contentTitle: submission.contentTitle,
        contentDescription: submission.contentDescription,
        contentCaption: submission.contentCaption,
      },
    });
    return this.influencerExecution(userId, campaignObjectId);
  }

  async review(userId, campaignId, deliverableId, payload = {}) {
    const campaignObjectId = assertObjectId(campaignId, "campaignId");
    const deliverableObjectId = assertObjectId(deliverableId, "deliverableId");
    const vendor = await vendorRepo.findByUserId(userId);
    if (!vendor) throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
    const campaign = await Campaign.findOne({ _id: campaignObjectId, vendorId: vendor._id });
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
    if (campaign.contentCreationDeadline && new Date(campaign.contentCreationDeadline).getTime() < Date.now()) {
      throw new AppError("Content creation deadline has passed. Review is disabled.", 409, "CONTENT_CREATION_DEADLINE_EXPIRED");
    }
    const deliverable = await CampaignDeliverable.findOne({ _id: deliverableObjectId, campaignId: campaignObjectId, vendorId: vendor._id });
    if (!deliverable) throw new AppError("Deliverable not found", 404, "NOT_FOUND");
    const submission = await DeliverableSubmission.findById(payload.submissionId || deliverable.latestSubmissionId);
    if (!submission || String(submission.deliverableId) !== String(deliverable._id)) throw new AppError("Submission not found", 404, "NOT_FOUND");
    const decision = payload.decision === "approve" ? "approve" : payload.decision === "reject" ? "reject" : "revision_requested";
    if (["approved", "completed"].includes(String(deliverable.status || "").toLowerCase()) || deliverable.approvalStatus === "approved") {
      throw new AppError("Approved deliverables cannot be rejected or changed.", 409, "DELIVERABLE_ALREADY_APPROVED");
    }
    if (["reject", "revision_requested"].includes(decision) && !String(payload.comments || payload.note || "").trim()) {
      throw new AppError("A reason is required so the influencer knows what to change.", 400, "REVIEW_REASON_REQUIRED", { field: "comments" });
    }
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
      const publishSchedule = await schedulingService.validatePublishSchedule({
        campaign,
        deliverable,
        publishDate: payload.publishDate || payload.scheduledPublishAt,
        publishTime: payload.publishTime || "00:00",
        timezone: payload.timezone || payload.publishTimezone || "UTC",
      });
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
      deliverable.status = "approved";
      deliverable.approvalStatus = "approved";
      deliverable.completionStatus = "completed";
      deliverable.paymentEligibility = "eligible";
      deliverable.approvedAt = new Date();
      deliverable.publishDate = publishSchedule.publishDate;
      deliverable.publishTime = publishSchedule.publishTime;
      deliverable.publishTimezone = publishSchedule.publishTimezone;
      deliverable.scheduledPublishAt = publishSchedule.scheduledPublishAt;
      deliverable.completedAt = new Date();
      campaign.publishScheduledAt = campaign.publishScheduledAt && campaign.publishScheduledAt < publishSchedule.scheduledPublishAt
        ? campaign.publishScheduledAt
        : publishSchedule.scheduledPublishAt;
      const allApprovedAfterThisReview = allDeliverables.every((row) => {
        if (String(row._id) === String(deliverable._id)) return true;
        return row.completionStatus === "completed" || ["approved", "completed", "published"].includes(String(row.status || "").toLowerCase());
      });
      campaign.currentLifecycleStatus = allApprovedAfterThisReview ? LIFECYCLE.PUBLISH_SCHEDULED : LIFECYCLE.UNDER_REVIEW;
      campaign.state = allApprovedAfterThisReview ? "publish_scheduled" : "partially_completed";
      campaign.scheduling = {
        ...(campaign.scheduling || {}),
        affiliateEnabled: false,
        trackingEnabled: false,
        commissionEnabled: false,
      };
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
          trackingActive: false,
        };
        await campaign.save();
        await commissionService.ensureDeliverableAffiliateLinks(campaign._id, deliverable._id, { activate: false, actor: { _id: userId, role: "vendor" } });
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
    await campaign.save();
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
    if (["publish_scheduled", "live", "completed", "content_deadline_missed", "expired", "cancelled", "rejected"].includes(campaign.state)) {
      return campaign;
    }
    // Only set to partially_completed or under_review, NOT completed
    // Campaign should only be marked completed when influencer publishes content
    if (current.total > 0 && current.completed === current.total) nextStatus = deliverables.some((row) => row.scheduledPublishAt) ? "publish_scheduled" : "ready_for_publish";
    else if (current.completed > 0) nextStatus = "partially_completed";
    else if (deliverables.some((row) => row.status === "under_review")) nextStatus = "under_review";
    
    if (nextStatus !== campaign.state) {
      await CampaignStatusHistory.create({ campaignId, oldStatus: campaign.state, newStatus: nextStatus, changedBy: actorId, changedByRole: "system", reason: "Deliverable execution progress updated" });
      const nextLifecycle = nextStatus === "under_review"
        ? LIFECYCLE.UNDER_REVIEW
        : nextStatus === "publish_scheduled"
          ? LIFECYCLE.PUBLISH_SCHEDULED
          : nextStatus === "ready_for_publish"
            ? LIFECYCLE.READY_FOR_PUBLISH
            : campaign.currentLifecycleStatus;
      campaign.state = nextStatus;
      campaign.currentLifecycleStatus = nextLifecycle;
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
    const campaigns = await Campaign.find(campaignMatch).select("_id title campaignType paymentType influencerId endDate deadline").lean();
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
    const deliverableIds = deliverables.map((row) => row._id);
    const reviews = deliverableIds.length
      ? await DeliverableReview.find({ deliverableId: { $in: deliverableIds } }).sort({ reviewedAt: -1 }).lean()
      : [];
    const reviewMap = reviews.reduce((map, row) => {
      const key = String(row.deliverableId);
      if (!map.has(key)) map.set(key, row);
      return map;
    }, new Map());
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
        dueDate: row.dueDate || row.expectedCompletionDate,
        expectedCompletionDate: row.expectedCompletionDate,
        latestSubmission: submissionMap.get(String(row.latestSubmissionId)) || null,
        latestReview: reviewMap.get(String(row._id)) || null,
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
    
    if (publication.complete && campaign.currentLifecycleStatus !== LIFECYCLE.LIVE && campaign.currentLifecycleStatus !== LIFECYCLE.COMPLETED) {
      const now = new Date();
      const durationDays = Number(campaign.campaignDurationDays || campaign.lifecycleConfig?.campaignDurationDays || 30);
      const campaignEndDate = campaign.campaignEndDate || addDays(now, durationDays);
      await CampaignStatusHistory.create({
        campaignId: campaignObjectId,
        oldStatus: campaign.state,
        newStatus: "live",
        changedBy: userId,
        changedByRole: "influencer",
        reason: "All approved deliverables published; campaign is live"
      });
      
      campaign.state = "live";
      campaign.currentLifecycleStatus = LIFECYCLE.LIVE;
      campaign.publishedAt = campaign.publishedAt || now;
      campaign.campaignStartedAt = campaign.campaignStartedAt || now;
      campaign.startDate = campaign.startDate || now;
      campaign.campaignEndDate = campaignEndDate;
      campaign.endDate = campaignEndDate;
      campaign.scheduling = {
        ...(campaign.scheduling || {}),
        activatedAt: campaign.scheduling?.activatedAt || now,
        affiliateEnabled: true,
        trackingEnabled: true,
        commissionEnabled: ["commission", "hybrid"].includes(campaign.paymentType),
      };
      campaign.commissionWorkflow = {
        ...(campaign.commissionWorkflow || {}),
        publishEnabled: true,
        trackingActive: ["commission", "hybrid"].includes(campaign.paymentType),
        trackingActivatedAt: ["commission", "hybrid"].includes(campaign.paymentType) ? now : campaign.commissionWorkflow?.trackingActivatedAt,
      };
      campaign.history.push({
        state: "live",
        actorId: userId,
        note: "All deliverables published; campaign is live",
        changedAt: now
      });
      await campaign.save();
      await auditService.log({
        actorId: userId,
        role: "influencer",
        action: "campaign_started",
        campaignId: campaignObjectId,
        metadata: { reason: "All deliverables published", publishedCount, totalDeliverables }
      });
      
      return { success: true, message: "Campaign is live", campaignState: "live", campaignEndDate };
    }
    
    return { 
      success: false, 
      message: `Not all deliverables are published. ${publishedCount}/${totalDeliverables} published`,
      publishedCount,
      totalDeliverables
    };
  }

  async runScheduledMaintenance({ now = new Date(), actor = { role: "system" } } = {}) {
    const settings = await schedulingService.getSettings();
    const graceMs = Number(settings.gracePeriodHours || 0) * 60 * 60 * 1000;
    const deadlineCutoff = new Date(now.getTime() - graceMs);
    const summary = {
      activatedCampaigns: 0,
      expiredDeliverables: 0,
      refundEligibleDeliverables: 0,
      expiredCampaigns: 0,
      completedCampaigns: 0,
      autoPublishedContent: 0,
      deadlineRemindersSent: 0,
      expiredInvitations: 0,
      contentDeadlineMissed: 0,
    };

    const expiredInvitationCampaigns = await Campaign.find({
      state: { $in: ["proposed", "invitation_sent", "pending_review"] },
      "marketplace.applicationDeadline": { $ne: null, $lte: now },
    }).limit(500);
    for (const campaign of expiredInvitationCampaigns) {
      const previous = campaign.state;
      campaign.state = "invitation_expired";
      campaign.currentLifecycleStatus = LIFECYCLE.INVITATION_EXPIRED;
      campaign.scheduling = {
        ...(campaign.scheduling || {}),
        expiredAt: now,
        affiliateEnabled: false,
        trackingEnabled: false,
        commissionEnabled: false,
      };
      campaign.history.push({ state: "invitation_expired", actorId: actor?._id || actor?.sub || null, note: "Invitation acceptance deadline passed", changedAt: now });
      await campaign.save();
      await CampaignInvitation.updateMany(
        { campaignId: campaign._id, status: { $in: ["invitation_sent", "viewed"] } },
        { $set: { status: "expired", "metadata.expiredAt": now, "metadata.expiredReason": "Invitation acceptance deadline passed" } }
      );
      await CampaignStatusHistory.create({
        campaignId: campaign._id,
        oldStatus: previous,
        newStatus: "invitation_expired",
        changedBy: actor?._id || actor?.sub || null,
        changedByRole: actor?.role || "system",
        reason: "Invitation acceptance deadline passed",
      }).catch(() => null);
      summary.expiredInvitations += 1;
    }

    const missedContentCampaigns = await Campaign.find({
      currentLifecycleStatus: { $in: [LIFECYCLE.CONTENT_CREATION, LIFECYCLE.UNDER_REVIEW] },
      contentCreationDeadline: { $ne: null, $lte: deadlineCutoff },
    }).limit(500);
    for (const campaign of missedContentCampaigns) {
      const pendingCount = await CampaignDeliverable.countDocuments({
        campaignId: campaign._id,
        status: { $nin: ["approved", "published", "completed", "cancelled"] },
      });
      if (!pendingCount) continue;
      const previous = campaign.state;
      campaign.state = "content_deadline_missed";
      campaign.currentLifecycleStatus = LIFECYCLE.CONTENT_DEADLINE_MISSED;
      campaign.scheduling = {
        ...(campaign.scheduling || {}),
        affiliateEnabled: false,
        trackingEnabled: false,
        commissionEnabled: false,
      };
      campaign.commissionWorkflow = {
        ...(campaign.commissionWorkflow || {}),
        publishEnabled: false,
        trackingActive: false,
        closedAt: now,
        closedReason: "Content creation deadline missed",
      };
      campaign.history.push({ state: "content_deadline_missed", actorId: actor?._id || actor?.sub || null, note: "Content creation deadline missed", changedAt: now });
      await campaign.save();
      await CampaignDeliverable.updateMany(
        {
          campaignId: campaign._id,
          status: { $nin: ["approved", "published", "completed", "cancelled"] },
        },
        {
          $set: {
            status: "missed_deadline",
            missedDeadline: true,
            expiredAt: now,
            refundEligible: settings.enableEscrowRefund && schedulingService.supportsFixedScheduling(campaign),
            refundStatus: settings.enableEscrowRefund && schedulingService.supportsFixedScheduling(campaign) ? "refund_eligible" : "not_eligible",
          },
        }
      );
      await CampaignStatusHistory.create({
        campaignId: campaign._id,
        oldStatus: previous,
        newStatus: "content_deadline_missed",
        changedBy: actor?._id || actor?.sub || null,
        changedByRole: actor?.role || "system",
        reason: "Content creation deadline missed",
      }).catch(() => null);
      summary.contentDeadlineMissed += 1;
    }

    const activatableCampaigns = await Campaign.find({
      paymentType: { $in: ["fixed", "hybrid"] },
      state: "accepted",
      startDate: { $lte: now },
      "fixedPaymentWorkflow.status": "funded",
    }).limit(500);
    for (const campaign of activatableCampaigns) {
      const escrow = await CampaignEscrowWallet.findOne({ campaignId: campaign._id, status: { $in: ["funded", "partially_released"] } }).lean();
      if (!escrow) continue;
      const previous = campaign.state;
      campaign.state = "active";
      campaign.fixedPaymentWorkflow = {
        ...(campaign.fixedPaymentWorkflow || {}),
        status: "funded",
        contentEnabled: true,
        lastTransitionAt: now,
      };
      campaign.scheduling = { ...(campaign.scheduling || {}), activatedAt: now };
      campaign.history.push({ state: "active", actorId: actor?._id || actor?.sub || null, note: "Campaign activated automatically on start date", changedAt: now });
      await campaign.save();
      await CampaignStatusHistory.create({
        campaignId: campaign._id,
        oldStatus: previous,
        newStatus: "active",
        changedBy: actor?._id || actor?.sub || null,
        changedByRole: actor?.role || "system",
        reason: "Campaign start date reached",
      }).catch(() => null);
      summary.activatedCampaigns += 1;
    }

    if (settings.enableDeadlineReminders) {
      const reminderWindows = [
        { key: "due24h", hours: 24, title: "Deliverable due soon", message: "1 day remaining to upload your campaign deliverable." },
        { key: "due6h", hours: 6, title: "Deliverable due soon", message: "6 hours remaining to upload your campaign deliverable." },
      ];
      for (const window of reminderWindows) {
        const upper = new Date(now.getTime() + window.hours * 60 * 60 * 1000);
        const rows = await CampaignDeliverable.find({
          status: { $in: ["pending", "uploaded", "revision_requested"] },
          dueDate: { $gt: now, $lte: upper },
          [`snapshot.reminders.${window.key}`]: { $ne: true },
        }).limit(200);
        for (const deliverable of rows) {
          const profile = await InfluencerProfile.findById(deliverable.influencerId).select("userId").lean();
          if (profile?.userId) {
            await notificationService.createNotification({
              userId: profile.userId,
              role: "INFLUENCER",
              module: "GROWTH",
              subModule: "INFLUENCER_COMMERCE",
              type: "DELIVERABLE_DUE_SOON",
              title: window.title,
              message: `${window.message} ${deliverable.title || "Deliverable"} is due on ${new Date(deliverable.dueDate).toLocaleString()}.`,
              referenceId: deliverable.campaignId,
              meta: { campaignId: String(deliverable.campaignId), deliverableId: String(deliverable._id), reminder: window.key },
            }).catch(() => null);
          }
          deliverable.snapshot = {
            ...(deliverable.snapshot || {}),
            reminders: { ...(deliverable.snapshot?.reminders || {}), [window.key]: true },
          };
          await deliverable.save();
          summary.deadlineRemindersSent += 1;
        }
      }
    }

    if (settings.autoExpireDeliverables) {
      const dueDeliverables = await CampaignDeliverable.find({
        dueDate: { $lte: deadlineCutoff },
        status: { $in: ["pending", "uploaded"] },
      }).limit(500);
      for (const deliverable of dueDeliverables) {
        const campaign = await Campaign.findById(deliverable.campaignId).select("_id title paymentType vendorId influencerId state").lean();
        const hasUpload = Boolean(deliverable.latestSubmissionId);
        const refundEligible = settings.enableEscrowRefund && schedulingService.supportsFixedScheduling(campaign) && !hasUpload;
        deliverable.status = hasUpload ? "expired" : "missed_deadline";
        deliverable.approvalStatus = hasUpload ? deliverable.approvalStatus : "pending";
        deliverable.missedDeadline = !hasUpload;
        deliverable.expiredAt = now;
        deliverable.refundEligible = refundEligible;
        deliverable.refundStatus = refundEligible ? "refund_eligible" : "not_eligible";
        await deliverable.save();
        summary.expiredDeliverables += 1;
        if (refundEligible) summary.refundEligibleDeliverables += 1;
        await audit({
          actorId: actor?._id || actor?.sub || null,
          role: actor?.role || "system",
          action: refundEligible ? "refund_enabled" : "deadline_missed",
          campaignId: deliverable.campaignId,
          deliverableId: deliverable._id,
          oldValue: { status: "pending" },
          newValue: { status: deliverable.status, refundEligible },
        }).catch(() => null);
      }
    }

    if (settings.autoExpireCampaign) {
      const campaigns = await Campaign.find({
        currentLifecycleStatus: LIFECYCLE.LIVE,
        campaignEndDate: { $ne: null, $lte: now },
      }).limit(500);
      for (const campaign of campaigns) {
        const previous = campaign.state;
        campaign.state = "completed";
        campaign.currentLifecycleStatus = LIFECYCLE.COMPLETED;
        campaign.campaignCompletedAt = now;
        campaign.scheduling = {
          ...(campaign.scheduling || {}),
          affiliateEnabled: false,
          trackingEnabled: false,
          commissionEnabled: false,
        };
        campaign.commissionWorkflow = {
          ...(campaign.commissionWorkflow || {}),
          publishEnabled: false,
          trackingActive: false,
          closedAt: now,
          closedReason: "Campaign completed after configured duration",
        };
        campaign.history.push({ state: "completed", actorId: actor?._id || actor?.sub || null, note: "Campaign completed after configured duration", changedAt: now });
        await campaign.save();
        await commissionService.closeExpiredCampaignAttribution(campaign, {
          actor,
          reason: "Campaign completed after configured duration",
        }).catch(() => null);
        await CampaignStatusHistory.create({
          campaignId: campaign._id,
          oldStatus: previous,
          newStatus: "completed",
          changedBy: actor?._id || actor?.sub || null,
          changedByRole: actor?.role || "system",
          reason: "Campaign completed after configured duration",
        }).catch(() => null);
        summary.completedCampaigns += 1;
      }
    }

    const scheduledReels = await Reel.find({
      campaignId: { $ne: null },
      visibility: "scheduled",
      scheduledAt: { $lte: now },
    }).limit(200);
    for (const reel of scheduledReels) {
        const campaign = await Campaign.findById(reel.campaignId).lean();
        const deliverable = await CampaignDeliverable.findOne({
          campaignId: reel.campaignId,
          influencerId: reel.influencerId,
          ...(reel.deliverableId ? { _id: reel.deliverableId } : {}),
          status: { $in: ["approved", "completed"] },
          scheduledPublishAt: { $lte: now },
        });
        if (!campaign || !deliverable) continue;
        try {
          schedulingService.assertPublishOpen(campaign, deliverable, now);
        } catch {
          continue;
        }
        reel.visibility = "published";
        reel.state = "published";
        reel.publishedAt = now;
        await reel.save();
        deliverable.status = "published";
        deliverable.publishedAt = now;
        deliverable.affiliateEnabled = true;
        deliverable.trackingEnabled = true;
        await deliverable.save();
        const liveEndDate = campaign.campaignEndDate || addDays(now, Number(campaign.campaignDurationDays || campaign.lifecycleConfig?.campaignDurationDays || settings.defaultCampaignDurationDays || 30));
        await Campaign.updateOne(
          { _id: reel.campaignId, currentLifecycleStatus: { $ne: LIFECYCLE.COMPLETED } },
          {
            $set: {
              state: "live",
              currentLifecycleStatus: LIFECYCLE.LIVE,
              publishedAt: campaign.publishedAt || now,
              campaignStartedAt: campaign.campaignStartedAt || now,
              startDate: campaign.startDate || now,
              campaignEndDate: liveEndDate,
              endDate: liveEndDate,
              "scheduling.activatedAt": campaign.scheduling?.activatedAt || now,
              "scheduling.affiliateEnabled": true,
              "scheduling.trackingEnabled": true,
              "scheduling.commissionEnabled": ["commission", "hybrid"].includes(campaign.paymentType),
              "commissionWorkflow.publishEnabled": true,
              "commissionWorkflow.trackingActive": ["commission", "hybrid"].includes(campaign.paymentType),
              "commissionWorkflow.trackingActivatedAt": ["commission", "hybrid"].includes(campaign.paymentType) ? now : campaign.commissionWorkflow?.trackingActivatedAt,
            },
            $push: { history: { state: "live", actorId: actor?._id || actor?.sub || null, note: "Scheduled content published; campaign is live", changedAt: now } },
          }
        );
        await CampaignStatusHistory.create({
          campaignId: reel.campaignId,
          oldStatus: campaign.state,
          newStatus: "live",
          changedBy: actor?._id || actor?.sub || null,
          changedByRole: actor?.role || "system",
          reason: "Scheduled content published",
        }).catch(() => null);
        await commissionService.ensureDeliverableAffiliateLinks(reel.campaignId, deliverable._id, {
          activate: true,
          reelId: reel._id,
          publishedAt: now,
          actor,
        }).catch(() => null);
      summary.autoPublishedContent += 1;
    }

    return summary;
  }
}

module.exports = new CampaignExecutionService();
module.exports.__private__ = { deriveDeliverables, progress, money, requiredPublishedContentCount, allDeliverablesPublished };
