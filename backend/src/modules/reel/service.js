const { AppError } = require("../../utils/AppError");
const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");
const { resolveApiAssetUrl } = { resolveApiAssetUrl: (value) => value };
const influencerService = require("../influencer/service");
const trackingService = require("../tracking/service");
const { InfluencerAffiliateSetting, InfluencerFollower, InfluencerProfile, InfluencerStorefrontEvent } = require("../influencer/model");
const { Campaign } = require("../campaign/model");
const { emitDomainEvent } = require("../events/event-bus");
const { INFLUENCER_EVENTS } = require("../shared/constants");
const { Reel, ContentAnalytics } = require("./model");
const CampaignPaymentRelease = require("../../models/CampaignPaymentRelease");
const CampaignEscrowWallet = require("../../models/CampaignEscrowWallet");
const auditService = require("../../services/audit.service");
const schedulingService = require("../../services/campaign-scheduling.service");
const {
  AffiliateLink,
  CampaignAffiliateClick,
  CommissionRecord,
  CommissionEarning,
  CommissionWalletTransaction,
  InfluencerLedger,
} = require("../commission/models");
const {
  ReelLike,
  ReelComment,
  ReelCommentReply,
  ReelShare,
  ReelSave,
  ReelView,
  ReelWatchHistory,
  ReelProductClick,
  ReelStoreVisit,
  CreatorFollow,
  CreatorFollower,
  CommerceEvent,
  EngagementAnalytics,
  CreatorAnalytics,
  CampaignAnalytics,
  ProductEngagementAnalytics,
} = require("./engagement.model");
const { REEL_UPLOAD_DIR } = require("../../middleware/reelUpload");

const PUBLIC_REEL_PRODUCT_SELECT = "name slug price discountPrice images thumbnail category rating averageRating sellerId stock status isActive variants";
const CONTENT_STATISTICS_CACHE_TTL_MS = 60_000;
const contentStatisticsCache = new Map();
const ADMIN_ROLES = new Set(["admin", "super_admin", "support_admin", "finance_admin"]);
const IMAGE_CONTENT_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const VIDEO_CONTENT_EXTENSIONS = new Set(["mp4", "webm", "mov", "qt"]);

function assetExtension(value = "") {
  const clean = String(value || "").split("?")[0].split("#")[0];
  return clean.includes(".") ? clean.split(".").pop().toLowerCase() : "";
}

function isImageAsset(value = "") {
  return IMAGE_CONTENT_EXTENSIONS.has(assetExtension(value));
}

function isVideoAsset(value = "") {
  return VIDEO_CONTENT_EXTENSIONS.has(assetExtension(value));
}

function normalizePublishedContentType(row = {}) {
  const type = String(row.contentType || "").trim().toUpperCase();
  if (type === "POST") return "POST";
  if (type === "REEL") {
    if (!isVideoAsset(row.videoUrl) && imageUrlsForContent(row).length) return "POST";
    return "REEL";
  }
  if (isImageAsset(row.videoUrl) || isImageAsset(row.thumbnailUrl)) return "POST";
  return "REEL";
}

function imageUrlsForContent(row = {}) {
  const urls = [
    ...(Array.isArray(row.imageUrls) ? row.imageUrls : []),
    ...(Array.isArray(row.mediaUrls) ? row.mediaUrls : []),
    row.thumbnailUrl,
    row.videoUrl,
  ];
  return Array.from(new Set(urls.filter((url) => url && isImageAsset(url)).map((url) => resolveApiAssetUrl(url))));
}

function validateContentMedia(payload = {}) {
  const publicType = normalizePublishedContentType(payload);
  const videoUrl = cleanString(payload.videoUrl);
  const thumbnailUrl = cleanString(payload.thumbnailUrl);
  if (publicType === "POST") {
    if (!imageUrlsForContent({ ...payload, videoUrl, thumbnailUrl }).length) {
      throw new AppError("POST content must contain at least one image.", 400, "POST_IMAGE_REQUIRED", { field: "contentType" });
    }
    if (videoUrl && isVideoAsset(videoUrl)) {
      throw new AppError("POST content must not contain a video.", 400, "POST_VIDEO_NOT_ALLOWED", { field: "videoUrl" });
    }
  }
  if (publicType === "REEL" && (!videoUrl || !isVideoAsset(videoUrl))) {
    throw new AppError("REEL content must contain a video.", 400, "REEL_VIDEO_REQUIRED", { field: "videoUrl" });
  }
  return publicType;
}

function cleanString(value = "") {
  return String(value || "").trim();
}

function normalizeTags(value = []) {
  return Array.from(new Set((Array.isArray(value) ? value : String(value || "").split(","))
    .map((item) => cleanString(item).toLowerCase())
    .filter(Boolean)
    .slice(0, 20)));
}

function buildContentFilter(influencerId, query = {}) {
  const filter = { influencerId };
  if (query.state) filter.state = query.state;
  if (query.contentTypes) {
    filter.contentType = {
      $in: String(query.contentTypes)
        .split(",")
        .map((item) => cleanString(item))
        .filter(Boolean),
    };
  } else if (query.contentType) filter.contentType = query.contentType;
  if (query.visibility) filter.visibility = query.visibility;
  if (query.category) filter.category = cleanString(query.category);
  if (query.campaignId) filter.campaignId = query.campaignId;
  if (query.productId) filter.productIds = query.productId;
  if (query.scheduled === "true") filter.scheduledAt = { $ne: null };
  if (query.search) {
    const re = new RegExp(cleanString(query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: re }, { caption: re }, { description: re }, { tags: re }];
  }
  return filter;
}

function contentSummary(row = {}) {
  const metrics = row.metrics || {};
  const views = Number(metrics.views || 0);
  const clicks = Number(metrics.clicks || 0);
  const orders = Number(metrics.orders || 0);
  const publicContentType = normalizePublishedContentType(row);
  return {
    ...row,
    contentType: publicContentType,
    sourceContentType: row.contentType || "",
    imageUrls: imageUrlsForContent(row),
    mediaType: publicContentType === "POST" ? "image" : "video",
    title: row.title || row.caption || "Untitled content",
    thumbnailUrl: resolveApiAssetUrl(row.thumbnailUrl || imageUrlsForContent(row)[0] || row.videoUrl),
    videoUrl: publicContentType === "REEL" ? resolveApiAssetUrl(row.videoUrl) : "",
    engagementRate: views ? Number((((Number(metrics.likes || 0) + Number(metrics.comments || 0) + Number(metrics.shares || 0)) / views) * 100).toFixed(2)) : 0,
    ctr: views ? Number(((clicks / views) * 100).toFixed(2)) : 0,
    conversionRate: clicks ? Number(((orders / clicks) * 100).toFixed(2)) : 0,
  };
}

function idOf(value) {
  return String(value?._id || value || "");
}

function number(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pct(numerator, denominator) {
  const base = number(denominator);
  return base ? Number(((number(numerator) / base) * 100).toFixed(2)) : 0;
}

function labelPaymentModel(value = "") {
  const key = String(value || "unknown").toLowerCase();
  return {
    fixed: "Fixed",
    commission: "Commission",
    hybrid: "Hybrid",
    free_product: "Free Product Promotion",
  }[key] || "Unknown";
}

function cacheKeyFor(actor = {}, contentId = "") {
  return `${actor.role || "guest"}:${actor.sub || actor._id || ""}:${contentId}`;
}

function readContentStatisticsCache(key) {
  const entry = contentStatisticsCache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    contentStatisticsCache.delete(key);
    return null;
  }
  return entry.data;
}

function writeContentStatisticsCache(key, data) {
  contentStatisticsCache.set(key, { data, expiresAt: Date.now() + CONTENT_STATISTICS_CACHE_TTL_MS });
  if (contentStatisticsCache.size > 250) {
    const [firstKey] = contentStatisticsCache.keys();
    contentStatisticsCache.delete(firstKey);
  }
}

function campaignAllowsInfluencerContent(campaign, influencerId) {
  const profileId = idOf(influencerId);
  if (idOf(campaign.influencerId) === profileId) return true;

  return (campaign.applications || []).some((application) => (
    idOf(application.influencerId) === profileId &&
    ["approved"].includes(String(application.status || "").toLowerCase())
  ));
}

async function activeCampaignAffiliateLinkMap(reels = []) {
  const campaignIds = Array.from(new Set(reels.map((reel) => idOf(reel.campaignId)).filter(Boolean)));
  if (!campaignIds.length) return new Map();
  const now = new Date();
  const openCampaigns = await Campaign.find({
    _id: { $in: campaignIds },
    state: "tracking_active",
    $or: [{ endDate: { $gt: now } }, { deadline: { $gt: now } }, { endDate: null, deadline: null }],
    "commissionWorkflow.trackingActive": true,
  }).select("_id").lean();
  const openCampaignIds = new Set(openCampaigns.map((campaign) => idOf(campaign._id)));
  if (!openCampaignIds.size) return new Map();
  const eligibleCampaignIds = campaignIds.filter((campaignId) => openCampaignIds.has(campaignId));
  let links = await AffiliateLink.find({
    campaignId: { $in: eligibleCampaignIds },
    status: "active",
  }).select("campaignId deliverableId productId trackingCode destinationUrl").lean();
  const linkedCampaigns = new Set(links.map((link) => idOf(link.campaignId)));
  const missingCampaignIds = eligibleCampaignIds.filter((campaignId) => !linkedCampaigns.has(campaignId));
  if (missingCampaignIds.length) {
    const commissionService = require("../commission/service");
    await Promise.all(missingCampaignIds.map((campaignId) =>
      commissionService.ensureCampaignAffiliateLinks(campaignId, { activate: true }).catch(() => [])
    ));
    links = await AffiliateLink.find({
      campaignId: { $in: eligibleCampaignIds },
      status: "active",
    }).select("campaignId deliverableId productId trackingCode destinationUrl").lean();
  }
  return new Map(links.map((link) => [`${idOf(link.campaignId)}:${idOf(link.deliverableId)}:${idOf(link.productId)}`, link]));
}

function attachProductAffiliateLinks(products = [], campaignId = "", deliverableId = "", linkByCampaignProduct = new Map()) {
  return products.map((product) => {
    const link = linkByCampaignProduct.get(`${idOf(campaignId)}:${idOf(deliverableId)}:${idOf(product)}`)
      || linkByCampaignProduct.get(`${idOf(campaignId)}::${idOf(product)}`);
    if (!link) return product;
    return {
      ...product,
      affiliateTrackingCode: link.trackingCode || "",
      trackingCode: link.trackingCode || "",
      affiliateDestinationUrl: link.destinationUrl || "",
      affiliateLinkId: link._id,
    };
  });
}

async function activateAffiliateLinksForPublishedReel(reel, actor = {}) {
  if (!reel?.campaignId) return [];
  const commissionService = require("../commission/service");
  if (reel.deliverableId) {
    return commissionService.ensureDeliverableAffiliateLinks(reel.campaignId, reel.deliverableId, {
      activate: true,
      reelId: reel._id,
      publishedAt: reel.publishedAt,
      actor,
    });
  }
  return commissionService.ensureCampaignAffiliateLinks(reel.campaignId, {
    activate: true,
    reelId: reel._id,
    actor,
  });
}

async function markCampaignDeliverablePublishedForReel(reel, actor = {}) {
  if (!reel?.campaignId) return null;
  const { CampaignDeliverable, CampaignExecutionAudit } = require("../campaign/executionModel");
  const filter = {
    campaignId: reel.campaignId?._id || reel.campaignId,
    influencerId: reel.influencerId?._id || reel.influencerId,
    status: { $in: ["approved", "completed", "published"] },
    ...(reel.deliverableId ? { _id: reel.deliverableId } : {}),
  };
  const deliverable = await CampaignDeliverable.findOneAndUpdate(
    filter,
    {
      $set: {
        status: "published",
        publishedAt: reel.publishedAt || new Date(),
        affiliateEnabled: false,
        trackingEnabled: false,
        affiliateStatus: "pending_content",
        trackingStatus: "inactive",
      },
    },
    { returnDocument: "after", sort: { scheduledPublishAt: 1, approvedAt: 1 } }
  );
  if (!deliverable) throw new AppError("Approved campaign deliverable not found", 409, "DELIVERABLE_NOT_READY");
  if (!reel.deliverableId || String(reel.deliverableId) !== String(deliverable._id)) {
    await Reel.updateOne({ _id: reel._id }, { $set: { deliverableId: deliverable._id } });
    reel.deliverableId = deliverable._id;
  }
  await activateAffiliateLinksForPublishedReel(reel, actor);
  await CampaignExecutionAudit.create({
    userId: actor?._id || actor?.sub || null,
    role: actor?.role || "system",
    action: "deliverable_published",
    campaignId: deliverable.campaignId,
    deliverableId: deliverable._id,
    oldValue: { status: deliverable.status === "published" ? "approved" : deliverable.status },
    newValue: { status: "published", publishedAt: reel.publishedAt || new Date(), reelId: reel._id },
  }).catch(() => null);
  return deliverable;
}

async function assertCampaignPublishAllowed(campaign, influencerId, deliverableId = null) {
  if (!campaign?._id) return;
  const deliverable = await require("../campaign/executionModel").CampaignDeliverable.findOne({
    campaignId: campaign._id,
    influencerId,
    ...(deliverableId ? { _id: deliverableId } : {}),
    status: { $in: ["approved", "completed"] },
  }).sort({ scheduledPublishAt: 1, approvedAt: 1 }).lean();
  if (!deliverable) {
    if (["commission", "hybrid"].includes(campaign.paymentType) && !campaign.commissionWorkflow?.publishEnabled) {
      throw new AppError("Content must be approved before publishing this campaign", 409, "CONTENT_APPROVAL_REQUIRED");
    }
    return;
  }
  schedulingService.assertPublishOpen(campaign, deliverable);
}

const CONTENT_READY_CAMPAIGN_STATES = new Set([
  "accepted",
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
  "partially_completed",
  "completed",
]);

function campaignAcceptsCreatorContent(campaign = {}) {
  if (!CONTENT_READY_CAMPAIGN_STATES.has(String(campaign.state || "").toLowerCase())) return false;
  return campaign.paymentType !== "fixed" || Boolean(campaign.fixedPaymentWorkflow?.contentEnabled);
}

async function deleteLocalReelAsset(url = "") {
  const value = cleanString(url);
  if (!value.startsWith("/uploads/reels/")) return;
  const filename = path.basename(value);
  const filePath = path.resolve(REEL_UPLOAD_DIR, filename);
  const uploadRoot = path.resolve(REEL_UPLOAD_DIR);
  if (!filePath.startsWith(uploadRoot)) return;
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function toObjectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(String(value));
}

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function publicReelFilter(reelId) {
  return {
    _id: reelId,
    visibility: "published",
    state: { $in: ["approved", "published"] },
  };
}

function extractMentions(text = "") {
  return Array.from(new Set(String(text).match(/@[\w.-]{2,50}/g) || [])).slice(0, 20);
}

function attributionWindowDays(value) {
  const next = Number(value || process.env.AFFILIATE_ATTRIBUTION_WINDOW_DAYS || 30);
  return [7, 30, 60, 90].includes(next) ? next : 30;
}

async function incrementAnalytics({ reel, metric, amount = 1, productId = null, value = 0, metadata = {} }) {
  const key = `metrics.${metric}`;
  const update = { $inc: { [key]: Number(amount || 0) } };
  if (value) update.$inc["metrics.revenue"] = Number(value || 0);
  const base = {
    reelId: reel._id,
    influencerId: reel.influencerId,
    campaignId: reel.campaignId || undefined,
    productId: productId || undefined,
    date: dayKey(),
  };
  const writes = [
    EngagementAnalytics.updateOne(base, update, { upsert: true }),
    CreatorAnalytics.updateOne({ influencerId: reel.influencerId, date: base.date }, update, { upsert: true }),
  ];
  if (reel.campaignId) writes.push(CampaignAnalytics.updateOne({ campaignId: reel.campaignId, date: base.date }, update, { upsert: true }));
  if (productId) writes.push(ProductEngagementAnalytics.updateOne({ productId, date: base.date }, update, { upsert: true }));
  if (metadata.eventType) {
    writes.push(CommerceEvent.create({
      eventType: metadata.eventType,
      reelId: reel._id,
      productId: productId || undefined,
      campaignId: reel.campaignId || undefined,
      influencerId: reel.influencerId,
      userId: metadata.userId || null,
      anonymousId: metadata.anonymousId || "",
      source: metadata.source || "reel",
      value,
      metadata,
    }).catch(() => null));
  }
  await Promise.all(writes);
}

async function getPublishedReel(reelId) {
  const reel = await Reel.findOne(publicReelFilter(reelId)).lean();
  if (!reel) throw new AppError("Reel not found", 404, "NOT_FOUND");
  return reel;
}

class ReelService {
  async buildEngagementState(reelIds = [], userId = "") {
    const objectIds = reelIds.map(toObjectId).filter(Boolean);
    if (!objectIds.length) return new Map();
    const match = { reelId: { $in: objectIds } };
    const [likes, comments, shares, saves, views, productClicks, storeVisits, userLikes, userSaves] = await Promise.all([
      ReelLike.aggregate([{ $match: match }, { $group: { _id: "$reelId", count: { $sum: 1 } } }]),
      ReelComment.aggregate([{ $match: { ...match, status: { $ne: "deleted" } } }, { $group: { _id: "$reelId", count: { $sum: 1 } } }]),
      ReelShare.aggregate([{ $match: match }, { $group: { _id: "$reelId", count: { $sum: 1 } } }]),
      ReelSave.aggregate([{ $match: match }, { $group: { _id: "$reelId", count: { $sum: 1 } } }]),
      ReelView.aggregate([{ $match: match }, { $group: { _id: "$reelId", count: { $sum: 1 }, watchTimeSeconds: { $sum: "$watchTimeSeconds" } } }]),
      ReelProductClick.aggregate([{ $match: match }, { $group: { _id: "$reelId", count: { $sum: 1 } } }]),
      ReelStoreVisit.aggregate([{ $match: match }, { $group: { _id: "$reelId", count: { $sum: 1 } } }]),
      userId ? ReelLike.find({ reelId: { $in: objectIds }, userId }).select("reelId").lean() : [],
      userId ? ReelSave.find({ reelId: { $in: objectIds }, userId }).select("reelId").lean() : [],
    ]);
    const state = new Map(objectIds.map((id) => [String(id), {
      counts: { likes: 0, comments: 0, shares: 0, saves: 0, views: 0, productClicks: 0, storeVisits: 0, watchTimeSeconds: 0 },
      viewer: { liked: false, saved: false },
    }]));
    const apply = (rows, key, extraKey = "") => rows.forEach((row) => {
      const item = state.get(String(row._id));
      if (!item) return;
      item.counts[key] = Number(row.count || 0);
      if (extraKey) item.counts[extraKey] = Number(row[extraKey] || 0);
    });
    apply(likes, "likes");
    apply(comments, "comments");
    apply(shares, "shares");
    apply(saves, "saves");
    apply(views, "views", "watchTimeSeconds");
    apply(productClicks, "productClicks");
    apply(storeVisits, "storeVisits");
    userLikes.forEach((row) => {
      const item = state.get(String(row.reelId));
      if (item) item.viewer.liked = true;
    });
    userSaves.forEach((row) => {
      const item = state.get(String(row.reelId));
      if (item) item.viewer.saved = true;
    });
    return state;
  }

  mergeEngagement(row = {}, state = {}) {
    const counts = state.counts || {};
    const metrics = {
      ...(row.metrics || {}),
      likes: counts.likes ?? Number(row.metrics?.likes || 0),
      comments: counts.comments ?? Number(row.metrics?.comments || 0),
      shares: counts.shares ?? Number(row.metrics?.shares || 0),
      bookmarks: counts.saves ?? Number(row.metrics?.bookmarks || 0),
      saves: counts.saves ?? Number(row.metrics?.saves || row.metrics?.bookmarks || 0),
      views: counts.views || Number(row.metrics?.views || 0),
      clicks: counts.productClicks || Number(row.metrics?.clicks || 0),
      storeVisits: counts.storeVisits || 0,
      watchTimeSeconds: counts.watchTimeSeconds || Number(row.metrics?.watchTimeSeconds || 0),
    };
    return { ...row, metrics, engagement: { counts: metrics, viewer: state.viewer || { liked: false, saved: false } } };
  }

  async upload(userId, payload = {}) {
    const profile = await influencerService.getProfile(userId);
    let campaign = null;
    if (payload.campaignId) {
      campaign = await Campaign.findById(payload.campaignId);
      if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
      if (!campaignAllowsInfluencerContent(campaign, profile._id)) {
        throw new AppError("Campaign does not belong to this influencer", 403, "FORBIDDEN");
      }
      if (!campaignAcceptsCreatorContent(campaign)) {
        throw new AppError("Content can only be submitted for active, approved, or scheduled campaigns", 400, "CAMPAIGN_NOT_ACTIVE");
      }
      if (payload.visibility === "published") {
        await assertCampaignPublishAllowed(campaign, profile._id, payload.deliverableId || null);
      }
      if (payload.deliverableId) {
        const deliverable = await require("../campaign/executionModel").CampaignDeliverable.findOne({
          _id: payload.deliverableId,
          campaignId: campaign._id,
          influencerId: profile._id,
        }).select("_id status").lean();
        if (!deliverable) throw new AppError("Campaign deliverable not found", 404, "DELIVERABLE_NOT_FOUND");
      }
      const allowedProducts = new Set((campaign.productIds || []).map(String));
      const requestedProducts = (payload.productIds || []).map(String);
      if (requestedProducts.some((productId) => !allowedProducts.has(productId))) {
        throw new AppError("Reels can only tag products from the assigned campaign", 403, "PRODUCT_NOT_APPROVED_FOR_CAMPAIGN");
      }
    } else if ((payload.productIds || []).length) {
      throw new AppError("Select an active campaign before tagging products", 400, "CAMPAIGN_REQUIRED_FOR_PRODUCT_TAGS");
    }

    const contentType = validateContentMedia(payload);
    const imageUrls = Array.isArray(payload.imageUrls) ? payload.imageUrls : [];
    const mediaUrls = Array.isArray(payload.mediaUrls) ? payload.mediaUrls : [];
    const primaryMediaUrl = payload.videoUrl || imageUrls[0] || mediaUrls[0] || payload.thumbnailUrl;
    const reel = await Reel.create({
      influencerId: profile._id,
      campaignId: campaign?._id || payload.campaignId || undefined,
      deliverableId: payload.deliverableId || undefined,
      productIds: payload.productIds?.length ? payload.productIds : campaign?.productIds || [],
      videoUrl: primaryMediaUrl,
      thumbnailUrl: payload.thumbnailUrl || "",
      imageUrls,
      mediaUrls,
      title: payload.title || payload.caption || "",
      description: payload.description || "",
      contentType,
      category: payload.category || "",
      tags: normalizeTags(payload.tags),
      language: payload.language || "en",
      collectionIds: payload.collectionIds || [],
      brand: payload.brand || "",
      caption: payload.caption || "",
      visibility: payload.visibility || (payload.scheduledAt ? "scheduled" : "draft"),
      scheduledAt: payload.scheduledAt || undefined,
      state: payload.visibility === "published" ? "published" : "pending_review",
      publishedAt: payload.visibility === "published" ? new Date() : undefined,
    });
    if (reel.visibility === "published" && reel.campaignId) {
      await markCampaignDeliverablePublishedForReel(reel, { _id: userId, sub: userId, role: "influencer" });
      await emitDomainEvent(INFLUENCER_EVENTS.REEL_PUBLISHED, {
        reelId: reel._id,
        campaignId: reel.campaignId,
        deliverableId: reel.deliverableId,
        influencerId: reel.influencerId,
      });
    }
    return reel;
  }

  async listContent(userId, query = {}) {
    const profile = await influencerService.getProfile(userId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 12));
    const skip = (page - 1) * limit;
    const filter = buildContentFilter(profile._id, query);
    const [items, total] = await Promise.all([
      Reel.find(filter)
        .populate({ path: "productIds", select: "name images thumbnail category price discountPrice" })
        .populate({ path: "collectionIds", select: "title slug" })
        .populate({ path: "campaignId", select: "state commissionPercent deadline", populate: { path: "vendorId", select: "shopName companyName" } })
        .sort(query.sort === "views" ? { "metrics.views": -1 } : query.sort === "revenue" ? { "metrics.revenue": -1 } : { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Reel.countDocuments(filter),
    ]);
    return { items: items.map(contentSummary), page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
  }

  async updateContent(userId, reelId, payload = {}) {
    const profile = await influencerService.getProfile(userId);
    const existing = await Reel.findOne({ _id: reelId, influencerId: profile._id });
    if (!existing) throw new AppError("Content not found", 404, "NOT_FOUND");
    const existingObject = existing.toObject();
    if (payload.productIds !== undefined || payload.campaignId !== undefined) {
      const campaignId = payload.campaignId || existingObject.campaignId;
      if (!campaignId && (payload.productIds || []).length) {
        throw new AppError("Select an active campaign before tagging products", 400, "CAMPAIGN_REQUIRED_FOR_PRODUCT_TAGS");
      }
      if (campaignId) {
        const campaign = await Campaign.findById(campaignId).lean();
        if (!campaign || !campaignAllowsInfluencerContent(campaign, profile._id) || !campaignAcceptsCreatorContent(campaign)) {
          throw new AppError("Campaign does not allow product tagging", 403, "FORBIDDEN");
        }
        if (payload.action === "publish" || payload.visibility === "published") await assertCampaignPublishAllowed(campaign, profile._id, existingObject.deliverableId || payload.deliverableId || null);
        const allowedProducts = new Set((campaign.productIds || []).map(String));
        const requestedProducts = (payload.productIds || []).map(String);
        if (requestedProducts.some((productId) => !allowedProducts.has(productId))) {
          throw new AppError("Reels can only tag products from the assigned campaign", 403, "PRODUCT_NOT_APPROVED_FOR_CAMPAIGN");
        }
      }
    }
    const update = {
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.caption !== undefined ? { caption: payload.caption } : {}),
      ...(payload.thumbnailUrl !== undefined ? { thumbnailUrl: payload.thumbnailUrl } : {}),
      ...(payload.imageUrls !== undefined ? { imageUrls: Array.isArray(payload.imageUrls) ? payload.imageUrls : [] } : {}),
      ...(payload.mediaUrls !== undefined ? { mediaUrls: Array.isArray(payload.mediaUrls) ? payload.mediaUrls : [] } : {}),
      ...(payload.contentType !== undefined ? { contentType: normalizePublishedContentType({ ...existingObject, ...payload }) } : {}),
      ...(payload.category !== undefined ? { category: payload.category } : {}),
      ...(payload.tags !== undefined ? { tags: normalizeTags(payload.tags) } : {}),
      ...(payload.language !== undefined ? { language: payload.language } : {}),
      ...(payload.productIds !== undefined ? { productIds: payload.productIds } : {}),
      ...(payload.collectionIds !== undefined ? { collectionIds: payload.collectionIds } : {}),
      ...(payload.campaignId !== undefined ? { campaignId: payload.campaignId || undefined } : {}),
      ...(payload.deliverableId !== undefined ? { deliverableId: payload.deliverableId || undefined } : {}),
      ...(payload.visibility !== undefined ? { visibility: payload.visibility } : {}),
      ...(payload.scheduledAt !== undefined ? { scheduledAt: payload.scheduledAt || null } : {}),
      ...(payload.seo !== undefined ? { seo: payload.seo } : {}),
    };
    if (payload.action === "publish") {
      update.contentType = validateContentMedia({ ...existingObject, ...update });
      update.visibility = "published";
      update.state = "published";
      update.publishedAt = new Date();
    }
    if (payload.action === "archive") {
      update.visibility = "archived";
      update.state = "rejected";
    }
    const reel = await Reel.findByIdAndUpdate(existing._id, { $set: update }, { returnDocument: "after", runValidators: true }).lean();
    if (payload.action === "publish" && reel.campaignId) {
      await markCampaignDeliverablePublishedForReel(reel, { _id: userId, sub: userId, role: "influencer" });
      await emitDomainEvent(INFLUENCER_EVENTS.REEL_PUBLISHED, {
        reelId: reel._id,
        campaignId: reel.campaignId,
        deliverableId: reel.deliverableId,
        influencerId: reel.influencerId,
      });
    }
    return contentSummary(reel);
  }

  async deleteContent(userId, reelId) {
    const profile = await influencerService.getProfile(userId);
    const reel = await Reel.findOneAndDelete({ _id: reelId, influencerId: profile._id }).lean();
    if (!reel) throw new AppError("Content not found", 404, "NOT_FOUND");

    await Promise.all([
      deleteLocalReelAsset(reel.videoUrl),
      deleteLocalReelAsset(reel.thumbnailUrl),
    ]);

    if (reel.campaignId) {
      await Campaign.updateOne(
        { _id: reel.campaignId, "deliverables.contentId": reel._id },
        {
          $set: {
            "deliverables.$.status": "draft",
            "deliverables.$.contentId": null,
            "deliverables.$.notes": "Content deleted by influencer",
          },
        }
      );
    }

    return { id: reel._id, deleted: true };
  }

  async listMediaLibrary(userId, query = {}) {
    const profile = await influencerService.getProfile(userId);
    const filter = buildContentFilter(profile._id, query);
    const items = await Reel.find(filter)
      .select("title caption videoUrl thumbnailUrl contentType visibility state campaignId productIds createdAt publishedAt processing metrics")
      .populate({ path: "campaignId", select: "title paymentType state vendorId", populate: { path: "vendorId", select: "shopName companyName brandName" } })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return {
      items: items.map((item) => ({
        id: item._id,
        name: item.title || item.caption || "Video asset",
        type: item.contentType || "video",
        contentType: item.contentType || "video",
        publishStatus: item.visibility || item.state || "draft",
        campaignId: item.campaignId?._id || item.campaignId || "",
        campaignName: item.campaignId?.title || "",
        campaignStatus: item.campaignId?.state || "",
        campaignBadge: item.campaignId?.title || "",
        paymentModel: item.campaignId?.paymentType || "",
        vendor: item.campaignId?.vendorId?.shopName || item.campaignId?.vendorId?.companyName || item.campaignId?.vendorId?.brandName || "",
        preview: item.thumbnailUrl || item.videoUrl,
        url: item.videoUrl,
        size: 0,
        createdAt: item.createdAt,
        publishedAt: item.publishedAt,
        processing: item.processing,
      })),
    };
  }

  async assertContentStatisticsAccess(actor = {}, contentId = "") {
    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      throw new AppError("Invalid content id", 400, "INVALID_CONTENT_ID");
    }

    const reel = await Reel.findById(contentId)
      .populate({
        path: "campaignId",
        select: "title campaignType category state paymentType fixedFee commissionPercent commissionConfig pricing fixedPaymentWorkflow commissionWorkflow attributionWindowDays deliverables productIds vendorId influencerId marketplace createdAt updatedAt",
        populate: [
          { path: "vendorId", select: "shopName companyName brandName displayName storeName" },
          { path: "productIds", select: "name title category price discountPrice images thumbnail sellerId" },
        ],
      })
      .populate({ path: "productIds", select: "name title category price discountPrice images thumbnail sellerId" })
      .populate({ path: "influencerId", select: "displayName storeName storeSlug followers stats userId" })
      .lean();

    if (!reel) throw new AppError("Content not found", 404, "NOT_FOUND");

    if (ADMIN_ROLES.has(actor.role)) return reel;

    if (actor.role === "influencer") {
      const profile = await influencerService.getProfile(actor.sub);
      if (idOf(reel.influencerId) !== idOf(profile._id)) {
        throw new AppError("You can only view your own content statistics", 403, "FORBIDDEN");
      }
      return reel;
    }

    if (actor.role === "vendor") {
      const vendor = await require("../../repositories/vendor.repository").findByUserId(actor.sub);
      if (!vendor || idOf(reel.campaignId?.vendorId) !== idOf(vendor._id)) {
        throw new AppError("You can only view statistics for your campaign content", 403, "FORBIDDEN");
      }
      return reel;
    }
    if (payload.action !== "reject" && reel.campaignId) {
      await assertCampaignPublishAllowed(reel.campaignId, reel.influencerId);
    }

    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  async getContentStatistics(actor = {}, contentId = "", options = {}) {
    const cacheKey = cacheKeyFor(actor, contentId);
    if (options.refresh !== "true") {
      const cached = readContentStatisticsCache(cacheKey);
      if (cached) return { ...cached, cached: true };
    }

    const reel = await this.assertContentStatisticsAccess(actor, contentId);
    const campaign = reel.campaignId || null;
    const campaignId = campaign?._id || reel.campaignId || null;
    const influencerId = reel.influencerId?._id || reel.influencerId;
    const vendorId = campaign?.vendorId?._id || campaign?.vendorId || null;
    const paymentModel = String(campaign?.paymentType || "unknown").toLowerCase();
    const productIds = [...(reel.productIds || []), ...(campaign?.productIds || [])].filter(Boolean);

    const [
      persisted,
      engagementSeries,
      productClicks,
      storeVisits,
      affiliateLinks,
      affiliateClicks,
      commissionRecords,
      commissionEarnings,
      commissionWalletCredits,
      campaignLedgerCredits,
      paymentReleases,
      escrowWallet,
    ] = await Promise.all([
      ContentAnalytics.findOne({ contentId: reel._id }).lean(),
      EngagementAnalytics.find({ reelId: reel._id }).sort({ date: 1 }).lean(),
      ReelProductClick.countDocuments({ reelId: reel._id }),
      ReelStoreVisit.countDocuments({ reelId: reel._id }),
      campaignId ? AffiliateLink.find({ campaignId, influencerId, ...(reel.deliverableId ? { deliverableId: reel.deliverableId } : {}) }).select("deliverableId trackingCode destinationUrl createdAt activatedAt expiresAt attributionWindowDays productId status trackingStatus").lean() : [],
      campaignId ? CampaignAffiliateClick.find({ campaignId, influencerId, ...(reel.deliverableId ? { deliverableId: reel.deliverableId } : {}) }).sort({ clickedAt: -1 }).limit(25).lean() : [],
      CommissionRecord.find({
        $or: [{ reelId: reel._id }, ...(reel.deliverableId ? [{ deliverableId: reel.deliverableId }] : campaignId ? [{ campaignId, influencerId }] : [])],
      }).populate("orderId", "orderNumber totalAmount status paymentStatus items createdAt").sort({ createdAt: -1 }).limit(100).lean(),
      campaignId ? CommissionEarning.find({ campaignId, influencerId, ...(reel.deliverableId ? { deliverableId: reel.deliverableId } : {}) }).sort({ createdAt: -1 }).limit(100).lean() : [],
      campaignId ? CommissionWalletTransaction.find({ campaignId, influencerId, type: "CREDIT" }).lean() : [],
      campaignId ? InfluencerLedger.find({ influencerId, source: "CAMPAIGN", "meta.campaignId": String(campaignId) }).lean() : [],
      campaignId ? CampaignPaymentRelease.find({ campaignId, influencerId, status: { $ne: "cancelled" } }).lean() : [],
      campaignId && vendorId ? CampaignEscrowWallet.findOne({ campaignId, vendorId }).lean() : null,
    ]);

    const metrics = reel.metrics || {};
    const views = number(persisted?.views || metrics.views);
    const clicks = number(persisted?.affiliateClicks || metrics.clicks || productClicks);
    const orders = number(persisted?.orders || commissionRecords.length || commissionEarnings.length);
    const grossRevenue = number(persisted?.revenue || commissionRecords.reduce((sum, row) => sum + number(row.gross), 0) || commissionEarnings.reduce((sum, row) => sum + number(row.grossRevenue), 0) || metrics.revenue);
    const commissionGenerated = number(persisted?.commission || commissionRecords.reduce((sum, row) => sum + number(row.influencerShare), 0) || commissionEarnings.reduce((sum, row) => sum + number(row.commissionAmount), 0) || metrics.commission);
    const paidCommission = number(commissionEarnings.filter((row) => ["CREDITED", "APPROVED"].includes(row.status)).reduce((sum, row) => sum + number(row.commissionAmount), 0));
    const pendingCommission = Math.max(0, commissionGenerated - paidCommission);
    const releasedAmount = number(paymentReleases.filter((row) => ["released", "settled"].includes(row.status)).reduce((sum, row) => sum + number(row.netAmount), 0) || escrowWallet?.amountReleased);
    const walletCredit = number(persisted?.walletCredit || commissionWalletCredits.reduce((sum, row) => sum + number(row.amount), 0) + campaignLedgerCredits.reduce((sum, row) => sum + number(row.amount), 0));
    const fixedReward = number(persisted?.fixedReward || campaign?.fixedFee || campaign?.pricing?.fixedCost);
    const productValue = number(campaign?.pricing?.productCost || campaign?.paymentModelSnapshot?.productValue || campaign?.termsFrozen?.pricing?.productCost);
    const approvedDeliverables = (campaign?.deliverables || []).filter((row) => row.status === "approved").length;
    const rejectedDeliverables = (campaign?.deliverables || []).filter((row) => row.status === "rejected").length;
    const latestRelease = paymentReleases.find((row) => row.releasedAt || row.approvedAt) || null;
    const followersAfter = number(persisted?.followersAfter || reel.influencerId?.followers || reel.influencerId?.stats?.followers);
    const followersBefore = number(persisted?.followersBefore);
    const followersGrowth = number(persisted?.followersGrowth || Math.max(0, followersAfter - followersBefore));
    const averageWatchTime = views ? number(metrics.watchTimeSeconds) / views : 0;

    const orderTable = commissionRecords.slice(0, 50).map((row) => ({
      orderId: row.orderId?.orderNumber || idOf(row.orderId) || idOf(row.orderId),
      customer: "Customer",
      product: row.orderId?.items?.[0]?.name || "Tagged product",
      orderAmount: number(row.gross || row.orderId?.totalAmount),
      commissionPercent: number(row.commissionPercent),
      commissionEarned: number(row.influencerShare),
      orderStatus: row.orderId?.status || row.state || "",
    }));

    const productPerformance = productIds.map((product) => {
      const productId = idOf(product);
      const relatedClicks = affiliateClicks.filter((click) => idOf(click.productId) === productId).length;
      const relatedRecords = commissionRecords.filter((row) => idOf(row.metadata?.productId || row.productId) === productId);
      const productRevenue = relatedRecords.reduce((sum, row) => sum + number(row.gross), 0);
      return {
        productId,
        name: product.name || product.title || "Product",
        unitsSold: relatedRecords.length,
        revenue: productRevenue,
        clicks: relatedClicks,
        conversion: pct(relatedRecords.length, relatedClicks),
      };
    });

    const chartSeries = engagementSeries.map((row) => ({
      date: row.date,
      views: number(row.metrics?.views),
      clicks: number(row.metrics?.productClicks || row.metrics?.clicks),
      orders: 0,
      revenue: number(row.metrics?.revenue),
      commission: number(row.metrics?.commission),
      conversion: 0,
      followers: 0,
    }));

    const timeline = [
      ["Campaign Created", campaign?.createdAt],
      ["Accepted", campaign?.fixedPaymentWorkflow?.acceptedAt || campaign?.contractSnapshot?.lockedAt],
      ["Escrow Funded", escrowWallet?.fundedAt],
      ["Content Uploaded", reel.createdAt],
      ["Vendor Approved", campaign?.commissionWorkflow?.contentApprovedAt || latestRelease?.approvedAt],
      ["Admin Approved", reel.moderation?.reviewedAt],
      ["Published", reel.publishedAt],
      ["First Click", affiliateClicks.at(-1)?.clickedAt],
      ["First Order", commissionRecords.at(-1)?.createdAt],
      ["First Commission", commissionEarnings.at(-1)?.createdAt || commissionRecords.at(-1)?.createdAt],
      ["Last Order", commissionRecords[0]?.createdAt],
      ["Campaign Completed", campaign?.commissionWorkflow?.closedAt || escrowWallet?.completedAt],
    ].map(([label, at]) => ({ label, at: at || null, complete: Boolean(at) }));

    const data = {
      contentId: idOf(reel._id),
      generatedAt: new Date().toISOString(),
      cached: false,
      access: { role: actor.role },
      content: {
        thumbnailUrl: reel.thumbnailUrl || reel.videoUrl,
        videoUrl: reel.videoUrl,
        title: reel.title || reel.caption || "Untitled content",
        contentType: reel.contentType || "video",
        contentId: idOf(reel._id),
        campaignName: campaign?.title || "",
        campaignId: idOf(campaignId),
        vendor: campaign?.vendorId?.shopName || campaign?.vendorId?.companyName || "",
        brand: campaign?.vendorId?.brandName || campaign?.vendorId?.shopName || "",
        product: productIds[0]?.name || productIds[0]?.title || "",
        category: reel.category || campaign?.category || productIds[0]?.category || "",
        publishedDate: reel.publishedAt || null,
        approvedDate: campaign?.commissionWorkflow?.contentApprovedAt || reel.moderation?.reviewedAt || null,
        createdDate: reel.createdAt || null,
        campaignStatus: campaign?.state || "",
        publishStatus: reel.visibility || reel.state || "",
      },
      payment: {
        model: paymentModel,
        label: labelPaymentModel(paymentModel),
        badgeColor: { fixed: "green", commission: "blue", hybrid: "purple", free_product: "orange" }[paymentModel] || "slate",
      },
      fixedPayment: {
        campaignBudget: number(campaign?.pricing?.totalBudget || campaign?.fixedFee || escrowWallet?.budgetAmount),
        deliverables: (campaign?.deliverables || []).length,
        approvedDeliverables,
        rejectedDeliverables,
        escrowAmount: number(escrowWallet?.amountFunded || escrowWallet?.totalEscrowAmount),
        releasedAmount,
        pendingRelease: Math.max(0, number(escrowWallet?.amountFunded || fixedReward) - releasedAmount),
        releaseDate: latestRelease?.releasedAt || null,
        walletCredited: walletCredit > 0,
        invoice: latestRelease ? idOf(latestRelease._id) : "",
        transactionId: latestRelease?.walletTransactionId ? idOf(latestRelease.walletTransactionId) : "",
        adminApproval: Boolean(reel.moderation?.reviewedAt),
        vendorApproval: Boolean(latestRelease?.approvedAt || campaign?.commissionWorkflow?.contentApprovedAt),
        influencerWalletCredit: walletCredit,
      },
      commission: {
        commissionPercent: number(campaign?.commissionConfig?.commissionPercentage || campaign?.commissionPercent || commissionRecords[0]?.commissionPercent),
        attributedOrders: orders,
        grossRevenue,
        netRevenue: Math.max(0, grossRevenue - number(campaign?.pricing?.taxes) - number(campaign?.pricing?.shippingCost)),
        commissionGenerated,
        pendingCommission,
        paidCommission,
        cancelledOrders: commissionRecords.filter((row) => ["CANCELLED", "REVERSED"].includes(String(row.state).toUpperCase())).length,
        returnedOrders: commissionRecords.filter((row) => String(row.orderId?.status || "").toLowerCase().includes("return")).length,
        refundedOrders: commissionRecords.filter((row) => String(row.orderId?.paymentStatus || "").toLowerCase().includes("refund")).length,
        averageOrderValue: orders ? grossRevenue / orders : 0,
        highestOrder: Math.max(0, ...commissionRecords.map((row) => number(row.gross || row.orderId?.totalAmount))),
        lowestOrder: commissionRecords.length ? Math.min(...commissionRecords.map((row) => number(row.gross || row.orderId?.totalAmount)).filter((value) => value >= 0)) : 0,
        orders: orderTable,
      },
      hybrid: {
        fixedEarnings: fixedReward,
        commissionEarnings: commissionGenerated,
        totalEarnings: fixedReward + commissionGenerated,
        escrowReleased: releasedAmount,
        commissionPending: pendingCommission,
        commissionPaid: paidCommission,
        fixedPaid: releasedAmount,
        hybridTotal: releasedAmount + commissionGenerated,
      },
      freeProduct: {
        productValue,
        sampleDelivered: Boolean(campaign?.fixedPaymentWorkflow?.fundedAt || campaign?.commissionWorkflow?.contentEnabled),
        deliveryDate: campaign?.fixedPaymentWorkflow?.fundedAt || null,
        contentSubmitted: Boolean(reel.createdAt),
        contentApproved: Boolean(campaign?.commissionWorkflow?.contentApprovedAt || reel.moderation?.reviewedAt),
        publishingStatus: reel.visibility || reel.state || "",
        noMonetaryEarnings: true,
        campaignCompleted: ["completed", "closed"].includes(String(campaign?.state || "").toLowerCase()),
      },
      performance: {
        views,
        reach: number(persisted?.reach || metrics.uniqueViews),
        impressions: number(persisted?.impressions || Math.max(views, number(metrics.uniqueViews))),
        likes: number(persisted?.likes || metrics.likes),
        comments: number(persisted?.comments || metrics.comments),
        shares: number(persisted?.shares || metrics.shares),
        bookmarks: number(metrics.bookmarks || metrics.saves),
        watchTime: number(metrics.watchTimeSeconds),
        averageWatchTime,
        completionRate: pct(metrics.averageViewDuration || averageWatchTime, reel.durationSeconds || averageWatchTime || 1),
        ctr: pct(clicks, views),
        clicks,
        uniqueVisitors: number(metrics.uniqueViews),
        affiliateLinkClicks: affiliateClicks.length || clicks,
        storeVisits,
        profileVisits: number(metrics.profileVisits),
      },
      conversion: {
        orders,
        revenue: grossRevenue,
        conversion: pct(orders, clicks),
        returningCustomers: 0,
        newCustomers: orders,
        cartAdds: 0,
        wishlistAdds: 0,
        checkoutStarted: 0,
        checkoutCompleted: orders,
      },
      followers: {
        beforePublish: followersBefore,
        afterPublish: followersAfter,
        gained: followersGrowth,
        lost: 0,
        netGrowth: followersGrowth,
        growthPercent: pct(followersGrowth, followersBefore || followersAfter || 1),
        graph: chartSeries.map((row, index) => ({ date: row.date, value: index === chartSeries.length - 1 ? followersAfter : followersBefore })),
      },
      revenueBreakdown: {
        grossRevenue,
        shipping: number(campaign?.pricing?.shippingCost),
        platformFee: number(campaign?.pricing?.platformFees || commissionRecords.reduce((sum, row) => sum + number(row.platformFee), 0)),
        commission: commissionGenerated,
        vendorNet: number(commissionRecords.reduce((sum, row) => sum + number(row.vendorNet), 0)),
        influencerEarnings: fixedReward + commissionGenerated,
        adminRevenue: number(campaign?.pricing?.platformFees),
        taxes: number(campaign?.pricing?.taxes),
        refunds: 0,
        netRevenue: Math.max(0, grossRevenue - number(campaign?.pricing?.taxes)),
      },
      productPerformance: {
        productsTagged: productPerformance.length,
        topSellingProduct: productPerformance.sort((a, b) => b.unitsSold - a.unitsSold)[0] || null,
        unitsSold: productPerformance.reduce((sum, row) => sum + row.unitsSold, 0),
        products: productPerformance,
      },
      attribution: {
        affiliateLinkGenerated: affiliateLinks.length > 0,
        affiliateLink: affiliateLinks[0]?.destinationUrl || "",
        linkCreatedDate: affiliateLinks[0]?.createdAt || null,
        attributionWindow: number(campaign?.attributionWindowDays || campaign?.commissionConfig?.attributionWindowDays || 30),
        attributedOrders: orders,
        expiredAttribution: affiliateLinks.filter((row) => row.expiresAt && new Date(row.expiresAt) < new Date()).length,
        lastClick: affiliateClicks[0]?.clickedAt || null,
        lastPurchase: commissionRecords[0]?.createdAt || null,
      },
      campaignStatus: {
        campaignStarted: Boolean(campaign?.createdAt),
        contentSubmitted: Boolean(reel.createdAt),
        vendorApproved: Boolean(latestRelease?.approvedAt || campaign?.commissionWorkflow?.contentApprovedAt),
        adminApproved: Boolean(reel.moderation?.reviewedAt),
        published: reel.visibility === "published",
        running: ["active", "tracking_active", "published"].includes(String(campaign?.state || "").toLowerCase()),
        completed: ["completed"].includes(String(campaign?.state || "").toLowerCase()),
        closed: Boolean(campaign?.commissionWorkflow?.closedAt),
      },
      timeline,
      documents: {
        invoices: paymentReleases.map((row) => ({ id: idOf(row._id), label: `Release ${idOf(row._id).slice(-6)}`, date: row.createdAt })),
        escrowReceipt: escrowWallet ? idOf(escrowWallet._id) : "",
        commissionStatement: commissionEarnings.length ? `COMM-${idOf(campaignId).slice(-8)}` : "",
        walletLedger: [...commissionWalletCredits, ...campaignLedgerCredits].slice(0, 25).map((row) => ({ id: idOf(row._id), amount: row.amount, date: row.createdAt })),
        paymentHistory: paymentReleases.map((row) => ({ id: idOf(row._id), status: row.status, amount: row.netAmount, date: row.releasedAt || row.createdAt })),
        campaignAgreement: campaign?.contractSnapshot?.termsHash || "",
      },
      filters: {
        date: "all",
        campaign: campaign?.title || "",
        vendor: campaign?.vendorId?.shopName || campaign?.vendorId?.companyName || "",
        paymentModel,
        status: reel.visibility || reel.state || "",
        product: productIds[0]?.name || productIds[0]?.title || "",
      },
      charts: {
        revenueTrend: chartSeries.map((row) => ({ date: row.date, value: row.revenue })),
        followerGrowth: chartSeries.map((row, index) => ({ date: row.date, value: index === chartSeries.length - 1 ? followersAfter : followersBefore })),
        orders: chartSeries.map((row) => ({ date: row.date, value: row.orders })),
        clicks: chartSeries.map((row) => ({ date: row.date, value: row.clicks })),
        conversion: chartSeries.map((row) => ({ date: row.date, value: row.conversion })),
        commission: chartSeries.map((row) => ({ date: row.date, value: row.commission })),
        views: chartSeries.map((row) => ({ date: row.date, value: row.views })),
      },
      export: {
        pdf: `/api/influencer/content/${idOf(reel._id)}/statistics?format=pdf`,
        excel: `/api/influencer/content/${idOf(reel._id)}/statistics?format=xlsx`,
        report: `/api/influencer/content/${idOf(reel._id)}/statistics`,
      },
      rawSnapshot: persisted?.snapshot || {},
    };

    await ContentAnalytics.findOneAndUpdate(
      { contentId: reel._id },
      {
        $set: {
          contentId: reel._id,
          campaignId: campaignId || undefined,
          vendorId: vendorId || undefined,
          influencerId,
          paymentModel: ["fixed", "commission", "hybrid", "free_product"].includes(paymentModel) ? paymentModel : "unknown",
          views,
          reach: data.performance.reach,
          impressions: data.performance.impressions,
          likes: data.performance.likes,
          comments: data.performance.comments,
          shares: data.performance.shares,
          orders,
          revenue: grossRevenue,
          commission: commissionGenerated,
          fixedReward,
          hybridReward: data.hybrid.hybridTotal,
          followersBefore,
          followersAfter,
          followersGrowth,
          affiliateClicks: data.performance.affiliateLinkClicks,
          conversion: data.conversion.conversion,
          walletCredit,
          escrowReleased: releasedAmount,
          snapshot: {
            title: data.content.title,
            payment: data.payment,
            generatedAt: data.generatedAt,
          },
          lastUpdated: new Date(),
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );

    await auditService.log({
      actor,
      action: "content.statistics.view",
      entityType: "ContentAnalytics",
      entityId: reel._id,
      metadata: { campaignId: idOf(campaignId), paymentModel, cached: false },
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    }).catch(() => null);

    writeContentStatisticsCache(cacheKey, data);
    return data;
  }

  async publish(actor, reelId, payload = {}) {
    const reel = await Reel.findById(reelId).populate("campaignId");
    if (!reel) throw new AppError("Reel not found", 404, "NOT_FOUND");

    if (actor.role === "influencer") {
      throw new AppError("Influencers cannot self-publish reels", 403, "FORBIDDEN");
    }

    if (actor.role === "vendor") {
      const vendor = await require("../../repositories/vendor.repository").findByUserId(actor.sub);
      if (!vendor || String(reel.campaignId?.vendorId) !== String(vendor._id)) {
        throw new AppError("Forbidden", 403, "FORBIDDEN");
      }
    }

    const action = payload.action || "publish";
    const nextState =
      action === "reject"
        ? "rejected"
        : action === "approve"
          ? "approved"
          : "published";

    const updated = await Reel.findByIdAndUpdate(
      reelId,
      {
        $set: {
          state: nextState,
          visibility: nextState === "published" ? "published" : reel.visibility,
          publishedAt: nextState === "published" ? new Date() : reel.publishedAt,
          "moderation.reviewerId": actor.sub,
          "moderation.reviewedAt": new Date(),
          "moderation.notes": payload.notes || "",
        },
      },
      { returnDocument: "after" }
    );

    if (nextState === "published") {
      await markCampaignDeliverablePublishedForReel(updated, actor);
      await emitDomainEvent(INFLUENCER_EVENTS.REEL_PUBLISHED, {
        reelId: updated._id,
        campaignId: updated.campaignId,
        deliverableId: updated.deliverableId,
        influencerId: updated.influencerId,
      });
    }

    return updated;
  }

  async getFeed({ category, tab = "for_you", search = "", page = 1, limit = 12 } = {}, userId = "") {
    const query = { visibility: "published", state: { $in: ["approved", "published"] } };
    if (tab === "live") query.contentType = "live";
    if (tab === "product") query.contentType = { $in: ["product_video", "affiliate", "review", "tutorial", "unboxing"] };
    if (tab === "campaign") query.campaignId = { $ne: null };
    if (search) {
      const re = new RegExp(cleanString(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ title: re }, { caption: re }, { description: re }, { tags: re }, { category: re }];
    }
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(Number(limit || 12), 50);
    const reels = await Reel.find(query)
      .populate({ path: "productIds", select: PUBLIC_REEL_PRODUCT_SELECT })
      .populate({
        path: "campaignId",
        populate: [
          { path: "productIds", select: PUBLIC_REEL_PRODUCT_SELECT },
          { path: "vendorId", select: "shopName companyName logoUrl" },
        ],
      })
      .populate({
        path: "influencerId",
        select: "displayName storeSlug storeName profilePicture profileImage avatarUrl categories followers verified stats",
        populate: { path: "userId", select: "name" },
      })
      .sort(tab === "trending" ? { "metrics.views": -1, "metrics.clicks": -1, publishedAt: -1 } : { publishedAt: -1 })
      .skip((pageNumber - 1) * pageLimit)
      .limit(pageLimit)
      .lean();

    const filtered = category
      ? reels.filter((reel) =>
          (reel.campaignId?.productIds || []).some((product) => String(product?.category || "").toLowerCase() === String(category).toLowerCase())
        )
      : reels;

    const influencerIds = Array.from(new Set(filtered.map((reel) => idOf(reel.influencerId)).filter(Boolean)));
    const affiliateRows = influencerIds.length
      ? await InfluencerAffiliateSetting.find({ influencerId: { $in: influencerIds }, status: "active" }).select("influencerId trackingCode").lean()
      : [];
    const affiliateCodeByInfluencer = new Map(affiliateRows.map((row) => [idOf(row.influencerId), row.trackingCode]));
    const followedRows = userId && influencerIds.length
      ? await InfluencerFollower.find({ influencerId: { $in: influencerIds }, customerId: userId }).select("influencerId").lean()
      : [];
    const followedInfluencers = new Set(followedRows.map((row) => idOf(row.influencerId)));
    const engagementByReel = await this.buildEngagementState(filtered.map((reel) => reel._id), userId);
    const linkByCampaignProduct = await activeCampaignAffiliateLinkMap(filtered);

    return {
      items: filtered.map((reel) => {
        const tagged = [...(reel.productIds || []), ...(reel.campaignId?.productIds || [])];
        const seen = new Set();
        const products = attachProductAffiliateLinks(tagged.filter((product) => {
          const id = idOf(product);
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        }), reel.campaignId, reel.deliverableId, linkByCampaignProduct);
        const publicContentType = normalizePublishedContentType(reel);
        const postImages = imageUrlsForContent(reel);
        return this.mergeEngagement({
          ...reel,
          contentType: publicContentType,
          sourceContentType: reel.contentType || "",
          mediaType: publicContentType === "POST" ? "image" : "video",
          imageUrls: postImages,
          influencerId: reel.influencerId ? {
            ...reel.influencerId,
            isFollowing: followedInfluencers.has(idOf(reel.influencerId)),
          } : reel.influencerId,
          products,
          affiliateTrackingCode: affiliateCodeByInfluencer.get(idOf(reel.influencerId)) || "",
          campaignBadge: reel.campaignId ? reel.campaignId.title || "Campaign" : "",
          brandName: reel.campaignId?.vendorId?.shopName || reel.campaignId?.vendorId?.companyName || "",
          sponsored: Boolean(reel.campaignId),
          videoUrl: publicContentType === "REEL" ? resolveApiAssetUrl(reel.videoUrl) : "",
          thumbnailUrl: resolveApiAssetUrl(reel.thumbnailUrl || postImages[0] || reel.videoUrl),
        }, engagementByReel.get(idOf(reel)));
      }),
      page: pageNumber,
      limit: pageLimit,
      hasMore: reels.length === pageLimit,
    };
  }

  async getById(reelId, userId = "") {
    const reel = await Reel.findById(reelId)
      .populate({ path: "productIds", select: PUBLIC_REEL_PRODUCT_SELECT })
      .populate({
        path: "campaignId",
        populate: { path: "productIds", select: PUBLIC_REEL_PRODUCT_SELECT },
      })
      .populate({
        path: "influencerId",
        select: "displayName storeSlug storeName profilePicture profileImage avatarUrl categories followers verified stats",
        populate: { path: "userId", select: "name" },
      });
    if (!reel) throw new AppError("Reel not found", 404, "NOT_FOUND");
    if (reel.visibility !== "published" || !["approved", "published"].includes(reel.state)) {
      throw new AppError("Reel not found", 404, "NOT_FOUND");
    }
    const influencerId = reel.influencerId?._id || reel.influencerId;
    const [affiliate, followRow] = await Promise.all([
      InfluencerAffiliateSetting.findOne({ influencerId, status: "active" }).select("trackingCode").lean(),
      userId ? InfluencerFollower.exists({ influencerId, customerId: userId }) : null,
    ]);
    const row = reel.toObject ? reel.toObject() : reel;
    const engagementByReel = await this.buildEngagementState([row._id], userId);
    const tagged = [...(row.productIds || []), ...(row.campaignId?.productIds || [])];
    const seen = new Set();
    const linkByCampaignProduct = await activeCampaignAffiliateLinkMap([row]);
    const products = attachProductAffiliateLinks(tagged.filter((product) => {
      const id = idOf(product);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    }), row.campaignId, row.deliverableId, linkByCampaignProduct);
    return this.mergeEngagement({
      ...row,
      influencerId: row.influencerId ? {
        ...row.influencerId,
        isFollowing: Boolean(followRow),
      } : row.influencerId,
      products,
      affiliateTrackingCode: affiliate?.trackingCode || "",
    }, engagementByReel.get(idOf(row)));
  }

  async getEngagement(reelId, userId = "") {
    await getPublishedReel(reelId);
    const state = await this.buildEngagementState([reelId], userId);
    return state.get(String(reelId)) || { counts: {}, viewer: { liked: false, saved: false } };
  }

  async toggleLike(userId, reelId) {
    const reel = await getPublishedReel(reelId);
    const existing = await ReelLike.findOne({ reelId, userId }).lean();
    const delta = existing ? -1 : 1;
    if (existing) await ReelLike.deleteOne({ _id: existing._id });
    else await ReelLike.create({ reelId, userId, influencerId: reel.influencerId });
    await Promise.all([
      Reel.updateOne({ _id: reelId }, { $inc: { "metrics.likes": delta } }),
      incrementAnalytics({ reel, metric: "likes", amount: delta, metadata: { eventType: "reel_like", userId } }),
      emitDomainEvent("reel.liked", { reelId, influencerId: reel.influencerId, userId, active: !existing }).catch(() => null),
    ]);
    return { liked: !existing, ...(await this.getEngagement(reelId, userId)) };
  }

  async toggleSave(userId, reelId, payload = {}) {
    const reel = await getPublishedReel(reelId);
    const existing = await ReelSave.findOne({ reelId, userId }).lean();
    const delta = existing ? -1 : 1;
    if (existing) await ReelSave.deleteOne({ _id: existing._id });
    else await ReelSave.create({ reelId, userId, influencerId: reel.influencerId, collectionName: cleanString(payload.collectionName) || "Saved reels" });
    await Promise.all([
      Reel.updateOne({ _id: reelId }, { $inc: { "metrics.bookmarks": delta } }),
      incrementAnalytics({ reel, metric: "saves", amount: delta, metadata: { eventType: "reel_save", userId } }),
    ]);
    return { saved: !existing, ...(await this.getEngagement(reelId, userId)) };
  }

  async listComments(reelId, query = {}, userId = "") {
    await getPublishedReel(reelId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const [items, total] = await Promise.all([
      ReelComment.find({ reelId, status: { $ne: "deleted" } })
        .populate("userId", "name avatar email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ReelComment.countDocuments({ reelId, status: { $ne: "deleted" } }),
    ]);
    const commentIds = items.map((item) => item._id);
    const replies = commentIds.length ? await ReelCommentReply.find({ commentId: { $in: commentIds }, status: { $ne: "deleted" } })
      .populate("userId", "name avatar email")
      .sort({ createdAt: 1 })
      .limit(commentIds.length * 3)
      .lean() : [];
    const repliesByComment = replies.reduce((acc, reply) => {
      const key = idOf(reply.commentId);
      acc.set(key, [...(acc.get(key) || []), { ...reply, liked: (reply.likedBy || []).some((id) => idOf(id) === String(userId)) }]);
      return acc;
    }, new Map());
    return {
      items: items.map((comment) => ({
        ...comment,
        liked: (comment.likedBy || []).some((id) => idOf(id) === String(userId)),
        replies: repliesByComment.get(idOf(comment)) || [],
      })),
      page,
      limit,
      total,
      hasMore: page * limit < total,
    };
  }

  async createComment(userId, reelId, payload = {}) {
    const reel = await getPublishedReel(reelId);
    const text = cleanString(payload.text);
    if (!text) throw new AppError("Comment text is required", 400, "VALIDATION_ERROR");
    const comment = await ReelComment.create({ reelId, userId, influencerId: reel.influencerId, text, mentions: extractMentions(text) });
    await Promise.all([
      Reel.updateOne({ _id: reelId }, { $inc: { "metrics.comments": 1 } }),
      incrementAnalytics({ reel, metric: "comments", metadata: { eventType: "reel_comment", userId, mentions: comment.mentions } }),
      emitDomainEvent("reel.commented", { reelId, influencerId: reel.influencerId, userId, commentId: comment._id }).catch(() => null),
    ]);
    return { comment: await ReelComment.findById(comment._id).populate("userId", "name avatar email").lean(), engagement: await this.getEngagement(reelId, userId) };
  }

  async createReply(userId, reelId, commentId, payload = {}) {
    const reel = await getPublishedReel(reelId);
    const parent = await ReelComment.findOne({ _id: commentId, reelId, status: { $ne: "deleted" } }).lean();
    if (!parent) throw new AppError("Comment not found", 404, "NOT_FOUND");
    const text = cleanString(payload.text);
    if (!text) throw new AppError("Reply text is required", 400, "VALIDATION_ERROR");
    const reply = await ReelCommentReply.create({ reelId, commentId, parentReplyId: payload.parentReplyId || undefined, userId, influencerId: reel.influencerId, text, mentions: extractMentions(text) });
    await Promise.all([
      ReelComment.updateOne({ _id: commentId }, { $inc: { repliesCount: 1 } }),
      incrementAnalytics({ reel, metric: "replies", metadata: { eventType: "reel_comment_reply", userId, mentions: reply.mentions } }),
      emitDomainEvent("reel.comment.replied", { reelId, influencerId: reel.influencerId, userId, commentId, replyId: reply._id }).catch(() => null),
    ]);
    return { reply: await ReelCommentReply.findById(reply._id).populate("userId", "name avatar email").lean() };
  }

  async toggleCommentLike(userId, reelId, commentId) {
    await getPublishedReel(reelId);
    const comment = await ReelComment.findOne({ _id: commentId, reelId, status: { $ne: "deleted" } });
    if (!comment) throw new AppError("Comment not found", 404, "NOT_FOUND");
    const liked = (comment.likedBy || []).some((id) => idOf(id) === String(userId));
    if (liked) comment.likedBy.pull(userId);
    else comment.likedBy.addToSet(userId);
    comment.likesCount = Math.max(0, Number(comment.likesCount || 0) + (liked ? -1 : 1));
    await comment.save();
    return { liked: !liked, likesCount: comment.likesCount };
  }

  async reportComment(userId, reelId, commentId, payload = {}) {
    await getPublishedReel(reelId);
    const comment = await ReelComment.findOne({ _id: commentId, reelId, status: { $ne: "deleted" } });
    if (!comment) throw new AppError("Comment not found", 404, "NOT_FOUND");
    if (!(comment.reportedBy || []).some((id) => idOf(id) === String(userId))) {
      comment.reportedBy.addToSet(userId);
      comment.reportsCount = Number(comment.reportsCount || 0) + 1;
    }
    if (comment.reportsCount >= 3) comment.status = "reported";
    await comment.save();
    await emitDomainEvent("reel.comment.reported", { reelId, commentId, userId, reason: payload.reason || "" }).catch(() => null);
    return { reported: true, reportsCount: comment.reportsCount };
  }

  uncountedSecurityResponse(security) {
    return security && security.counted === false
      ? { tracked: true, counted: false, reason: security.reason, fraudScore: security.fraudScore, fraudLevel: security.fraudLevel }
      : null;
  }

  async shareReel(user, reelId, payload = {}, security = null) {
    const uncounted = this.uncountedSecurityResponse(security);
    if (uncounted) return { shared: false, destination: cleanString(payload.destination || "copy_link").toLowerCase(), ...uncounted };
    const reel = await getPublishedReel(reelId);
    const destination = cleanString(payload.destination || "copy_link").toLowerCase();
    const userId = user?.sub || null;
    const anonymousId = cleanString(payload.anonymousId);
    await Promise.all([
      ReelShare.create({ reelId, userId, anonymousId, influencerId: reel.influencerId, source: cleanString(payload.source) || "reel", destination, metadata: payload.metadata || {} }),
      Reel.updateOne({ _id: reelId }, { $inc: { "metrics.shares": 1 } }),
      incrementAnalytics({ reel, metric: "shares", metadata: { eventType: "reel_share", userId, anonymousId, destination, source: payload.source || "reel" } }),
    ]);
    return { shared: true, counted: true, destination, ...(await this.getEngagement(reelId, userId || "")) };
  }

  async recordView(user, reelId, payload = {}, security = null) {
    const uncounted = this.uncountedSecurityResponse(security);
    if (uncounted) return uncounted;
    const reel = await getPublishedReel(reelId);
    const userId = user?.sub || null;
    const anonymousId = cleanString(payload.anonymousId);
    const watchTimeSeconds = Math.max(0, Number(payload.watchTimeSeconds || 0));
    await Promise.all([
      ReelView.create({ reelId, userId, anonymousId, influencerId: reel.influencerId, source: payload.source || "feed", watchTimeSeconds, completed: Boolean(payload.completed), metadata: payload.metadata || {} }),
      ReelWatchHistory.updateOne(
        userId ? { reelId, userId } : { reelId, anonymousId },
        { $set: { influencerId: reel.influencerId, lastWatchedAt: new Date(), progressPercent: Math.max(0, Math.min(100, Number(payload.progressPercent || 0))), metadata: payload.metadata || {} }, $inc: { watchTimeSeconds } },
        { upsert: true }
      ),
      Reel.updateOne({ _id: reelId }, { $inc: { "metrics.views": 1, "metrics.watchTimeSeconds": watchTimeSeconds } }),
      InfluencerProfile.updateOne({ _id: reel.influencerId }, { $inc: { "stats.views": 1 } }),
      incrementAnalytics({ reel, metric: "views", metadata: { eventType: "reel_view", userId, anonymousId, source: payload.source || "feed" } }),
      watchTimeSeconds ? incrementAnalytics({ reel, metric: "watchTimeSeconds", amount: watchTimeSeconds, metadata: {} }) : Promise.resolve(),
    ]);
    return { tracked: true, counted: true };
  }

  async recordStoreVisit(user, reelId, payload = {}, security = null) {
    const uncounted = this.uncountedSecurityResponse(security);
    if (uncounted) return uncounted;
    const reel = await getPublishedReel(reelId);
    const userId = user?.sub || null;
    const anonymousId = cleanString(payload.anonymousId);
    await Promise.all([
      ReelStoreVisit.create({ reelId, influencerId: reel.influencerId, userId, anonymousId, source: payload.source || "reel_creator_panel", metadata: payload.metadata || {} }),
      InfluencerStorefrontEvent.create({ influencerId: reel.influencerId, userId, anonymousId, eventType: "storefront_view", surface: "reel", reelId, metadata: payload.metadata || {} }).catch(() => null),
      incrementAnalytics({ reel, metric: "storeVisits", metadata: { eventType: "reel_store_visit", userId, anonymousId, source: payload.source || "reel_creator_panel" } }),
    ]);
    return { tracked: true, counted: true };
  }

  async recordProductClick(user, reelId, payload = {}, security = null) {
    const reel = await getPublishedReel(reelId);
    const productId = payload.productId;
    if (!productId) throw new AppError("productId is required", 400, "VALIDATION_ERROR");
    const windowDays = attributionWindowDays(payload.attributionWindowDays);
    const tracking = await trackingService.click({
      user,
      reelId,
      productId,
      anonymousId: payload.anonymousId || "",
      surface: payload.source || "reel",
      security,
    });
    if (!tracking.session) return tracking;
    const counted = tracking.counted !== false;
    await Promise.all([
      ReelProductClick.create({
        reelId,
        productId,
        campaignId: reel.campaignId || undefined,
        influencerId: reel.influencerId,
        userId: user?.sub || null,
        anonymousId: tracking.anonymousId || payload.anonymousId || "",
        source: payload.source || "reel_product_card",
        trackingTokenId: tracking.session?.trackingTokenId || "",
        attributionWindowDays: windowDays,
        metadata: payload.metadata || {},
      }),
      counted ? incrementAnalytics({ reel, metric: "productClicks", productId, metadata: { eventType: "reel_product_click", userId: user?.sub || null, anonymousId: tracking.anonymousId || payload.anonymousId || "", source: payload.source || "reel_product_card" } }) : Promise.resolve(),
    ]);
    return { ...tracking, counted, attributionWindowDays: windowDays };
  }

  async followCreator(userId, reelId, payload = {}) {
    const reel = await getPublishedReel(reelId);
    const influencerId = reel.influencerId;
    const existing = await CreatorFollower.findOne({ influencerId, customerId: userId }).lean();
    const shouldFollow = payload.following !== undefined ? Boolean(payload.following) : !existing;
    if (shouldFollow && !existing) {
      await Promise.all([
        CreatorFollower.create({ influencerId, customerId: userId, source: payload.source || "reel" }),
        CreatorFollow.updateOne({ influencerId, customerId: userId }, { $set: { source: payload.source || "reel", status: "active", followedAt: new Date() }, $unset: { unfollowedAt: "" } }, { upsert: true }),
        InfluencerFollower.updateOne({ influencerId, customerId: userId }, { $set: { source: payload.source || "reel", notificationEnabled: true, followedAt: new Date() } }, { upsert: true }),
        InfluencerProfile.updateOne({ _id: influencerId }, { $inc: { followers: 1 } }),
        incrementAnalytics({ reel, metric: "follows", metadata: { eventType: "creator_follow", userId, source: payload.source || "reel" } }),
        emitDomainEvent("creator.followed", { influencerId, userId, reelId }).catch(() => null),
      ]);
    }
    if (!shouldFollow && existing) {
      await Promise.all([
        CreatorFollower.deleteOne({ influencerId, customerId: userId }),
        CreatorFollow.updateOne({ influencerId, customerId: userId }, { $set: { status: "unfollowed", unfollowedAt: new Date() } }),
        InfluencerFollower.deleteOne({ influencerId, customerId: userId }),
        InfluencerProfile.updateOne({ _id: influencerId }, { $inc: { followers: -1 } }),
        emitDomainEvent("creator.unfollowed", { influencerId, userId, reelId }).catch(() => null),
      ]);
    }
    const profile = await InfluencerProfile.findById(influencerId).select("followers").lean();
    return { following: shouldFollow, followers: Math.max(0, Number(profile?.followers || 0)) };
  }

  async getAdjacent(reelId) {
    const current = await Reel.findOne({
      _id: reelId,
      visibility: "published",
      state: { $in: ["approved", "published"] },
    }).select("_id publishedAt createdAt").lean();
    if (!current) throw new AppError("Reel not found", 404, "NOT_FOUND");

    const orderField = current.publishedAt ? "publishedAt" : "createdAt";
    const anchor = current[orderField] || current.createdAt;
    const publicFilter = {
      visibility: "published",
      state: { $in: ["approved", "published"] },
    };
    const previous = await Reel.findOne({
      ...publicFilter,
      _id: { $ne: current._id },
      [orderField]: { $gt: anchor },
    }).select("_id").sort({ [orderField]: 1 }).lean();
    const next = await Reel.findOne({
      ...publicFilter,
      _id: { $ne: current._id },
      [orderField]: { $lt: anchor },
    }).select("_id").sort({ [orderField]: -1 }).lean();

    return {
      previous: previous ? { _id: previous._id } : null,
      next: next ? { _id: next._id } : null,
    };
  }

  async listAll() {
    return await Reel.find({})
      .populate("campaignId", "state")
      .populate({ path: "influencerId", populate: { path: "userId", select: "name email" } })
      .sort({ createdAt: -1 });
  }
}

module.exports = new ReelService();
