const mongoose = require("mongoose");
const crypto = require("crypto");
const vendorRepo = require("../../repositories/vendor.repository");
const productRepo = require("../../repositories/product.repository");
const campaignService = require("../campaign/service");
const reelService = require("../reel/service");
const auditService = require("../../services/audit.service");
const notificationService = require("../../services/notification.service");
const paymentService = require("../../services/payment.service");
const influencerCommerceEngine = require("../../services/influencer-commerce-engine.service");
const influencerRateCardService = require("../../services/influencer-rate-card.service");
const campaignRefundService = require("../../services/campaign-refund.service");
const campaignSchedulingService = require("../../services/campaign-scheduling.service");
const analyticsAggregator = require("../analytics/service");
const { AppError } = require("../../utils/AppError");
const { Campaign, CampaignStatusHistory, CampaignInvitation, CampaignAcceptance } = require("../campaign/model");
const { CampaignAffiliateClick, CampaignAffiliateAttribution, AffiliateLink, CommissionRecord } = require("../commission/models");
const { InfluencerProfile, InfluencerSocialAccount, InfluencerProductAssignment } = require("../influencer/model");
const { Reel } = require("../reel/model");
const { TrackingSession } = require("../tracking/model");
const { Product } = require("../../models/Product");
const { Order } = require("../../models/Order");
const CampaignEscrowWallet = require("../../models/CampaignEscrowWallet");
const { emitDomainEvent } = require("../events/event-bus");
const { VendorInfluencerRelationship, InfluencerService } = require("./model");
const { CAMPAIGN_STATES } = require("../shared/constants");
const {
  VendorSubscriptionPlan,
  VendorSubscription,
  SubscriptionPayment,
  SubscriptionRevenue,
  VendorSubscriptionChange,
  SubscriptionCreditWallet,
} = require("../../models/InfluencerCommerceConfig");

const SYNC_EVENTS = {
  CAMPAIGN_INVITED: "CAMPAIGN_INVITED",
  CAMPAIGN_APPLICATION_APPROVED: "CAMPAIGN_APPLICATION_APPROVED",
  CAMPAIGN_APPLICATION_REJECTED: "CAMPAIGN_APPLICATION_REJECTED",
  CONTENT_APPROVED: "CONTENT_APPROVED",
  CONTENT_REJECTED: "CONTENT_REJECTED",
  CONTENT_CHANGES_REQUESTED: "CONTENT_CHANGES_REQUESTED",
  RELATIONSHIP_UPDATED: "RELATIONSHIP_UPDATED",
};

async function upsertProductAssignments({ campaign, influencerId, status = "approved", source = "campaign_application", actorId = null }) {
  const now = new Date();
  await Promise.all((campaign.productIds || []).map((productId) => InfluencerProductAssignment.findOneAndUpdate(
    { influencerId, productId, campaignId: campaign._id },
    {
      $set: {
        influencerId,
        vendorId: campaign.vendorId,
        productId,
        campaignId: campaign._id,
        status,
        source,
        approvedAt: status === "approved" ? now : undefined,
        "metadata.lastActorId": actorId || undefined,
      },
      $setOnInsert: { assignedAt: now },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  )));
}

function objectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pageOptions(query = {}, fallbackLimit = 20) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || fallbackLimit));
  return { page, limit, skip: (page - 1) * limit };
}

function startOfDay(date) {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

const SUBSCRIPTION_ACTIVE_CAMPAIGN_STATES = [
  "draft",
  "proposed",
  "invitation_sent",
  "accepted",
  "active",
  "product_shipped",
  "content_in_progress",
  "content_submitted",
  "under_review",
  "revision_requested",
  "partially_completed",
  "published",
  "tracking_active",
];

function parseRange(query = {}) {
  const now = new Date();
  let end = query.endDate ? new Date(query.endDate) : now;
  if (Number.isNaN(end.getTime())) end = now;
  let start = query.startDate ? new Date(query.startDate) : addDays(now, -29);
  if (Number.isNaN(start.getTime())) start = addDays(now, -29);
  // Set end to end of day (23:59:59.999) for inclusive range queries
  const endOfDayDate = new Date(end);
  endOfDayDate.setUTCHours(23, 59, 59, 999);
  return { start: startOfDay(start), end: endOfDayDate };
}

function buildBuckets(start, end) {
  const buckets = [];
  const cursor = startOfDay(start);
  const last = startOfDay(end);
  while (cursor <= last) {
    buckets.push({
      date: cursor.toISOString().slice(0, 10),
      revenue: 0,
      commission: 0,
      conversions: 0,
      clicks: 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return buckets;
}

function campaignEndReached(deadline, now = new Date()) {
  if (!deadline) return false;
  const end = new Date(deadline);
  return !Number.isNaN(end.getTime()) && end.getTime() <= now.getTime();
}

async function deactivateExpiredTrackingCampaigns(vendorId, actorId = null) {
  if (!vendorId) return [];
  const now = new Date();
  const expiredCampaigns = await Campaign.find({
    vendorId,
    state: "tracking_active",
    deadline: { $ne: null, $lte: now },
  }).select("_id state").lean();
  if (!expiredCampaigns.length) return [];

  const campaignIds = expiredCampaigns.map((campaign) => campaign._id);
  await Campaign.updateMany(
    { _id: { $in: campaignIds }, vendorId, state: "tracking_active" },
    {
      $set: {
        state: "expired",
        "commissionWorkflow.trackingActive": false,
        "commissionWorkflow.closedAt": now,
        "commissionWorkflow.closedReason": "Campaign end date reached; tracking deactivated",
      },
      $push: {
        history: {
          state: "expired",
          actorId: actorId || null,
          note: "Campaign end date reached; tracking deactivated",
          changedAt: now,
        },
      },
    }
  );
  await CampaignStatusHistory.insertMany(
    expiredCampaigns.map((campaign) => ({
      campaignId: campaign._id,
      oldStatus: campaign.state || "tracking_active",
      newStatus: "expired",
      changedBy: actorId || undefined,
      changedByRole: "system",
      reason: "Campaign end date reached; tracking deactivated",
      metadata: { source: "vendor_campaign_list_expiry_guard" },
    })),
    { ordered: false }
  ).catch(() => {});
  await CampaignEscrowWallet.updateMany(
    { campaignId: { $in: campaignIds }, vendorId },
    { $set: { campaignStatus: "expired" } }
  ).catch(() => {});
  await AffiliateLink.updateMany(
    { campaignId: { $in: campaignIds }, status: { $in: ["pending_content", "active", "paused"] } },
    { $set: { status: "expired", expiresAt: now } }
  ).catch(() => {});
  await CampaignAffiliateAttribution.updateMany(
    { campaignId: { $in: campaignIds }, status: "pending" },
    { $set: { status: "expired", expiresAt: now, "metadata.closedReason": "Campaign end date reached; tracking deactivated" } }
  ).catch(() => {});
  await TrackingSession.updateMany(
    { campaignId: { $in: campaignIds }, expiresAt: { $gt: now } },
    { $set: { expiresAt: now } }
  ).catch(() => {});
  return campaignIds;
}

function money(value) {
  const number = Number(value || 0);
  return Number(number.toFixed(2));
}

const PAYMENT_MODEL_TYPES = ["fixed", "commission", "hybrid", "free_product"];

function paymentModelFilterValue(query = {}) {
  const value = String(query.paymentModel || query.paymentType || "").toLowerCase();
  return PAYMENT_MODEL_TYPES.includes(value) ? value : "";
}

function applyPaymentModelFilter(filter, query = {}) {
  const paymentModel = paymentModelFilterValue(query);
  if (paymentModel) filter.paymentType = paymentModel;
  return filter;
}

function normalizeObjectIds(values = []) {
  return values.map((value) => objectId(value)).filter(Boolean);
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function subscriptionAmount(plan = {}, billingCycle = "monthly") {
  if (billingCycle === "yearly") return money(plan.yearlyPrice ?? plan.monthlyPrice ?? 0);
  if (billingCycle === "quarterly") return money(plan.quarterlyPrice ?? Number(plan.monthlyPrice || 0) * 3);
  if (billingCycle === "half_yearly") return money(plan.halfYearlyPrice ?? Number(plan.monthlyPrice || 0) * 6);
  if (billingCycle === "custom") return money(plan.metadata?.customPrice ?? plan.monthlyPrice ?? 0);
  return money(plan.monthlyPrice || 0);
}

function subscriptionDurationDays(plan = {}, billingCycle = "monthly") {
  const metadata = plan.metadata || {};
  const configured = {
    monthly: plan.monthlyDurationDays ?? metadata.monthlyDurationDays ?? plan.durationDays,
    quarterly: plan.quarterlyDurationDays ?? metadata.quarterlyDurationDays,
    half_yearly: plan.halfYearlyDurationDays ?? metadata.halfYearlyDurationDays,
    yearly: plan.yearlyDurationDays ?? metadata.yearlyDurationDays,
    custom: plan.customDurationDays ?? metadata.customDurationDays ?? plan.durationDays,
  }[billingCycle];
  return Math.max(1, Number(configured || plan.durationDays || 30));
}

function subscriptionEndDate(startDate, plan = {}, billingCycle = "monthly") {
  const endDate = addDays(startDate, subscriptionDurationDays(plan, billingCycle));
  endDate.setMilliseconds(endDate.getMilliseconds() - 1);
  return endDate;
}

function subscriptionTotalDays(subscription = {}, plan = {}) {
  if (subscription.startDate && subscription.endDate) {
    const ms = new Date(subscription.endDate).getTime() - new Date(subscription.startDate).getTime();
    const days = Math.ceil(ms / 86400000);
    if (days > 0) return days;
  }
  return subscriptionDurationDays(plan, subscription.billingCycle || "monthly");
}

function subscriptionRemainingDays(subscription = {}) {
  if (!subscription?.endDate) return 0;
  return Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / 86400000));
}

function changeTypeFor(currentPlan = {}, targetPlan = {}, currentCycle = "monthly", targetCycle = "monthly") {
  const currentRank = Number(currentPlan.displayOrder ?? currentPlan.priority ?? currentPlan.monthlyPrice ?? 0);
  const targetRank = Number(targetPlan.displayOrder ?? targetPlan.priority ?? targetPlan.monthlyPrice ?? 0);
  if (String(currentPlan._id || "") === String(targetPlan._id || "") && currentCycle !== targetCycle) return "cycle_change";
  if (targetRank > currentRank || subscriptionAmount(targetPlan, targetCycle) > subscriptionAmount(currentPlan, currentCycle)) return "upgrade";
  if (targetRank < currentRank || subscriptionAmount(targetPlan, targetCycle) < subscriptionAmount(currentPlan, currentCycle)) return "downgrade";
  return "cycle_change";
}

function planEntitlements(plan = {}) {
  const allowedTiers = plan.linkedTierId ? [plan.linkedTierId] : (plan.allowedTiers || []);
  return {
    campaignLimit: Number(plan.campaignLimit ?? 1),
    visibilityLimit: Number(plan.influencerVisibilityLimit ?? 20),
    allowedTiers,
    allowAllTiers: Boolean(plan.allowAllTiers),
    features: {
      prioritySupport: Boolean(plan.prioritySupport),
      featuredCampaigns: Boolean(plan.featuredCampaigns),
      advancedAnalytics: Boolean(plan.advancedAnalytics),
      dedicatedManager: Boolean(plan.dedicatedManager),
      campaignBoost: Boolean(plan.metadata?.campaignBoost),
    },
  };
}

async function campaignIdsForFilter(filter) {
  const campaigns = await Campaign.find(filter).select("_id").lean();
  return campaigns.map((campaign) => campaign._id);
}

function productImage(product = {}) {
  return product.thumbnail || product.images?.find((image) => image?.isPrimary)?.url || product.images?.[0]?.url || "";
}

function profileName(profile = {}) {
  return profile.displayName || profile.userId?.name || profile.userId?.email || "Creator";
}

function profileUsername(profile = {}) {
  return profile.userId?.username || profile.userId?.email || profile.influencerCode || String(profile._id || "").slice(-8);
}

function normalizeStatus(status = "") {
  const value = String(status || "").toLowerCase();
  if (["viewed", "saved", "invited", "applied", "approved", "active", "paused", "blacklisted"].includes(value)) return value;
  return "saved";
}

async function notifyInfluencer(influencerId, payload) {
  const profile = await InfluencerProfile.findById(influencerId).select("userId").lean();
  if (!profile?.userId) return null;
  return notificationService.createNotification({
    userId: profile.userId,
    role: "INFLUENCER",
    module: "GROWTH",
    subModule: "INFLUENCER_COMMERCE",
    type: "INFLUENCER_COMMERCE",
    ...payload,
  }).catch(() => null);
}

async function notifyVendor(vendorId, payload) {
  return notificationService.notifyVendorUser(vendorId, {
    module: "GROWTH",
    subModule: "INFLUENCER_COMMERCE",
    type: "INFLUENCER_COMMERCE",
    ...payload,
  }).catch(() => null);
}

class InfluencerCommerceVendorService {
  async getVendor(userId) {
    const vendor = await vendorRepo.findByUserId(userId);
    if (!vendor) throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
    return vendor;
  }

  async upsertRelationship(vendorId, influencerId, payload = {}) {
    if (!influencerId) return null;
    const influencerObjectId = objectId(influencerId);
    if (!influencerObjectId) throw new AppError("Influencer not found", 404, "NOT_FOUND");
    const current = await VendorInfluencerRelationship.findOne({ vendorId, influencerId: influencerObjectId }).lean();
    const nextStatus = payload.status ? normalizeStatus(payload.status) : current?.status || "saved";
    const update = {
      $set: {
        status: nextStatus,
        source: payload.source || current?.source || "manual",
        lastActivityAt: new Date(),
        ...(payload.saved !== undefined ? { saved: Boolean(payload.saved) } : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
        ...(payload.blacklistReason !== undefined ? { blacklistReason: payload.blacklistReason } : {}),
        ...(nextStatus === "paused" ? { pausedAt: new Date() } : {}),
        ...(nextStatus === "blacklisted" ? { blacklistedAt: new Date() } : {}),
      },
      ...(payload.campaignId ? { $addToSet: { activeCampaignIds: payload.campaignId } } : {}),
    };
    return VendorInfluencerRelationship.findOneAndUpdate(
      { vendorId, influencerId: influencerObjectId },
      update,
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
  }

  async aggregateVendorCommissions(vendorId, query = {}) {
    const { start, end } = parseRange(query);
    const match = { vendorId: objectId(vendorId), createdAt: { $gte: start, $lte: end } };
    let scopedCampaignIds = Array.isArray(query.campaignIds) ? normalizeObjectIds(query.campaignIds) : null;
    if (!scopedCampaignIds && (paymentModelFilterValue(query) || objectId(query.campaignId) || objectId(query.productId) || query.category || query.status || query.state || query.search)) {
      const campaignFilter = { vendorId: objectId(vendorId) };
      applyPaymentModelFilter(campaignFilter, query);
      if (objectId(query.campaignId)) campaignFilter._id = objectId(query.campaignId);
      if (objectId(query.productId)) campaignFilter.productIds = objectId(query.productId);
      if (query.category) campaignFilter.category = query.category;
      if (query.status || query.state) campaignFilter.state = query.state || query.status;
      if (query.search) {
        const re = new RegExp(escapeRegex(query.search), "i");
        campaignFilter.$or = [{ title: re }, { description: re }, { category: re }];
      }
      scopedCampaignIds = await campaignIdsForFilter(campaignFilter);
    }
    if (scopedCampaignIds) match.campaignId = { $in: scopedCampaignIds };
    if (!scopedCampaignIds && objectId(query.campaignId)) match.campaignId = objectId(query.campaignId);
    if (objectId(query.influencerId)) match.influencerId = objectId(query.influencerId);
    if (objectId(query.productId)) match["metadata.productId"] = objectId(query.productId);

    const [summary, byInfluencer, byCampaign, trendRows] = await Promise.all([
      CommissionRecord.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$gross" },
            commission: { $sum: "$influencerShare" },
            pending: { $sum: { $cond: [{ $eq: ["$state", "HOLD"] }, "$influencerShare", 0] } },
            paid: { $sum: { $cond: [{ $eq: ["$state", "SETTLED"] }, "$influencerShare", 0] } },
            orders: { $sum: 1 },
          },
        },
      ]),
      CommissionRecord.aggregate([
        { $match: match },
        { $group: { _id: "$influencerId", revenue: { $sum: "$gross" }, commission: { $sum: "$influencerShare" }, orders: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
        { $limit: 50 },
      ]),
      CommissionRecord.aggregate([
        { $match: match },
        { $group: { _id: "$campaignId", revenue: { $sum: "$gross" }, commission: { $sum: "$influencerShare" }, orders: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
        { $limit: 50 },
      ]),
      CommissionRecord.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$gross" },
            commission: { $sum: "$influencerShare" },
            conversions: { $sum: 1 },
          },
        },
      ]),
    ]);

    const bucketMap = new Map(buildBuckets(start, end).map((bucket) => [bucket.date, bucket]));
    trendRows.forEach((row) => {
      const bucket = bucketMap.get(row._id);
      if (bucket) {
        bucket.revenue = money(row.revenue);
        bucket.commission = money(row.commission);
        bucket.conversions = Number(row.conversions || 0);
      }
    });

    return {
      summary: summary[0] || { revenue: 0, commission: 0, pending: 0, paid: 0, orders: 0 },
      byInfluencer,
      byCampaign,
      trend: [...bucketMap.values()],
      range: { start, end },
    };
  }

  async dashboard(userId, query = {}) {
    const vendor = await this.getVendor(userId);
    const campaignFilter = { vendorId: vendor._id };
    applyPaymentModelFilter(campaignFilter, query);
    if (objectId(query.campaignId)) campaignFilter._id = objectId(query.campaignId);
    if (objectId(query.productId)) campaignFilter.productIds = objectId(query.productId);
    if (query.category) campaignFilter.category = query.category;
    if (query.status) campaignFilter.state = query.status;
    if (query.search) {
      const re = new RegExp(escapeRegex(query.search), "i");
      campaignFilter.$or = [{ title: re }, { description: re }, { category: re }];
    }
    const campaignIds = await campaignIdsForFilter(campaignFilter);
    const paymentModel = paymentModelFilterValue(query);
    const { summary: commissionSummary, byInfluencer, trend } = await this.aggregateVendorCommissions(vendor._id, { ...query, campaignIds });
    const commissionProductMatch = {
      vendorId: vendor._id,
      createdAt: { $gte: parseRange(query).start, $lte: parseRange(query).end },
      campaignId: { $in: campaignIds },
    };
    if (objectId(query.productId)) commissionProductMatch["metadata.productId"] = objectId(query.productId);
    if (objectId(query.influencerId)) commissionProductMatch.influencerId = objectId(query.influencerId);

    const orderMatch = {
      sellerId: vendor._id,
      "attribution.campaignId": { $in: campaignIds },
      createdAt: { $gte: parseRange(query).start, $lte: parseRange(query).end },
    };
    if (objectId(query.productId)) orderMatch["attribution.productId"] = objectId(query.productId);
    if (objectId(query.influencerId)) orderMatch["attribution.influencerId"] = objectId(query.influencerId);
    const trackingMatch = {
      campaignId: { $in: campaignIds },
      createdAt: { $gte: parseRange(query).start, $lte: parseRange(query).end },
    };
    if (objectId(query.productId)) trackingMatch.productId = objectId(query.productId);
    if (objectId(query.influencerId)) trackingMatch.influencerId = objectId(query.influencerId);

    const [campaigns, relationshipsTotal, activeInfluencers, pendingApplications, pendingContent, campaignSpend, affiliateClicksAgg, topProducts, attributedOrders] = await Promise.all([
      Campaign.find(campaignFilter).select("title campaignType state fixedFee applications productIds analytics").lean(),
      VendorInfluencerRelationship.countDocuments({ vendorId: vendor._id }),
      VendorInfluencerRelationship.countDocuments({ vendorId: vendor._id, status: { $in: ["approved", "active"] } }),
      Campaign.aggregate([
        { $match: campaignFilter },
        { $unwind: "$applications" },
        { $match: { "applications.status": { $in: ["submitted", "pending_review", "shortlisted"] } } },
        { $count: "total" },
      ]),
      Reel.countDocuments({ campaignId: { $in: campaignIds }, state: { $in: ["uploaded", "pending_review"] } }),
      Campaign.aggregate([{ $match: campaignFilter }, { $group: { _id: null, total: { $sum: "$fixedFee" } } }]),
      CampaignAffiliateClick.countDocuments(trackingMatch),
      CommissionRecord.aggregate([
        { $match: commissionProductMatch },
        { $group: { _id: "$metadata.productId", revenue: { $sum: "$gross" }, commission: { $sum: "$influencerShare" }, orders: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
      Order.aggregate([
        { $match: orderMatch },
        { $group: { _id: null, revenue: { $sum: "$totalAmount" }, commission: { $sum: { $ifNull: ["$attribution.commission.influencerShare", 0] } }, orders: { $sum: 1 } } },
      ]),
    ]);

    const influencerIds = byInfluencer.map((row) => row._id).filter(Boolean);
    const influencers = influencerIds.length
      ? await InfluencerProfile.find({ _id: { $in: influencerIds } }).populate("userId", "name email username").lean()
      : [];
    const influencerMap = new Map(influencers.map((profile) => [String(profile._id), profile]));
    const products = topProducts.length
      ? await Product.find({ _id: { $in: topProducts.map((row) => row._id).filter(Boolean) } }).select("name images thumbnail category").lean()
      : [];
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    const orderSummary = attributedOrders[0] || { revenue: 0, orders: 0 };
    const summary = { ...commissionSummary };
    if (Number(orderSummary.orders || 0) > Number(summary.orders || 0)) summary.orders = orderSummary.orders;
    if (Number(orderSummary.revenue || 0) > Number(summary.revenue || 0)) summary.revenue = orderSummary.revenue;
    if (Number(orderSummary.commission || 0) > Number(summary.commission || 0)) {
      summary.commission = orderSummary.commission;
      summary.pending = Math.max(Number(summary.pending || 0), Number(orderSummary.commission || 0));
    }
    const revenue = money(summary.revenue);
    const spend = money((campaignSpend[0]?.total || 0) + (summary.commission || 0));
    const roi = spend ? money(((revenue - spend) / spend) * 100) : 0;
    const clicks = Number(affiliateClicksAgg || 0);
    const ordersGenerated = Number(summary.orders || 0);
    const unified = await analyticsAggregator.getVendorAnalytics(userId, query).catch(() => null);
    const unifiedMetrics = unified?.metrics || {};
    const unifiedClicks = (unified?.campaigns || []).reduce((total, row) => total + Number(row.clicks || 0), 0);
    const unifiedOrders = Number(unifiedMetrics.orders || 0) || (unified?.campaigns || []).reduce((total, row) => total + Number(row.orders || 0), 0);
    const dashboardRevenue = money(unifiedMetrics.campaignRevenue || revenue);
    const dashboardSpend = money(unifiedMetrics.totalCampaignSpend || spend);
    const dashboardClicks = Number(unifiedClicks || clicks);
    const dashboardOrders = Number(unifiedOrders || ordersGenerated);

    return {
      widgets: {
        totalInfluencers: relationshipsTotal,
        activeInfluencers,
        campaignRevenue: dashboardRevenue,
        campaignSpend: dashboardSpend,
        commissionPaid: money(unifiedMetrics.commissionPaid || summary.paid),
        pendingCommissions: money((unified?.campaigns || []).reduce((total, row) => total + Number(row.pendingCommission || 0), 0) || summary.pending),
        campaignConversions: dashboardOrders,
        clicks: dashboardClicks,
        ordersGenerated: dashboardOrders,
        conversionRate: dashboardClicks ? money((dashboardOrders / dashboardClicks) * 100) : 0,
        roi: dashboardSpend ? money(((dashboardRevenue - dashboardSpend) / dashboardSpend) * 100) : roi,
        pendingContentApprovals: pendingContent,
        pendingApplications: pendingApplications[0]?.total || 0,
      },
      unified,
      charts: {
        campaignRevenueTrend: trend,
        influencerPerformanceTrend: byInfluencer.slice(0, 10).map((row) => {
          const profile = influencerMap.get(String(row._id));
          return { id: row._id, name: profileName(profile), revenue: money(row.revenue), commission: money(row.commission), orders: row.orders };
        }),
        commissionTrend: trend.map((row) => ({ date: row.date, commission: row.commission })),
        conversionTrend: trend.map((row) => ({ date: row.date, conversions: row.conversions })),
      },
      topInfluencers: byInfluencer.slice(0, 5).map((row) => {
        const profile = influencerMap.get(String(row._id));
        return { id: row._id, name: profileName(profile), username: profileUsername(profile), revenue: money(row.revenue), commission: money(row.commission), orders: row.orders };
      }),
      topProducts: topProducts.map((row) => {
        const product = productMap.get(String(row._id));
        return { id: row._id, name: product?.name || "Product", category: product?.category || "", image: productImage(product), revenue: money(row.revenue), commission: money(row.commission), orders: row.orders };
      }),
      campaigns,
    };
  }

  async subscriptionPlans(userId) {
    const vendor = await this.getVendor(userId);
    const [subscription, plans, activeCampaigns, relationshipInfluencers, invitedInfluencers, acceptedInfluencers, campaignInfluencers, payments] = await Promise.all([
      influencerCommerceEngine.getVendorSubscription(vendor._id),
      VendorSubscriptionPlan.find({ "approval.status": "active" }).sort({ displayOrder: 1, monthlyPrice: 1 }).lean(),
      Campaign.countDocuments({ vendorId: vendor._id, state: { $in: SUBSCRIPTION_ACTIVE_CAMPAIGN_STATES } }),
      VendorInfluencerRelationship.find({
        vendorId: vendor._id,
        $or: [
          { visited: true },
          { saved: true },
          { status: { $in: ["viewed", "saved", "invited", "approved", "active"] } },
        ],
      }).select("influencerId").lean(),
      CampaignInvitation.find({
        vendorId: vendor._id,
        status: { $in: ["invitation_sent", "proposed", "pending_review", "accepted"] },
      }).select("influencerId").lean(),
      CampaignAcceptance.find({
        vendorId: vendor._id,
        status: { $in: ["accepted", "active"] },
      }).select("influencerId").lean(),
      Campaign.find({
        vendorId: vendor._id,
        influencerId: { $ne: null },
        state: { $in: SUBSCRIPTION_ACTIVE_CAMPAIGN_STATES },
      }).select("influencerId").lean(),
      SubscriptionPayment.find({ vendorId: vendor._id }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    const plan = subscription?.planId || null;
    const visibilityLimit = subscription ? Number(subscription.visibilityLimit ?? plan?.influencerVisibilityLimit ?? 0) : 0;
    const campaignLimit = subscription ? Number(subscription.campaignLimit ?? plan?.campaignLimit ?? 0) : 0;
    const visibleInfluencerIds = new Set([
      ...relationshipInfluencers.map((row) => row.influencerId),
      ...invitedInfluencers.map((row) => row.influencerId),
      ...acceptedInfluencers.map((row) => row.influencerId),
      ...campaignInfluencers.map((row) => row.influencerId),
    ].filter(Boolean).map(String));
    const visibleInfluencerCount = visibleInfluencerIds.size;
    return {
      currentSubscription: subscription,
      subscriptionStatus: subscription?.status || "not_subscribed",
      usage: {
        activeCampaigns: subscription ? activeCampaigns : 0,
        campaignLimit,
        influencersVisible: subscription ? (visibilityLimit < 0 ? visibleInfluencerCount : Math.min(visibilityLimit, visibleInfluencerCount)) : 0,
        visibilityLimit,
      },
      plans,
      payments,
      invoices: payments.filter((payment) => payment.invoiceId).map((payment) => ({
        invoiceId: payment.invoiceId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt,
      })),
    };
  }

  async escrowRefunds(userId, query = {}) {
    const vendor = await this.getVendor(userId);
    return campaignRefundService.getVendorEscrowRefundDashboard(vendor._id, {
      status: query.status,
      limit: parseInt(query.limit) || 50,
      skip: parseInt(query.skip) || 0,
    });
  }

  async escrowRefundDeliverables(userId, campaignId) {
    const vendor = await this.getVendor(userId);
    return campaignRefundService.getVendorEscrowRefundDeliverables(vendor._id, campaignId);
  }

  async activateSubscription({ userId, vendor, plan, billingCycle = "monthly", paymentReference = "", paymentId = null, metadata = {}, autoRenew = false }) {
    const entitlements = planEntitlements(plan);
    await VendorSubscription.updateMany({ vendorId: vendor._id, status: { $in: ["trialing", "active", "grace_period"] } }, { $set: { status: "cancelled", updatedBy: userId } });
    const now = new Date();
    const endDate = subscriptionEndDate(now, plan, billingCycle);
    const subscription = await VendorSubscription.create({
      vendorId: vendor._id,
      planId: plan._id,
      billingCycle,
      startDate: now,
      endDate,
      status: "active",
      autoRenew: Boolean(autoRenew && plan.autoRenewAllowed),
      paymentReference,
      campaignLimit: entitlements.campaignLimit,
      visibilityLimit: entitlements.visibilityLimit,
      allowedTiers: entitlements.allowedTiers,
      entitlementsSnapshot: { planName: plan.planName, ...entitlements },
      metadata: {
        ...metadata,
        durationDays: subscriptionDurationDays(plan, billingCycle),
      },
      createdBy: userId,
      updatedBy: userId,
    });
    if (paymentId) await SubscriptionPayment.updateOne({ _id: paymentId }, { $set: { subscriptionId: subscription._id } });
    await auditService.log({ actor: { _id: userId, role: "vendor" }, action: "vendor.subscription.activated", entityType: "VendorSubscription", entityId: subscription._id, metadata: { planId: plan._id, planName: plan.planName, paymentReference, entitlements } }).catch(() => {});
    await notifyVendor(vendor._id, {
      title: "Subscription activated",
      message: `${plan.planName} is active until ${endDate.toLocaleDateString()}.`,
      severity: "success",
      metadata: { planId: String(plan._id), subscriptionId: String(subscription._id) },
    });
    return subscription.populate("planId");
  }

  async subscribe(userId, payload = {}) {
    const vendor = await this.getVendor(userId);
    const plan = await VendorSubscriptionPlan.findOne({ _id: objectId(payload.planId), "approval.status": "active" });
    if (!plan) throw new AppError("Subscription plan not found", 404, "PLAN_NOT_FOUND");
    const amount = subscriptionAmount(plan, payload.billingCycle || "monthly");
    if (amount > 0 && !payload.paymentReference) {
      throw new AppError("Paid subscriptions must be activated through verified Razorpay payment", 402, "PAYMENT_REQUIRED");
    }
    return this.activateSubscription({ userId, vendor, plan, billingCycle: payload.billingCycle || "monthly", paymentReference: payload.paymentReference || "free_plan", metadata: payload.metadata || {}, autoRenew: payload.autoRenew });
  }

  async createSubscriptionOrder(userId, payload = {}) {
    const vendor = await this.getVendor(userId);
    const plan = await VendorSubscriptionPlan.findOne({ _id: objectId(payload.planId), "approval.status": "active" }).lean();
    if (!plan) throw new AppError("Subscription plan not found", 404, "PLAN_NOT_FOUND");
    const billingCycle = payload.billingCycle || "monthly";
    const amount = subscriptionAmount(plan, billingCycle);
    const currency = plan.currency || "INR";
    if (amount <= 0) {
      const subscription = await this.activateSubscription({ userId, vendor, plan, billingCycle, paymentReference: "free_plan", metadata: { source: "zero_amount_plan" }, autoRenew: payload.autoRenew });
      return { requiresPayment: false, subscription };
    }
    await paymentService.assertGatewayEnabled();
    const receipt = `sub_${String(vendor._id).slice(-6)}_${Date.now()}`;
    const razorpay = paymentService.getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt,
      notes: {
        purpose: "subscription_payment",
        vendorId: String(vendor._id),
        planId: String(plan._id),
        billingCycle,
      },
    });
    if (!order?.id || Number(order.amount) !== Math.round(amount * 100)) {
      throw new AppError("Invalid Razorpay subscription order", 502, "RAZORPAY_ORDER_VALIDATION_FAILED");
    }
    const payment = await SubscriptionPayment.create({
      vendorId: vendor._id,
      planId: plan._id,
      billingCycle,
      amount,
      currency,
      razorpayOrderId: order.id,
      receipt,
      status: "pending",
      gatewayResponse: { order },
      metadata: { planName: plan.planName, autoRenew: Boolean(payload.autoRenew && plan.autoRenewAllowed), durationDays: subscriptionDurationDays(plan, billingCycle) },
    });
    await auditService.log({ actor: { _id: userId, role: "vendor" }, action: "vendor.subscription.order_created", entityType: "SubscriptionPayment", entityId: payment._id, metadata: { planId: plan._id, planName: plan.planName, amount, razorpayOrderId: order.id } }).catch(() => {});
    return {
      requiresPayment: true,
      paymentId: payment._id,
      razorpayOrderId: order.id,
      orderId: order.id,
      amount: order.amount,
      currency,
      key: process.env.RAZORPAY_KEY_ID,
      plan,
      billingCycle,
      receipt,
    };
  }

  async verifySubscriptionPayment(userId, payload = {}) {
    const vendor = await this.getVendor(userId);
    const payment = await SubscriptionPayment.findOne({ razorpayOrderId: payload.razorpay_order_id });
    if (!payment) throw new AppError("Subscription payment not found", 404, "SUBSCRIPTION_PAYMENT_NOT_FOUND");
    if (String(payment.vendorId) !== String(vendor._id)) throw new AppError("Forbidden", 403, "FORBIDDEN");
    if (payment.status === "paid" && payment.subscriptionId) {
      const subscription = await VendorSubscription.findById(payment.subscriptionId).populate("planId").lean();
      return { payment, subscription };
    }
    const secret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    if (!secret) throw new AppError("Razorpay key secret is required", 500, "RAZORPAY_NOT_CONFIGURED");
    const expectedSignature = crypto.createHmac("sha256", secret).update(`${payload.razorpay_order_id}|${payload.razorpay_payment_id}`).digest("hex");
    if (!safeEqual(expectedSignature, payload.razorpay_signature)) {
      payment.status = "failed";
      payment.failureReason = "Invalid Razorpay signature";
      payment.razorpayPaymentId = payload.razorpay_payment_id;
      payment.signature = payload.razorpay_signature;
      await payment.save();
      await auditService.log({ actor: { _id: userId, role: "vendor" }, action: "vendor.subscription.payment_failed", entityType: "SubscriptionPayment", entityId: payment._id, metadata: { reason: "invalid_signature" } }).catch(() => {});
      throw new AppError("Payment verification failed", 400, "PAYMENT_VERIFICATION_FAILED");
    }
    const gatewayPayment = await paymentService.fetchGatewayPayment(payload.razorpay_payment_id);
    if (String(gatewayPayment.order_id) !== String(payload.razorpay_order_id)) throw new AppError("Gateway payment order mismatch", 409, "PAYMENT_ORDER_MISMATCH");
    if (String(gatewayPayment.status || "").toLowerCase() !== "captured") throw new AppError("Payment is not captured by Razorpay", 409, "PAYMENT_NOT_CAPTURED");
    if (Number(gatewayPayment.amount) !== Math.round(Number(payment.amount) * 100)) throw new AppError("Payment amount mismatch", 409, "PAYMENT_AMOUNT_MISMATCH");
    const plan = await VendorSubscriptionPlan.findOne({ _id: payment.planId, "approval.status": "active" });
    if (!plan) throw new AppError("Subscription plan not found", 404, "PLAN_NOT_FOUND");
    const invoiceId = `SUB-INV-${String(payment._id).slice(-8).toUpperCase()}`;
    payment.status = "paid";
    payment.razorpayPaymentId = payload.razorpay_payment_id;
    payment.signature = payload.razorpay_signature;
    payment.invoiceId = invoiceId;
    payment.gatewayResponse = { ...(payment.gatewayResponse || {}), payment: gatewayPayment };
    await payment.save();
    const subscription = await this.activateSubscription({ userId, vendor, plan, billingCycle: payment.billingCycle, paymentReference: payload.razorpay_payment_id, paymentId: payment._id, metadata: { invoiceId }, autoRenew: payment.metadata?.autoRenew });
    const gatewayFee = money(Number(gatewayPayment.fee || 0) / 100);
    const tax = money(Number(gatewayPayment.tax || 0) / 100);
    const revenue = await SubscriptionRevenue.create({
      vendorId: vendor._id,
      planId: plan._id,
      subscriptionId: subscription._id,
      paymentId: payment._id,
      grossAmount: payment.amount,
      tax,
      gatewayFee,
      netAmount: money(payment.amount - gatewayFee),
      currency: payment.currency,
      invoiceId,
      status: "recognized",
      metadata: { planName: plan.planName, billingCycle: payment.billingCycle },
    });
    await auditService.log({ actor: { _id: userId, role: "vendor" }, action: "vendor.subscription.purchased", entityType: "SubscriptionRevenue", entityId: revenue._id, metadata: { planId: plan._id, planName: plan.planName, amount: payment.amount, invoiceId } }).catch(() => {});
    return { payment, subscription, revenue, invoice: { invoiceId, amount: payment.amount, currency: payment.currency } };
  }

  async prorationPreview(userId, payload = {}) {
    const vendor = await this.getVendor(userId);
    const subscription = await influencerCommerceEngine.getVendorSubscription(vendor._id);
    if (!subscription?.planId) throw new AppError("An active subscription is required to change plans", 403, "SUBSCRIPTION_REQUIRED");
    const targetPlan = await VendorSubscriptionPlan.findOne({ _id: objectId(payload.planId), "approval.status": "active" }).lean();
    if (!targetPlan) throw new AppError("Target subscription plan not found", 404, "PLAN_NOT_FOUND");
    const currentPlan = subscription.planId;
    const currentCycle = subscription.billingCycle || "monthly";
    const targetCycle = payload.billingCycle || currentCycle;
    const currentPaid = await SubscriptionPayment.findOne({ subscriptionId: subscription._id, status: "paid" }).sort({ createdAt: -1 }).lean();
    const paidAmount = money(currentPaid?.amount ?? subscriptionAmount(currentPlan, currentCycle));
    const totalDays = subscriptionTotalDays(subscription, currentPlan);
    const remainingDays = subscriptionRemainingDays(subscription);
    const dailyRate = totalDays ? paidAmount / totalDays : 0;
    const remainingCredit = money(dailyRate * remainingDays);
    const targetPrice = subscriptionAmount(targetPlan, targetCycle);
    const creditApplied = money(Math.min(remainingCredit, targetPrice));
    const amountPayable = money(Math.max(0, targetPrice - creditApplied));
    const creditToWallet = money(Math.max(0, remainingCredit - targetPrice));
    return {
      currentSubscriptionId: subscription._id,
      currentPlan,
      currentBillingCycle: currentCycle,
      paidAmount,
      totalDays,
      remainingDays,
      remainingCredit,
      targetPlan,
      targetBillingCycle: targetCycle,
      targetPrice,
      creditApplied,
      amountPayable,
      creditToWallet,
      changeType: changeTypeFor(currentPlan, targetPlan, currentCycle, targetCycle),
      currency: targetPlan.currency || currentPlan.currency || "INR",
    };
  }

  async createPlanChangeOrder(userId, payload = {}) {
    const vendor = await this.getVendor(userId);
    const preview = await this.prorationPreview(userId, payload);
    const targetPlan = preview.targetPlan;
    const change = await VendorSubscriptionChange.create({
      vendorId: vendor._id,
      oldSubscriptionId: preview.currentSubscriptionId,
      oldPlanId: preview.currentPlan._id,
      newPlanId: targetPlan._id,
      oldCycle: preview.currentBillingCycle,
      newCycle: preview.targetBillingCycle,
      remainingDays: preview.remainingDays,
      remainingCredit: preview.remainingCredit,
      newPlanPrice: preview.targetPrice,
      creditApplied: preview.creditApplied,
      finalAmountPaid: preview.amountPayable,
      changeType: preview.changeType,
      status: preview.amountPayable > 0 ? "pending_payment" : "completed",
      reason: payload.reason || "",
      metadata: {
        creditToWallet: preview.creditToWallet,
        autoRenew: Boolean(payload.autoRenew && targetPlan.autoRenewAllowed),
      },
      createdBy: userId,
    });
    if (preview.amountPayable <= 0) {
      const subscription = await this.completePlanChange({ userId, vendor, change, payment: null, paymentReference: "credit_change" });
      return { requiresPayment: false, preview, change, subscription };
    }
    await paymentService.assertGatewayEnabled();
    const receipt = `subchg_${String(vendor._id).slice(-6)}_${Date.now()}`;
    const razorpay = paymentService.getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: Math.round(preview.amountPayable * 100),
      currency: preview.currency,
      receipt,
      notes: {
        purpose: "subscription_change",
        vendorId: String(vendor._id),
        changeId: String(change._id),
        planId: String(targetPlan._id),
        billingCycle: preview.targetBillingCycle,
      },
    });
    if (!order?.id || Number(order.amount) !== Math.round(preview.amountPayable * 100)) {
      throw new AppError("Invalid Razorpay subscription change order", 502, "RAZORPAY_ORDER_VALIDATION_FAILED");
    }
    const payment = await SubscriptionPayment.create({
      vendorId: vendor._id,
      planId: targetPlan._id,
      billingCycle: preview.targetBillingCycle,
      amount: preview.amountPayable,
      currency: preview.currency,
      razorpayOrderId: order.id,
      receipt,
      status: "pending",
      gatewayResponse: { order },
      metadata: { planName: targetPlan.planName, changeId: String(change._id), purpose: "subscription_change", creditApplied: preview.creditApplied, autoRenew: Boolean(payload.autoRenew && targetPlan.autoRenewAllowed) },
    });
    change.paymentId = payment._id;
    await change.save();
    await auditService.log({ actor: { _id: userId, role: "vendor" }, action: "vendor.subscription.change_order_created", entityType: "VendorSubscriptionChange", entityId: change._id, metadata: { amount: preview.amountPayable, creditApplied: preview.creditApplied } }).catch(() => {});
    return { requiresPayment: true, preview, changeId: change._id, paymentId: payment._id, razorpayOrderId: order.id, orderId: order.id, amount: order.amount, currency: preview.currency, key: process.env.RAZORPAY_KEY_ID, receipt };
  }

  async completePlanChange({ userId, vendor, change, payment = null, paymentReference = "" }) {
    const targetPlan = await VendorSubscriptionPlan.findOne({ _id: change.newPlanId, "approval.status": "active" });
    if (!targetPlan) throw new AppError("Target subscription plan not found", 404, "PLAN_NOT_FOUND");
    await VendorSubscription.updateOne({ _id: change.oldSubscriptionId, vendorId: vendor._id }, { $set: { status: "cancelled", updatedBy: userId } });
    const subscription = await this.activateSubscription({
      userId,
      vendor,
      plan: targetPlan,
      billingCycle: change.newCycle,
      paymentReference,
      paymentId: payment?._id,
      metadata: { changeId: String(change._id), creditApplied: change.creditApplied },
      autoRenew: Boolean(change.metadata?.autoRenew),
    });
    change.newSubscriptionId = subscription._id;
    change.status = "completed";
    if (payment) change.finalAmountPaid = payment.amount;
    await change.save();
    const creditToWallet = money(change.metadata?.creditToWallet || Math.max(0, change.remainingCredit - change.newPlanPrice));
    if (creditToWallet > 0) {
      await SubscriptionCreditWallet.create({
        vendorId: vendor._id,
        creditAmount: creditToWallet,
        remainingAmount: creditToWallet,
        currency: targetPlan.currency || "INR",
        sourcePlanId: change.oldPlanId,
        targetPlanId: change.newPlanId,
        changeId: change._id,
        expiresAt: addDays(new Date(), 365),
        metadata: { reason: "downgrade_credit" },
      });
    }
    await auditService.log({ actor: { _id: userId, role: "vendor" }, action: `vendor.subscription.${change.changeType}`, entityType: "VendorSubscriptionChange", entityId: change._id, metadata: { creditApplied: change.creditApplied, paid: change.finalAmountPaid } }).catch(() => {});
    await notifyVendor(vendor._id, { title: "Subscription changed", message: `${targetPlan.planName} is now active.`, severity: "success", metadata: { changeId: String(change._id), subscriptionId: String(subscription._id) } });
    return subscription;
  }

  async confirmPlanChange(userId, payload = {}) {
    const vendor = await this.getVendor(userId);
    const payment = await SubscriptionPayment.findOne({ razorpayOrderId: payload.razorpay_order_id });
    if (!payment) throw new AppError("Subscription change payment not found", 404, "SUBSCRIPTION_PAYMENT_NOT_FOUND");
    if (String(payment.vendorId) !== String(vendor._id)) throw new AppError("Forbidden", 403, "FORBIDDEN");
    const change = await VendorSubscriptionChange.findOne({ _id: objectId(payment.metadata?.changeId), vendorId: vendor._id });
    if (!change) throw new AppError("Subscription change not found", 404, "SUBSCRIPTION_CHANGE_NOT_FOUND");
    if (change.status === "completed" && change.newSubscriptionId) {
      const subscription = await VendorSubscription.findById(change.newSubscriptionId).populate("planId").lean();
      return { payment, change, subscription };
    }
    const secret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    if (!secret) throw new AppError("Razorpay key secret is required", 500, "RAZORPAY_NOT_CONFIGURED");
    const expectedSignature = crypto.createHmac("sha256", secret).update(`${payload.razorpay_order_id}|${payload.razorpay_payment_id}`).digest("hex");
    if (!safeEqual(expectedSignature, payload.razorpay_signature)) {
      payment.status = "failed";
      payment.failureReason = "Invalid Razorpay signature";
      payment.razorpayPaymentId = payload.razorpay_payment_id;
      payment.signature = payload.razorpay_signature;
      change.status = "failed";
      await Promise.all([payment.save(), change.save()]);
      throw new AppError("Payment verification failed", 400, "PAYMENT_VERIFICATION_FAILED");
    }
    const gatewayPayment = await paymentService.fetchGatewayPayment(payload.razorpay_payment_id);
    if (String(gatewayPayment.order_id) !== String(payload.razorpay_order_id)) throw new AppError("Gateway payment order mismatch", 409, "PAYMENT_ORDER_MISMATCH");
    if (String(gatewayPayment.status || "").toLowerCase() !== "captured") throw new AppError("Payment is not captured by Razorpay", 409, "PAYMENT_NOT_CAPTURED");
    if (Number(gatewayPayment.amount) !== Math.round(Number(payment.amount) * 100)) throw new AppError("Payment amount mismatch", 409, "PAYMENT_AMOUNT_MISMATCH");
    const invoiceId = `SUB-CHG-${String(payment._id).slice(-8).toUpperCase()}`;
    payment.status = "paid";
    payment.razorpayPaymentId = payload.razorpay_payment_id;
    payment.signature = payload.razorpay_signature;
    payment.invoiceId = invoiceId;
    payment.gatewayResponse = { ...(payment.gatewayResponse || {}), payment: gatewayPayment };
    await payment.save();
    const subscription = await this.completePlanChange({ userId, vendor, change, payment, paymentReference: payload.razorpay_payment_id });
    const gatewayFee = money(Number(gatewayPayment.fee || 0) / 100);
    const tax = money(Number(gatewayPayment.tax || 0) / 100);
    const revenue = await SubscriptionRevenue.create({
      vendorId: vendor._id,
      planId: change.newPlanId,
      subscriptionId: subscription._id,
      paymentId: payment._id,
      grossAmount: payment.amount,
      tax,
      gatewayFee,
      netAmount: money(payment.amount - gatewayFee),
      currency: payment.currency,
      invoiceId,
      status: "recognized",
      metadata: { changeId: String(change._id), changeType: change.changeType },
    });
    return { payment, change, subscription, revenue, invoice: { invoiceId, amount: payment.amount, currency: payment.currency } };
  }

  async cancelSubscription(userId) {
    const vendor = await this.getVendor(userId);
    const subscription = await VendorSubscription.findOneAndUpdate(
      { vendorId: vendor._id, status: { $in: ["trialing", "active", "grace_period"] } },
      { $set: { status: "cancelled", updatedBy: userId } },
      { returnDocument: "after" }
    ).populate("planId");
    if (!subscription) throw new AppError("Active subscription not found", 404, "SUBSCRIPTION_NOT_FOUND");
    await auditService.log({ actor: { _id: userId, role: "vendor" }, action: "vendor.subscription.cancelled", entityType: "VendorSubscription", entityId: subscription._id, metadata: { planId: subscription.planId?._id, planName: subscription.planId?.planName } }).catch(() => {});
    return subscription;
  }

  async configuration() {
    return influencerRateCardService.getConfiguration();
  }

  async creatorProfile(userId, influencerId) {
    const vendor = await this.getVendor(userId);
    await this.visitInfluencer(userId, influencerId);
    const profile = await influencerRateCardService.getCreatorProfile(influencerId);
    const relationship = await VendorInfluencerRelationship.findOne({ vendorId: vendor._id, influencerId }).lean();
    return { ...profile, relationship };
  }

  async campaignPreview(userId, payload = {}) {
    const vendor = await this.getVendor(userId);
    const productIds = Array.isArray(payload.productIds) ? payload.productIds : [];
    const products = await Product.find({ _id: { $in: productIds }, sellerId: vendor._id }).select("_id name price discountPrice category images thumbnail").lean();
    if (products.length !== productIds.length) {
      throw new AppError("Campaign products must belong to the vendor", 403, "FORBIDDEN");
    }
    const pricing = await influencerRateCardService.calculateCampaignPricing({
      vendorId: vendor._id,
      influencerId: payload.influencerId || null,
      payload,
      products,
    });
    const fixedBudget = Number(pricing.pricing?.fixedCost || payload.fixedFee || 0);
    const fundingSummary = ["fixed", "hybrid"].includes(pricing.paymentType || pricing.paymentModel?.paymentType || payload.paymentType)
      ? fixedBudget > 0
        ? await require("../../services/campaign-fee.service").calculateFundingSummary(
          fixedBudget,
          pricing.pricing?.currency || "INR"
        )
        : {
          budgetAmount: 0,
          escrowAmount: 0,
          platformFeeAmount: 0,
          gatewayFeeAmount: 0,
          taxAmount: 0,
          totalAmount: 0,
          currency: pricing.pricing?.currency || "INR",
          feeLines: [],
          feeSource: "Configured by Admin",
        }
      : null;
    return {
      paymentModel: pricing.paymentModel,
      attributionRule: {
        attributionDays: pricing.attributionDays,
        trackingEnabled: Boolean(pricing.affiliateTrackingEnabled),
      },
      campaignRuleEngine: pricing.paymentModel?.ruleEngine || null,
      pricing: pricing.pricing,
      influencerSnapshot: pricing.influencerSnapshot,
      campaignFields: pricing.campaignFields,
      fundingSummary,
    };
  }

  async expireSubscriptions({ now = new Date(), notify = true } = {}) {
    const expired = await VendorSubscription.find({
      status: { $in: ["trialing", "active", "grace_period", "past_due"] },
      endDate: { $ne: null, $lt: now },
    }).populate("planId");
    for (const subscription of expired) {
      subscription.status = "expired";
      subscription.expiredAt = now;
      subscription.updatedBy = subscription.updatedBy || subscription.createdBy;
      await subscription.save();
      await auditService.log({
        actor: { role: "system" },
        action: "vendor.subscription.expired",
        entityType: "VendorSubscription",
        entityId: subscription._id,
        metadata: { vendorId: String(subscription.vendorId), planId: String(subscription.planId?._id || subscription.planId), planName: subscription.planId?.planName || "" },
      }).catch(() => {});
      if (notify) {
        await notifyVendor(subscription.vendorId, {
          title: "Subscription expired",
          message: `${subscription.planId?.planName || "Your subscription"} has expired. Choose a plan to continue influencer commerce.`,
          severity: "warning",
          metadata: { subscriptionId: String(subscription._id) },
        });
      }
    }
    return { expiredCount: expired.length };
  }

  async discover(userId, query = {}) {
    const vendor = await this.getVendor(userId);
    const { page, limit: requestedLimit } = pageOptions(query, 24);
    const discoveryPlan = await influencerCommerceEngine.discoveryLimit(vendor._id, requestedLimit);
    const limit = discoveryPlan.limit;
    if (!limit || !discoveryPlan.subscription) {
      return {
        items: [],
        subscription: {
          status: "not_subscribed",
          planName: null,
          influencerVisibilityLimit: 0,
          limit: 0,
        },
        pagination: { total: 0, page, limit: 0, pages: 1 },
      };
    }
    const skip = discoveryPlan.visibilityLimit < 0 ? (page - 1) * limit : Math.min((page - 1) * limit, Math.max(discoveryPlan.visibilityLimit - limit, 0));
    const requiredIdSets = [];
    const filter = {
      state: { $in: ["verified", "active"] },
      "privacy.searchVisibility": { $ne: false },
      "privacy.profileVisibility": { $ne: "private" },
    };
    if (query.status && ["viewed", "saved", "invited", "applied", "approved", "active", "paused", "blacklisted"].includes(String(query.status))) {
      const relationshipRows = await VendorInfluencerRelationship.find({ vendorId: vendor._id, status: query.status }).select("influencerId").lean();
      requiredIdSets.push(new Set(relationshipRows.map((row) => String(row.influencerId))));
    }
    if (query.campaignId && objectId(query.campaignId)) {
      const campaign = await Campaign.findOne({ _id: objectId(query.campaignId), vendorId: vendor._id }).select("influencerId applications category productIds").lean();
      if (campaign) {
        const campaignInfluencerIds = [
          campaign.influencerId,
          ...(campaign.applications || []).map((application) => application.influencerId),
        ].filter(Boolean).map(String);
        if (campaignInfluencerIds.length) requiredIdSets.push(new Set(campaignInfluencerIds));
        if (!query.category && campaign.category) filter.$or = [{ categories: campaign.category }, { primaryCategory: campaign.category }, { secondaryCategories: campaign.category }];
      }
    }
    if (query.productId && objectId(query.productId)) {
      const assignments = await InfluencerProductAssignment.find({ vendorId: vendor._id, productId: objectId(query.productId), status: { $ne: "rejected" } }).select("influencerId").lean();
      requiredIdSets.push(new Set(assignments.map((row) => String(row.influencerId))));
    }
    const priceClause = (minValue, maxValue) => {
      const range = {};
      if (minValue !== undefined && minValue !== "") range.$gte = Number(minValue);
      if (maxValue !== undefined && maxValue !== "") range.$lte = Number(maxValue);
      if (!Object.keys(range).length) return null;
      return {
        $or: [
          { packages: { $elemMatch: { status: "active", price: range } } },
          { packages: { $exists: false }, price: range },
          { packages: { $size: 0 }, price: range },
        ],
      };
    };
    const matchingServiceSet = async (serviceFilter) => {
      const rows = await InfluencerService.find(serviceFilter).select("influencerId").lean();
      return new Set(rows.map((row) => String(row.influencerId)).filter(Boolean));
    };
    const baseServiceFilter = { status: "active" };
    let hasBaseServiceFilter = false;
    if (query.serviceType) {
      baseServiceFilter.serviceTypeKey = String(query.serviceType).trim().toLowerCase();
      hasBaseServiceFilter = true;
    }
    const basePriceClause = priceClause(query.minPrice, query.maxPrice);
    if (basePriceClause) {
      baseServiceFilter.$and = [...(baseServiceFilter.$and || []), basePriceClause];
      hasBaseServiceFilter = true;
    }
    if (hasBaseServiceFilter) {
      requiredIdSets.push(await matchingServiceSet(baseServiceFilter));
    }
    const packagePriceAliases = [
      ["reelPrice", "reel"],
      ["postPrice", "post"],
      ["storyPrice", "story"],
      ["livePrice", "live_stream"],
    ];
    for (const [field, serviceTypeKey] of packagePriceAliases) {
      if (query[field] === undefined || query[field] === "") continue;
      const aliasPriceClause = priceClause(undefined, query[field]);
      const aliasFilter = {
        status: "active",
        serviceTypeKey,
        ...(aliasPriceClause ? { $and: [aliasPriceClause] } : {}),
      };
      requiredIdSets.push(await matchingServiceSet(aliasFilter));
    }
    if (requiredIdSets.length) {
      const [firstSet, ...restSets] = requiredIdSets;
      const ids = [...firstSet].filter((id) => restSets.every((set) => set.has(id))).map((id) => objectId(id)).filter(Boolean);
      filter._id = { $in: ids };
    }
    if (query.category) filter.$or = [{ categories: query.category }, { primaryCategory: query.category }, { secondaryCategories: query.category }];
    if (query.country) filter["location.country"] = query.country;
    if (query.language) filter.languages = query.language;
    if (query.minFollowers || query.maxFollowers) {
      filter.followers = {};
      if (query.minFollowers) filter.followers.$gte = Number(query.minFollowers);
      if (query.maxFollowers) filter.followers.$lte = Number(query.maxFollowers);
    }
    if (query.search) {
      const re = new RegExp(escapeRegex(query.search), "i");
      filter.$and = [{ $or: [{ displayName: re }, { influencerCode: re }, { primaryCategory: re }, { categories: re }] }];
    }

    const tierFilter = await influencerCommerceEngine.allowedInfluencerFilter(vendor._id);
    if (Object.keys(tierFilter).length) {
      filter.$and = [...(filter.$and || []), tierFilter];
    }

    const sortMap = {
      highest_revenue: { "stats.revenue": -1 },
      highest_conversion: { "stats.sales": -1, "stats.clicks": 1 },
      most_followers: { followers: -1 },
      recommended: { verified: -1, rating: -1, followers: -1 },
      trending: { "stats.views": -1, followers: -1 },
    };
    const sort = sortMap[query.sort] || sortMap.trending;
    const [items, total, relationships, socialAccounts] = await Promise.all([
      InfluencerProfile.find(filter).populate("userId", "name email username").sort(sort).skip(skip).limit(limit).lean(),
      InfluencerProfile.countDocuments(filter),
      VendorInfluencerRelationship.find({ vendorId: vendor._id }).lean(),
      InfluencerSocialAccount.find({ verificationStatus: "verified" }).lean(),
    ]);
    const relationshipMap = new Map(relationships.map((row) => [String(row.influencerId), row]));
    const socialMap = socialAccounts.reduce((map, account) => {
      const key = String(account.influencerId || "");
      const list = map.get(key) || [];
      list.push(account);
      map.set(key, list);
      return map;
    }, new Map());

    const [scoredRows, creatorCardMap] = await Promise.all([
      influencerCommerceEngine.rankInfluencerRows(await influencerCommerceEngine.scoreProfiles(items)),
      influencerRateCardService.getCreatorCards(items.map((profile) => profile._id)),
    ]);
    const scoredMap = new Map(scoredRows.map((row) => [String(row.profile._id), row]));
    const mappedItems = items.map((profile) => {
        const socials = socialMap.get(String(profile._id)) || [];
        const creatorCard = creatorCardMap.get(String(profile._id)) || {};
        const engagementRate = socials.length
          ? money(socials.reduce((sum, account) => sum + Number(account.engagementRate || 0), 0) / socials.length)
          : 0;
        const clicks = Number(profile.stats?.clicks || 0);
        const sales = Number(profile.stats?.sales || 0);
        const scored = scoredMap.get(String(profile._id));
        return {
          id: profile._id,
          _id: profile._id,
          profilePicture: profile.profilePicture,
          name: profileName(profile),
          username: profileUsername(profile),
          email: profile.userId?.email || "",
          category: profile.primaryCategory || profile.categories?.[0] || "",
          categories: profile.categories || [],
          followers: Number(profile.followers || 0),
          engagementRate,
          conversionRate: clicks ? money((sales / clicks) * 100) : 0,
          averageRevenue: sales ? money(Number(profile.stats?.revenue || 0) / sales) : 0,
          revenueGenerated: Number(profile.stats?.revenue || 0),
          influencerScore: scored?.score?.score || 0,
          scoreComponents: scored?.score?.components || {},
          scoreConfigVersion: scored?.score?.configVersion || 1,
          completionRate: scored?.completionRate || 0,
          rating: Number(profile.rating || 0),
          tier: scored?.tier ? {
            id: scored.tier._id,
            name: scored.tier.tierName,
            badge: scored.tier.badge,
            color: scored.tier.color,
            priority: scored.tier.priority,
          } : null,
          rankingScore: scored?.rankingScore || 0,
          rankingRuleVersion: scored?.rankingRuleVersion || 1,
          location: profile.location,
          languages: profile.languages || [],
          verified: Boolean(profile.verified),
          status: relationshipMap.get(String(profile._id))?.status || "",
          saved: Boolean(relationshipMap.get(String(profile._id))?.saved),
          visited: Boolean(relationshipMap.get(String(profile._id))?.visited),
          visitCount: Number(relationshipMap.get(String(profile._id))?.visitCount || 0),
          lastVisitedAt: relationshipMap.get(String(profile._id))?.lastVisitedAt,
          services: creatorCard.services || [],
          rateCard: creatorCard.rateCard || [],
          startingRate: creatorCard.startingRate || 0,
        };
      });
    const scoreFilteredItems = mappedItems.filter((row) => {
      if (query.ratingMin && Number(row.rating || 0) < Number(query.ratingMin)) return false;
      if (query.scoreMin && Number(row.influencerScore || 0) < Number(query.scoreMin)) return false;
      if (query.completionMin && Number(row.completionRate || 0) < Number(query.completionMin)) return false;
      return true;
    });
    const sortedItems = query.sort ? scoreFilteredItems : scoreFilteredItems.sort((a, b) => (b.rankingScore || 0) - (a.rankingScore || 0));
    const visibleTotal = discoveryPlan.visibilityLimit < 0 ? total : Math.min(total, discoveryPlan.visibilityLimit);
    return {
      items: sortedItems,
      subscription: {
        planName: discoveryPlan.plan?.planName || "Free",
        influencerVisibilityLimit: discoveryPlan.visibilityLimit,
        resultLimit: limit,
      },
      pagination: { total: visibleTotal, page, limit, pages: Math.ceil(visibleTotal / limit) || 1 },
    };
  }

  async relationships(userId, query = {}) {
    const vendor = await this.getVendor(userId);
    const { page, limit, skip } = pageOptions(query, 20);
    const filter = { vendorId: vendor._id };
    if (query.status) filter.status = query.status;
    const requiredIdSets = [];
    if (query.campaignId && objectId(query.campaignId)) {
      const campaign = await Campaign.findOne({ _id: objectId(query.campaignId), vendorId: vendor._id }).select("influencerId applications").lean();
      const ids = campaign
        ? [campaign.influencerId, ...(campaign.applications || []).map((application) => application.influencerId)].filter(Boolean).map(String)
        : [];
      requiredIdSets.push(new Set(ids));
    }
    if (query.productId && objectId(query.productId)) {
      const assignments = await InfluencerProductAssignment.find({ vendorId: vendor._id, productId: objectId(query.productId), status: { $ne: "rejected" } }).select("influencerId").lean();
      requiredIdSets.push(new Set(assignments.map((row) => String(row.influencerId))));
    }
    if (query.category || query.search) {
      const profileFilter = {};
      const clauses = [];
      if (query.category) clauses.push({ $or: [{ categories: query.category }, { primaryCategory: query.category }, { secondaryCategories: query.category }] });
      if (query.search) {
        const re = new RegExp(escapeRegex(query.search), "i");
        clauses.push({ $or: [{ displayName: re }, { influencerCode: re }, { primaryCategory: re }, { categories: re }] });
      }
      if (clauses.length === 1) Object.assign(profileFilter, clauses[0]);
      if (clauses.length > 1) profileFilter.$and = clauses;
      const profiles = await InfluencerProfile.find(profileFilter).select("_id").lean();
      requiredIdSets.push(new Set(profiles.map((profile) => String(profile._id))));
    }
    if (requiredIdSets.length) {
      const [firstSet, ...restSets] = requiredIdSets;
      const ids = [...firstSet].filter((id) => restSets.every((set) => set.has(id))).map((id) => objectId(id)).filter(Boolean);
      filter.influencerId = { $in: ids };
    }
    const metricCampaignFilter = { vendorId: vendor._id };
    applyPaymentModelFilter(metricCampaignFilter, query);
    if (query.campaignId && objectId(query.campaignId)) metricCampaignFilter._id = objectId(query.campaignId);
    if (query.productId && objectId(query.productId)) metricCampaignFilter.productIds = objectId(query.productId);
    const metricCampaignIds = await campaignIdsForFilter(metricCampaignFilter);
    const metricMatch = { vendorId: vendor._id, campaignId: { $in: metricCampaignIds } };
    if (query.productId && objectId(query.productId)) metricMatch["metadata.productId"] = objectId(query.productId);
    if (query.startDate || query.endDate) {
      const { start, end } = parseRange(query);
      metricMatch.createdAt = { $gte: start, $lte: end };
    }
    const trackingMatch = { campaignId: { $in: metricCampaignIds } };
    if (query.productId && objectId(query.productId)) trackingMatch.productId = objectId(query.productId);
    if (query.startDate || query.endDate) {
      const { start, end } = parseRange(query);
      trackingMatch.createdAt = { $gte: start, $lte: end };
    }
    const [items, total, commissionRows, campaignRows, trackingRows] = await Promise.all([
      VendorInfluencerRelationship.find(filter)
        .populate({ path: "influencerId", populate: { path: "userId", select: "name email username" } })
        .sort({ lastActivityAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      VendorInfluencerRelationship.countDocuments(filter),
      CommissionRecord.aggregate([
        { $match: metricMatch },
        { $group: { _id: "$influencerId", revenue: { $sum: "$gross" }, commission: { $sum: "$influencerShare" }, orders: { $sum: 1 } } },
      ]),
      Campaign.aggregate([
        {
          $match: {
            _id: { $in: metricCampaignIds },
            state: { $in: ["active", "accepted", "proposed"] },
          },
        },
        { $unwind: { path: "$applications", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            influencerId: { $ifNull: ["$applications.influencerId", "$influencerId"] },
            applicationStatus: "$applications.status",
          },
        },
        { $match: { influencerId: { $ne: null }, $or: [{ applicationStatus: "approved" }, { applicationStatus: null }] } },
        { $group: { _id: "$influencerId", count: { $sum: 1 } } },
      ]),
      CampaignAffiliateClick.aggregate([
        { $match: trackingMatch },
        { $group: { _id: "$influencerId", clicks: { $sum: 1 } } },
      ]),
    ]);
    const commissionMap = new Map(commissionRows.map((row) => [String(row._id), row]));
    const campaignMap = new Map(campaignRows.map((row) => [String(row._id), Number(row.count || 0)]));
    const clickMap = new Map(trackingRows.map((row) => [String(row._id), Number(row.clicks || 0)]));
    return {
      items: items.map((relationship) => {
        const influencerId = relationship.influencerId?._id;
        const metrics = commissionMap.get(String(influencerId)) || {};
        const scopedRelationshipMetrics = Boolean(paymentModelFilterValue(query) || objectId(query.campaignId) || objectId(query.productId));
        const activeCampaigns = campaignMap.get(String(influencerId)) ?? (scopedRelationshipMetrics ? 0 : relationship.activeCampaignIds?.length || 0);
        const clicks = clickMap.get(String(influencerId)) || Number(relationship.metricsSnapshot?.clicks || 0);
        const orders = Number(metrics.orders || 0);
        return {
          id: relationship._id,
          influencer: relationship.influencerId,
          influencerId,
          name: profileName(relationship.influencerId),
          username: profileUsername(relationship.influencerId),
          email: relationship.influencerId?.userId?.email || "",
          category: relationship.influencerId?.primaryCategory || relationship.influencerId?.categories?.[0] || "",
          status: relationship.status,
          activeCampaigns,
          revenueGenerated: money(metrics.revenue || 0),
          commissionPaid: money(metrics.commission || 0),
          conversionRate: clicks ? money((orders / clicks) * 100) : money(relationship.metricsSnapshot?.conversionRate || 0),
          orders,
          lastActivity: relationship.lastActivityAt || relationship.updatedAt,
        };
      }),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async saveInfluencer(userId, influencerId, saved = true) {
    const vendor = await this.getVendor(userId);
    const profile = await InfluencerProfile.findById(influencerId).lean();
    if (!profile) throw new AppError("Influencer not found", 404, "NOT_FOUND");
    const relationship = await this.upsertRelationship(vendor._id, influencerId, {
      status: saved ? "saved" : "paused",
      source: "discovery",
      saved,
    });
    await auditService.log({ actor: { _id: userId, role: "vendor" }, action: saved ? "influencer.saved" : "influencer.unsaved", entityType: "VendorInfluencerRelationship", entityId: relationship._id, metadata: { vendorId: String(vendor._id), influencerId } }).catch(() => {});
    return relationship;
  }

  async visitInfluencer(userId, influencerId) {
    const vendor = await this.getVendor(userId);
    const profile = await InfluencerProfile.findById(influencerId).lean();
    if (!profile) throw new AppError("Influencer not found", 404, "NOT_FOUND");
    const current = await VendorInfluencerRelationship.findOne({ vendorId: vendor._id, influencerId }).lean();
    const firstVisit = !current?.visited;
    if (firstVisit) {
      const discoveryPlan = await influencerCommerceEngine.discoveryLimit(vendor._id, 1);
      const visibilityLimit = Number(discoveryPlan.visibilityLimit ?? 0);
      if (visibilityLimit >= 0) {
        const visitedCount = await VendorInfluencerRelationship.countDocuments({ vendorId: vendor._id, visited: true });
        if (visitedCount >= visibilityLimit) {
          throw new AppError(`Influencer visibility limit reached for ${discoveryPlan.plan?.planName || "your plan"}. Upgrade your plan to view more influencers.`, 403, "INFLUENCER_VISIBILITY_LIMIT_REACHED", {
            visitedCount,
            visibilityLimit,
          });
        }
      }
    }
    const now = new Date();
    const relationship = await VendorInfluencerRelationship.findOneAndUpdate(
      { vendorId: vendor._id, influencerId },
      {
        $set: {
          status: current?.status && current.status !== "viewed" ? current.status : "viewed",
          source: current?.source || "discovery",
          visited: true,
          ...(firstVisit ? { firstVisitedAt: now } : {}),
          lastVisitedAt: now,
          lastActivityAt: now,
        },
        $inc: { visitCount: 1 },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    await auditService.log({ actor: { _id: userId, role: "vendor" }, action: firstVisit ? "influencer.viewed.first" : "influencer.viewed.repeat", entityType: "VendorInfluencerRelationship", entityId: relationship._id, metadata: { vendorId: String(vendor._id), influencerId } }).catch(() => {});
    return relationship;
  }

  async updateRelationship(userId, influencerId, payload = {}) {
    const vendor = await this.getVendor(userId);
    const influencerObjectId = objectId(influencerId);
    if (!influencerObjectId) throw new AppError("Influencer not found", 404, "NOT_FOUND");
    const profile = await InfluencerProfile.findById(influencerObjectId).select("_id").lean();
    if (!profile) throw new AppError("Influencer not found", 404, "NOT_FOUND");
    const relationship = await this.upsertRelationship(vendor._id, influencerObjectId, {
      status: payload.status,
      source: "manual",
      notes: payload.notes,
      blacklistReason: payload.blacklistReason,
    });
    await emitDomainEvent(SYNC_EVENTS.RELATIONSHIP_UPDATED, { vendorId: vendor._id, influencerId: influencerObjectId, status: relationship.status });
    return relationship;
  }

  async createCampaign(userId, payload = {}) {
    const vendor = await this.getVendor(userId);
    await influencerCommerceEngine.enforceCampaignLimit(vendor._id);
    let campaign;
    if (payload.influencerId) {
      campaign = await campaignService.create(userId, payload);
      await this.upsertRelationship(vendor._id, campaign.influencerId, {
        status: "invited",
        source: "campaign_invite",
        campaignId: campaign._id,
      });
      await emitDomainEvent(SYNC_EVENTS.CAMPAIGN_INVITED, { campaignId: campaign._id, vendorId: vendor._id, influencerId: campaign.influencerId });
    } else {
      const productIds = Array.isArray(payload.productIds) ? payload.productIds : [];
      const products = await Product.find({ _id: { $in: productIds }, sellerId: vendor._id }).select("_id name price discountPrice category images thumbnail").lean();
      if (products.length !== productIds.length) {
        throw new AppError("Campaign products must belong to the vendor", 403, "FORBIDDEN");
      }
      const pricing = await influencerRateCardService.calculateCampaignPricing({
        vendorId: vendor._id,
        payload,
        products,
      });
      const schedule = await campaignSchedulingService.normalizeCampaignSchedule(payload, pricing.paymentType);
      campaign = await Campaign.create({
        vendorId: vendor._id,
        title: payload.title || "",
        description: payload.description || "",
        banner: payload.banner || "",
        campaignType: pricing.campaignType || payload.campaignType || "affiliate",
        category: payload.category || "",
        country: payload.country || "",
        language: payload.language || "en",
        marketplace: {
          public: payload.marketplace?.public !== false,
          applicationDeadline: payload.marketplace?.applicationDeadline || undefined,
          availableSlots: payload.marketplace?.availableSlots || 1,
          requiredDeliverables: payload.marketplace?.requiredDeliverables || [],
          assets: payload.marketplace?.assets || [],
        },
        productIds,
        commissionPercent: pricing.commissionPercentage,
        fixedFee: pricing.fixedFee,
        paymentType: pricing.paymentType,
        attributionWindowDays: pricing.attributionDays,
        pricing: pricing.pricing,
        startDate: schedule.startDate || undefined,
        endDate: schedule.endDate || payload.deadline || undefined,
        scheduling: {
          ...(schedule.scheduling || {}),
          autoPublishEnabled: Boolean(schedule.scheduling?.settingsSnapshot?.autoPublish),
        },
        paymentModelSnapshot: pricing.paymentModel,
        influencerRateSnapshot: pricing.influencerSnapshot,
        deadline: schedule.endDate || payload.deadline,
        state: "draft",
        history: [{ state: "draft", actorId: userId, note: "Marketplace campaign created by vendor", changedAt: new Date() }],
      });
      await influencerRateCardService.attachCampaignPricing(campaign, pricing);
    }
    await influencerCommerceEngine.ensureCampaignBudgetControl(campaign, campaign.pricing?.totalBudget || payload.budget || campaign.fixedFee || 0);
    await auditService.log({ actor: { _id: userId, role: "vendor" }, action: payload.influencerId ? "campaign.invite" : "campaign.create", entityType: "Campaign", entityId: campaign._id, metadata: { influencerId: payload.influencerId || null } }).catch(() => {});
    return campaign;
  }

  async campaigns(userId, query = {}) {
    const vendor = await this.getVendor(userId);
    await deactivateExpiredTrackingCampaigns(vendor._id, userId);
    const filter = { vendorId: vendor._id };
    applyPaymentModelFilter(filter, query);
    if (query.campaignId && objectId(query.campaignId)) filter._id = objectId(query.campaignId);
    if (query.state || query.status) filter.state = query.state || query.status;
    if (query.campaignType) filter.campaignType = query.campaignType;
    if (query.category) filter.category = query.category;
    if (query.productId && objectId(query.productId)) filter.productIds = objectId(query.productId);
    if (query.startDate || query.endDate) {
      const { start, end } = parseRange(query);
      filter.createdAt = { $gte: start, $lte: end };
    }
    if (query.search) {
      const re = new RegExp(escapeRegex(query.search), "i");
      filter.$or = [{ title: re }, { description: re }, { category: re }];
    }
    const { page, limit, skip } = pageOptions(query, 20);
    const [items, total] = await Promise.all([
      Campaign.find(filter)
        .populate({ path: "influencerId", populate: { path: "userId", select: "name email username" } })
        .populate("productIds", "name images thumbnail category price discountPrice")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Campaign.countDocuments(filter),
    ]);
    const campaignIds = items.map((campaign) => campaign._id);
    const [contentCounts, commissionCounts, orderCounts, fundedEscrows, commerceDocs] = campaignIds.length
      ? await Promise.all([
        Reel.aggregate([
          { $match: { campaignId: { $in: campaignIds } } },
          { $group: { _id: "$campaignId", count: { $sum: 1 } } },
        ]),
        CommissionRecord.aggregate([
          { $match: { campaignId: { $in: campaignIds } } },
          { $group: { _id: "$campaignId", count: { $sum: 1 }, revenue: { $sum: "$gross" }, commission: { $sum: "$influencerShare" }, orders: { $sum: 1 } } },
        ]),
        Order.aggregate([
          { $match: { "attribution.campaignId": { $in: campaignIds } } },
          { $group: { _id: "$attribution.campaignId", count: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
        ]),
        CampaignEscrowWallet.find({ campaignId: { $in: campaignIds }, status: { $ne: "pending" } })
          .select("campaignId")
          .lean(),
        influencerRateCardService.getCampaignCommerceDocs(campaignIds),
      ])
      : [[], [], [], [], { paymentModels: new Map(), attributionRules: new Map() }];
    const contentCountMap = new Map(contentCounts.map((row) => [String(row._id), Number(row.count || 0)]));
    const commissionCountMap = new Map(commissionCounts.map((row) => [String(row._id), row]));
    const orderCountMap = new Map(orderCounts.map((row) => [String(row._id), row]));
    const fundedEscrowSet = new Set(fundedEscrows.map((row) => String(row.campaignId)));
    return {
      items: items.map((campaign) => {
        const applicationsCount = campaign.applications?.length || 0;
        const contentCount = contentCountMap.get(String(campaign._id)) || 0;
        const commissionStats = commissionCountMap.get(String(campaign._id)) || {};
        const paymentModel = commerceDocs.paymentModels.get(String(campaign._id)) || campaign.paymentModelSnapshot || null;
        const attributionRule = commerceDocs.attributionRules.get(String(campaign._id)) || null;
        const commissionCount = Number(commissionStats.count || 0);
        const orderStats = orderCountMap.get(String(campaign._id)) || {};
        const orderAttributionCount = Number(orderStats.count || 0);
        const deleteBlockers = [
          applicationsCount ? "creator applications" : "",
          contentCount ? "uploaded content" : "",
          commissionCount ? "commission records" : "",
          orderAttributionCount ? "sales/order attribution" : "",
          fundedEscrowSet.has(String(campaign._id)) ? "funded escrow" : "",
        ].filter(Boolean);
        return {
          ...campaign,
          paymentModel,
          attributionRule,
          endDate: campaign.deadline || campaign.marketplace?.applicationDeadline || null,
          trackingActive: campaign.state === "tracking_active" && !campaignEndReached(campaign.deadline),
          // Keep the management table aligned with Razorpay: only a fixed
          // reward is escrow-funded for hybrid campaigns; commission is earned
          // later from attributed orders and its cap remains separate.
          budget: ["fixed", "hybrid"].includes(campaign.paymentType)
            ? Number(campaign.pricing?.fixedCost || paymentModel?.fixedFee || campaign.fixedFee || 0)
            : Number(campaign.pricing?.totalBudget || paymentModel?.totalBudget || campaign.fixedFee || 0),
          revenue: money(commissionStats.revenue || orderStats.revenue || campaign.analytics?.revenue || 0),
          commission: money(commissionStats.commission || 0),
          orders: Number(commissionStats.orders || orderAttributionCount || campaign.analytics?.orders || 0),
          applicationsCount,
          approvedCreators: (campaign.applications || []).filter((app) => app.status === "approved").length + (campaign.influencerId ? 1 : 0),
          contentCount,
          commissionCount,
          orderAttributionCount,
          canDelete: deleteBlockers.length === 0,
          deleteBlockers,
          deleteDisabledReason: deleteBlockers.length ? `Cannot delete: ${deleteBlockers.join(", ")} exist.` : "",
        };
      }),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async reviewApplication(userId, campaignId, influencerId, payload = {}) {
    const vendor = await this.getVendor(userId);
    const campaignObjectId = objectId(campaignId);
    const influencerObjectId = objectId(influencerId);
    if (!campaignObjectId || !influencerObjectId) {
      throw new AppError("Invalid campaign application reference", 400, "INVALID_APPLICATION_REFERENCE");
    }
    const campaign = await Campaign.findOne({ _id: campaignObjectId, vendorId: vendor._id });
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
    if (["completed", "cancelled"].includes(campaign.state)) {
      throw new AppError("Applications cannot be reviewed after a campaign is closed or cancelled", 409, "CAMPAIGN_REVIEW_LOCKED");
    }
    const application = campaign.applications.find((item) => String(item.influencerId?._id || item.influencerId) === String(influencerId));
    if (!application) throw new AppError("Application not found", 404, "NOT_FOUND");
    const decision = payload.decision === "approve" ? "approved" : "rejected";
    if (application.status === decision) {
      return {
        campaignId: campaign._id,
        influencerId: influencerObjectId,
        status: application.status,
        reviewedAt: application.reviewedAt,
        unchanged: true,
      };
    }
    application.status = decision;
    application.reviewedAt = new Date();
    campaign.history.push({ state: decision, actorId: userId, note: payload.note || `Application ${decision}`, changedAt: new Date() });
    if (decision === "approved") {
      const approvedAt = new Date();
      if (!campaign.influencerId) campaign.influencerId = influencerObjectId;
      if (["fixed", "hybrid"].includes(campaign.paymentType)) {
        campaign.state = "accepted";
        campaign.fixedPaymentWorkflow = {
          ...(campaign.fixedPaymentWorkflow || {}),
          status: "accepted_awaiting_funding",
          contentEnabled: false,
          acceptedAt: approvedAt,
          lastTransitionAt: approvedAt,
        };
      } else if (campaign.state === "draft") {
        campaign.state = "active";
        if (!campaign.startDate) campaign.startDate = approvedAt;
        campaign.scheduling = { ...(campaign.scheduling || {}), activatedAt: approvedAt };
      }
    }
    await campaign.save();
    if (decision === "approved") {
      await upsertProductAssignments({ campaign, influencerId: influencerObjectId, status: "approved", source: "campaign_application", actorId: userId });
      await influencerRateCardService.lockCampaignContract(campaign._id, {
        influencerId: influencerObjectId,
        actorId: userId,
        source: "vendor_application_approval",
      });
    }
    await this.upsertRelationship(vendor._id, influencerId, {
      status: decision === "approved" ? "approved" : "paused",
      source: "campaign_application",
      campaignId: campaign._id,
    });
    await notifyInfluencer(influencerId, {
      title: decision === "approved" ? "Campaign approved" : "Campaign application update",
      message: decision === "approved" ? "Your campaign application was approved." : "Your campaign application was not approved.",
      referenceId: campaign._id,
      meta: { campaignId: campaign._id, decision, note: payload.note || "" },
    });
    await emitDomainEvent(decision === "approved" ? SYNC_EVENTS.CAMPAIGN_APPLICATION_APPROVED : SYNC_EVENTS.CAMPAIGN_APPLICATION_REJECTED, {
      campaignId: campaign._id,
      vendorId: vendor._id,
      influencerId,
    });
    await auditService.log({ actor: { _id: userId, role: "vendor" }, action: `campaign.application.${decision}`, entityType: "Campaign", entityId: campaign._id, metadata: { influencerId, note: payload.note || "" } }).catch(() => {});
    return {
      campaignId: campaign._id,
      influencerId: influencerObjectId,
      status: decision,
      reviewedAt: application.reviewedAt,
      campaignState: campaign.state,
    };
  }

  async updateCampaignStatus(userId, campaignId, payload = {}) {
    const vendor = await this.getVendor(userId);
    await deactivateExpiredTrackingCampaigns(vendor._id, userId);
    const action = String(payload.action || "").toLowerCase();
    const state = action === "pause" ? "paused" : action === "close" ? "completed" : action === "activate" ? "active" : payload.state;
    if (!CAMPAIGN_STATES.includes(state)) {
      throw new AppError("Invalid campaign state", 400, "INVALID_STATE");
    }
    const current = await Campaign.findOne({ _id: campaignId, vendorId: vendor._id }).select("state paymentType deadline").lean();
    if (!current) throw new AppError("Campaign not found", 404, "NOT_FOUND");
    if (campaignEndReached(current.deadline) && ["tracking_active", "expired"].includes(String(current.state || "")) && ["active", "paused", "tracking_active"].includes(state)) {
      throw new AppError("Campaign end date has passed. Tracking is inactive for this campaign.", 409, "CAMPAIGN_TRACKING_EXPIRED");
    }
    if (state === "active" && ["fixed", "hybrid"].includes(current.paymentType)) {
      if (["proposed", "invitation_sent", "pending_review"].includes(current.state)) {
        throw new AppError("The influencer must accept this fixed-payment campaign before activation", 409, "CAMPAIGN_ACCEPTANCE_REQUIRED");
      }
      const funded = await CampaignEscrowWallet.exists({
        campaignId,
        vendorId: vendor._id,
        status: { $in: ["funded", "partially_released", "fully_released", "completed"] },
      });
      if (!funded) {
        throw new AppError("Fixed payment campaigns must be funded before activation", 409, "ESCROW_FUNDING_REQUIRED");
      }
    }
    if (state === "completed" && ["fixed", "hybrid"].includes(current.paymentType)) {
      const escrow = await CampaignEscrowWallet.findOne({ campaignId, vendorId: vendor._id })
        .select("amountRemaining")
        .lean();
      if (escrow && Number(escrow.amountRemaining || 0) > 0) {
        throw new AppError(
          "Release approved earnings or refund the remaining escrow before closing this campaign",
          409,
          "ESCROW_BALANCE_REMAINS"
        );
      }
    }
    if (current.state === state) return current;
    if (["completed", "cancelled"].includes(current.state) && state !== current.state) {
      throw new AppError("Closed campaigns cannot be reopened. Create a new campaign instead.", 409, "CAMPAIGN_CLOSED_LOCKED");
    }
    const campaign = await Campaign.findOneAndUpdate(
      { _id: campaignId, vendorId: vendor._id },
      { $set: { state }, $push: { history: { state, actorId: userId, note: payload.note || `Campaign ${state}`, changedAt: new Date() } } },
      { returnDocument: "after" }
    );
    if (["fixed", "hybrid"].includes(campaign.paymentType)) {
      await CampaignEscrowWallet.updateOne(
        { campaignId: campaign._id, vendorId: vendor._id },
        {
          $set: {
            campaignStatus: state,
            ...(state === "completed" ? { status: "completed", completedAt: new Date() } : {}),
          },
        }
      );
    }
    await CampaignStatusHistory.create({
      campaignId: campaign._id,
      oldStatus: current.state,
      newStatus: state,
      changedBy: userId,
      changedByRole: "vendor",
      reason: payload.note || `Campaign ${state}`,
      metadata: { action },
    }).catch(() => {});
    await auditService.log({ actor: { _id: userId, role: "vendor" }, action: "campaign.status.update", entityType: "Campaign", entityId: campaign._id, metadata: { oldStatus: current.state, newStatus: state } }).catch(() => {});
    return campaign;
  }

  async deleteCampaign(userId, campaignId) {
    const vendor = await this.getVendor(userId);
    const campaign = await Campaign.findOne({ _id: campaignId, vendorId: vendor._id });
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");

    const [commissionCount, contentCount, orderAttributionCount, fundedEscrow] = await Promise.all([
      CommissionRecord.countDocuments({ campaignId: campaign._id }),
      Reel.countDocuments({ campaignId: campaign._id }),
      Order.countDocuments({ "attribution.campaignId": campaign._id }),
      CampaignEscrowWallet.exists({ campaignId: campaign._id, status: { $ne: "pending" } }),
    ]);
    const applicationsCount = (campaign.applications || []).length;
    const deleteBlockers = [
      applicationsCount ? "creator applications" : "",
      contentCount ? "uploaded content" : "",
      commissionCount ? "commission records" : "",
      orderAttributionCount ? "sales/order attribution" : "",
      fundedEscrow ? "funded escrow" : "",
    ].filter(Boolean);
    if (deleteBlockers.length) {
      throw new AppError(
        `Campaign has ${deleteBlockers.join(", ")}. Close the campaign instead of deleting it.`,
        409,
        "CAMPAIGN_DELETE_LOCKED"
      );
    }

    await Campaign.deleteOne({ _id: campaign._id, vendorId: vendor._id });
    await VendorInfluencerRelationship.updateMany(
      { vendorId: vendor._id, activeCampaignIds: campaign._id },
      { $pull: { activeCampaignIds: campaign._id } }
    );
    await auditService.log({
      actor: { _id: userId, role: "vendor" },
      action: "campaign.delete",
      entityType: "Campaign",
      entityId: campaign._id,
      metadata: { title: campaign.title, accidentalDelete: true },
    }).catch(() => {});
    return { deleted: true, campaignId: campaign._id };
  }

  async products(userId, query = {}) {
    const vendor = await this.getVendor(userId);
    const { page, limit, skip } = pageOptions(query, 20);
    const filter = { sellerId: vendor._id };
    if (query.productId && objectId(query.productId)) filter._id = objectId(query.productId);
    if (query.category) filter.category = query.category;
    if (query.status) {
      let productStatus = String(query.status).toUpperCase();
      if (productStatus === "ACTIVE") productStatus = "APPROVED";
      if (["APPROVED", "PENDING", "REJECTED", "DRAFT", "ACTIVE", "INACTIVE"].includes(productStatus)) {
        filter.status = productStatus;
      }
    }
    if (query.search) filter.name = new RegExp(escapeRegex(query.search), "i");
    const campaignFilter = {
      vendorId: vendor._id,
      ...(query.campaignId && objectId(query.campaignId) ? { _id: objectId(query.campaignId) } : {}),
    };
    applyPaymentModelFilter(campaignFilter, query);
    if (query.productId && objectId(query.productId)) campaignFilter.productIds = objectId(query.productId);
    const campaignProducts = await Campaign.find(campaignFilter).select("productIds state").lean();
    const campaignIds = campaignProducts.map((campaign) => campaign._id);
    const promotedProductIds = [...new Set(campaignProducts.flatMap((campaign) => (campaign.productIds || []).map(String)))];
    if (query.promotedOnly) {
      filter._id = { $in: promotedProductIds.map((id) => objectId(id)).filter(Boolean) };
      if (query.productId && objectId(query.productId)) {
        filter._id = promotedProductIds.includes(String(query.productId)) ? objectId(query.productId) : { $in: [] };
      }
    }
    const commissionMatch = { vendorId: vendor._id, campaignId: { $in: campaignIds } };
    if (query.productId && objectId(query.productId)) commissionMatch["metadata.productId"] = objectId(query.productId);
    if (query.influencerId && objectId(query.influencerId)) commissionMatch.influencerId = objectId(query.influencerId);
    if (query.startDate || query.endDate) {
      const { start, end } = parseRange(query);
      commissionMatch.createdAt = { $gte: start, $lte: end };
    }
    const trackingMatch = { productId: { $exists: true, $ne: null }, campaignId: { $in: campaignIds } };
    if (query.productId && objectId(query.productId)) trackingMatch.productId = objectId(query.productId);
    if (query.influencerId && objectId(query.influencerId)) trackingMatch.influencerId = objectId(query.influencerId);
    if (query.startDate || query.endDate) {
      const { start, end } = parseRange(query);
      trackingMatch.createdAt = { $gte: start, $lte: end };
    }
    const orderProductMatch = {
      sellerId: vendor._id,
      "attribution.campaignId": { $in: campaignIds },
      "attribution.productId": { $exists: true, $ne: null },
    };
    if (query.productId && objectId(query.productId)) orderProductMatch["attribution.productId"] = objectId(query.productId);
    if (query.influencerId && objectId(query.influencerId)) orderProductMatch["attribution.influencerId"] = objectId(query.influencerId);
    if (query.startDate || query.endDate) {
      const { start, end } = parseRange(query);
      orderProductMatch.createdAt = { $gte: start, $lte: end };
    }
    const [products, total, productStats, clickStats, orderStats] = await Promise.all([
      Product.find(filter).select("name images thumbnail category price discountPrice stock status analytics").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
      CommissionRecord.aggregate([
        { $match: commissionMatch },
        { $group: { _id: "$metadata.productId", revenue: { $sum: "$gross" }, commission: { $sum: "$influencerShare" }, orders: { $sum: 1 } } },
      ]),
      CampaignAffiliateClick.aggregate([
        { $match: trackingMatch },
        { $group: { _id: "$productId", clicks: { $sum: 1 }, influencers: { $addToSet: "$influencerId" } } },
      ]),
      Order.aggregate([
        { $match: orderProductMatch },
        { $group: { _id: "$attribution.productId", revenue: { $sum: "$totalAmount" }, orders: { $sum: 1 } } },
      ]),
    ]);
    const campaignProductSet = new Set(campaignProducts.flatMap((campaign) => (campaign.productIds || []).map(String)));
    const campaignCountMap = campaignProducts.reduce((map, campaign) => {
      (campaign.productIds || []).forEach((productId) => {
        const key = String(productId);
        map.set(key, (map.get(key) || 0) + 1);
      });
      return map;
    }, new Map());
    const activeCampaignMap = campaignProducts.reduce((map, campaign) => {
      if (!["active", "accepted", "proposed"].includes(campaign.state)) return map;
      (campaign.productIds || []).forEach((productId) => {
        const key = String(productId);
        map.set(key, (map.get(key) || 0) + 1);
      });
      return map;
    }, new Map());
    const statMap = new Map(productStats.map((row) => [String(row._id), row]));
    const clickMap = new Map(clickStats.map((row) => [String(row._id), row]));
    const orderMap = new Map(orderStats.map((row) => [String(row._id), row]));
    return {
      items: products.map((product) => {
        const stat = statMap.get(String(product._id)) || {};
        const clickStat = clickMap.get(String(product._id)) || {};
        const orderStat = orderMap.get(String(product._id)) || {};
        const clicks = Number(clickStat.clicks || product.analytics?.views || 0);
        const orders = Number(stat.orders || orderStat.orders || 0);
        return {
          id: product._id,
          product,
          name: product.name,
          image: productImage(product),
          category: product.category,
          available: product.status === "APPROVED" && product.stock > 0,
          promoted: campaignProductSet.has(String(product._id)),
          activeCampaigns: activeCampaignMap.get(String(product._id)) || 0,
          campaignCount: campaignCountMap.get(String(product._id)) || 0,
          status: product.status,
          stock: Number(product.stock || 0),
          price: Number(product.discountPrice || product.price || 0),
          influencers: Array.isArray(clickStat.influencers) ? clickStat.influencers.filter(Boolean).length : 0,
          clicks,
          orders,
          revenue: money(stat.revenue || orderStat.revenue || 0),
          commission: money(stat.commission || 0),
          ctr: clicks ? money((orders / clicks) * 100) : 0,
          conversionRate: clicks ? money((orders / clicks) * 100) : 0,
        };
      }),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async contentApprovals(userId, query = {}) {
    const vendor = await this.getVendor(userId);
    const campaignFilter = { vendorId: vendor._id };
    if (query.campaignId && objectId(query.campaignId)) campaignFilter._id = objectId(query.campaignId);
    if (query.category) campaignFilter.category = query.category;
    if (query.productId && objectId(query.productId)) campaignFilter.productIds = objectId(query.productId);
    const campaignIds = await campaignIdsForFilter(campaignFilter);
    const { page, limit, skip } = pageOptions(query, 20);
    const filter = { campaignId: { $in: campaignIds } };
    if (query.startDate || query.endDate) {
      const { start, end } = parseRange(query);
      filter.createdAt = { $gte: start, $lte: end };
    }
    if (query.status) {
      const statusMap = {
        active: "published",
        approved: "published",
        pending: "pending_review",
      };
      filter.state = statusMap[String(query.status).toLowerCase()] || query.status;
    }
    if (!query.status && query.queue === "pending") filter.state = { $in: ["uploaded", "pending_review"] };
    if (query.search) {
      const re = new RegExp(escapeRegex(query.search), "i");
      const matchingProfiles = await InfluencerProfile.find({
        $or: [{ displayName: re }, { influencerCode: re }, { primaryCategory: re }, { categories: re }],
      }).select("_id").limit(100).lean();
      filter.$or = [
        { title: re },
        { caption: re },
        { contentType: re },
        ...(matchingProfiles.length ? [{ influencerId: { $in: matchingProfiles.map((profile) => profile._id) } }] : []),
      ];
    }
    const [items, total] = await Promise.all([
      Reel.find(filter)
        .populate({ path: "influencerId", populate: { path: "userId", select: "name email username" } })
        .populate("campaignId", "title campaignType state")
        .populate("productIds", "name images thumbnail category")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Reel.countDocuments(filter),
    ]);
    return {
      items: items.map((item) => ({
        id: item._id,
        creator: item.influencerId,
        creatorName: profileName(item.influencerId),
        creatorUsername: profileUsername(item.influencerId),
        creatorEmail: item.influencerId?.userId?.email || "",
        campaign: item.campaignId,
        products: (item.productIds || []).map((product) => ({
          id: product._id,
          name: product.name,
          category: product.category || "",
          image: productImage(product),
        })),
        contentType: item.contentType,
        submittedDate: item.createdAt,
        status: item.state,
        title: item.title || item.caption || "Untitled content",
        url: item.videoUrl,
        thumbnailUrl: item.thumbnailUrl || item.videoUrl,
        metrics: item.metrics || {},
        moderation: item.moderation || {},
      })),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async reviewContent(userId, reelId, payload = {}) {
    const action = payload.decision === "approve" ? "approve" : payload.decision === "reject" ? "reject" : "reject";
    const updated = await reelService.publish({ sub: userId, role: "vendor" }, reelId, {
      action,
      notes: payload.note || payload.requestedChanges || "",
    });
    if (payload.decision === "changes") {
      updated.state = "pending_review";
      updated.moderation.notes = payload.requestedChanges || payload.note || "";
      await updated.save();
    }
    const eventName = payload.decision === "approve" ? SYNC_EVENTS.CONTENT_APPROVED : payload.decision === "changes" ? SYNC_EVENTS.CONTENT_CHANGES_REQUESTED : SYNC_EVENTS.CONTENT_REJECTED;
    await notifyInfluencer(updated.influencerId, {
      title: payload.decision === "approve" ? "Content approved" : "Content needs updates",
      message: payload.note || payload.requestedChanges || "Your campaign content was reviewed.",
      referenceId: updated._id,
      meta: { reelId: updated._id, campaignId: updated.campaignId, decision: payload.decision },
    });
    await emitDomainEvent(eventName, { reelId: updated._id, campaignId: updated.campaignId, influencerId: updated.influencerId });
    await auditService.log({ actor: { _id: userId, role: "vendor" }, action: `content.${payload.decision || "review"}`, entityType: "Reel", entityId: updated._id, metadata: { note: payload.note || payload.requestedChanges || "" } }).catch(() => {});
    return updated;
  }

  async performance(userId, query = {}) {
    const vendor = await this.getVendor(userId);
    const { page, limit, skip } = pageOptions(query, 20);
    const campaignFilter = { vendorId: vendor._id };
    if (query.campaignId && objectId(query.campaignId)) campaignFilter._id = objectId(query.campaignId);
    if (query.productId && objectId(query.productId)) campaignFilter.productIds = objectId(query.productId);
    if (query.category) campaignFilter.category = query.category;
    const campaignIds = await campaignIdsForFilter(campaignFilter);

    const commissionMatch = { vendorId: vendor._id, campaignId: { $in: campaignIds } };
    const trackingMatch = { campaignId: { $in: campaignIds } };
    const reelMatch = { campaignId: { $in: campaignIds } };
    if (query.productId && objectId(query.productId)) {
      commissionMatch["metadata.productId"] = objectId(query.productId);
      trackingMatch.productId = objectId(query.productId);
    }
    if (query.influencerId && objectId(query.influencerId)) {
      commissionMatch.influencerId = objectId(query.influencerId);
      trackingMatch.influencerId = objectId(query.influencerId);
      reelMatch.influencerId = objectId(query.influencerId);
    }
    if (query.startDate || query.endDate) {
      const { start, end } = parseRange(query);
      commissionMatch.createdAt = { $gte: start, $lte: end };
      trackingMatch.createdAt = { $gte: start, $lte: end };
      reelMatch.createdAt = { $gte: start, $lte: end };
    }

    const relationshipFilter = { vendorId: vendor._id };
    if (query.status && ["saved", "invited", "applied", "approved", "active", "paused", "blacklisted"].includes(String(query.status))) {
      relationshipFilter.status = query.status;
    }
    if (query.influencerId && objectId(query.influencerId)) {
      relationshipFilter.influencerId = objectId(query.influencerId);
    }

    const profileClauses = [];
    if (query.category) profileClauses.push({ $or: [{ categories: query.category }, { primaryCategory: query.category }, { secondaryCategories: query.category }] });
    if (query.search) {
      const re = new RegExp(escapeRegex(query.search), "i");
      profileClauses.push({ $or: [{ displayName: re }, { influencerCode: re }, { primaryCategory: re }, { categories: re }] });
    }
    let profileIdFilter = null;
    if (profileClauses.length) {
      const profileFilter = profileClauses.length === 1 ? profileClauses[0] : { $and: profileClauses };
      const profiles = await InfluencerProfile.find(profileFilter).select("_id").lean();
      profileIdFilter = new Set(profiles.map((profile) => String(profile._id)));
      const profileIds = profiles.map((profile) => profile._id);
      commissionMatch.influencerId = commissionMatch.influencerId || { $in: profileIds };
      trackingMatch.influencerId = trackingMatch.influencerId || { $in: profileIds };
      reelMatch.influencerId = reelMatch.influencerId || { $in: profileIds };
      relationshipFilter.influencerId = { $in: profileIds };
    }
    if (relationshipFilter.status) {
      const scopedRelationships = await VendorInfluencerRelationship.find(relationshipFilter).select("influencerId").lean();
      const scopedInfluencerIds = scopedRelationships.map((relationship) => relationship.influencerId).filter(Boolean);
      commissionMatch.influencerId = commissionMatch.influencerId || { $in: scopedInfluencerIds };
      trackingMatch.influencerId = trackingMatch.influencerId || { $in: scopedInfluencerIds };
      reelMatch.influencerId = reelMatch.influencerId || { $in: scopedInfluencerIds };
    }

    const [commissionRows, trackingRows, reelRows, relationships] = await Promise.all([
      CommissionRecord.aggregate([
        { $match: commissionMatch },
        { $group: { _id: "$influencerId", revenue: { $sum: "$gross" }, commission: { $sum: "$influencerShare" }, orders: { $sum: 1 }, platformShare: { $sum: "$platformShare" } } },
      ]),
      CampaignAffiliateClick.aggregate([
        { $match: trackingMatch },
        { $group: { _id: "$influencerId", clicks: { $sum: 1 } } },
      ]),
      Reel.aggregate([
        { $match: reelMatch },
        {
          $group: {
            _id: "$influencerId",
            reelClicks: { $sum: "$metrics.clicks" },
            views: { $sum: "$metrics.views" },
            contentCount: { $sum: 1 },
            engagement: { $sum: { $add: ["$metrics.likes", "$metrics.comments", "$metrics.shares", "$metrics.saves"] } },
          },
        },
      ]),
      VendorInfluencerRelationship.find(relationshipFilter).lean(),
    ]);

    const performanceMap = new Map();
    function ensure(id) {
      if (!id) return null;
      const key = String(id);
      if (profileIdFilter && !profileIdFilter.has(key)) return null;
      if (!performanceMap.has(key)) performanceMap.set(key, { influencerId: id });
      return performanceMap.get(key);
    }
    commissionRows.forEach((row) => Object.assign(ensure(row._id) || {}, {
      revenueGenerated: money(row.revenue),
      commissionPaid: money(row.commission),
      platformShare: money(row.platformShare),
      ordersGenerated: Number(row.orders || 0),
      conversions: Number(row.orders || 0),
    }));
    trackingRows.forEach((row) => {
      const item = ensure(row._id);
      if (item) item.trackingClicks = Number(row.clicks || 0);
    });
    reelRows.forEach((row) => Object.assign(ensure(row._id) || {}, {
      reelClicks: Number(row.reelClicks || 0),
      views: Number(row.views || 0),
      engagement: Number(row.engagement || 0),
      contentCount: Number(row.contentCount || 0),
    }));
    relationships.forEach((relationship) => Object.assign(ensure(relationship.influencerId) || {}, {
      relationshipId: relationship._id,
      status: relationship.status,
      lastActivity: relationship.lastActivityAt || relationship.updatedAt,
    }));

    const merged = [...performanceMap.values()]
      .map((row) => {
        const clicks = Number(row.trackingClicks || row.reelClicks || 0);
        const orders = Number(row.ordersGenerated || 0);
        const revenue = Number(row.revenueGenerated || 0);
        const commission = Number(row.commissionPaid || 0);
        return {
          ...row,
          clicks,
          ordersGenerated: orders,
          conversions: Number(row.conversions || orders),
          revenueGenerated: money(revenue),
          commissionPaid: money(commission),
          ctr: clicks ? money((orders / clicks) * 100) : 0,
          roi: commission ? money(((revenue - commission) / commission) * 100) : 0,
          averageOrderValue: orders ? money(revenue / orders) : 0,
          score: money(revenue * 0.45 + orders * 25 + Number(row.engagement || 0) * 0.1 + clicks),
        };
      })
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));

    const pagedRows = merged.slice(skip, skip + limit);
    const profiles = pagedRows.length
      ? await InfluencerProfile.find({ _id: { $in: pagedRows.map((row) => row.influencerId).filter(Boolean) } }).populate("userId", "name email username").lean()
      : [];
    const profileMap = new Map(profiles.map((profile) => [String(profile._id), profile]));
    return {
      items: pagedRows.map((row, index) => {
        const profile = profileMap.get(String(row.influencerId));
        return {
          ...row,
          rank: skip + index + 1,
          name: profileName(profile),
          username: profileUsername(profile),
          email: profile?.userId?.email || "",
          category: profile?.primaryCategory || profile?.categories?.[0] || "",
        };
      }),
      summary: {
        creators: merged.length,
        revenue: money(merged.reduce((sum, row) => sum + Number(row.revenueGenerated || 0), 0)),
        commission: money(merged.reduce((sum, row) => sum + Number(row.commissionPaid || 0), 0)),
        clicks: merged.reduce((sum, row) => sum + Number(row.clicks || 0), 0),
        orders: merged.reduce((sum, row) => sum + Number(row.ordersGenerated || 0), 0),
      },
      pagination: { total: merged.length, page, limit, pages: Math.ceil(merged.length / limit) || 1 },
    };
  }

}

module.exports = new InfluencerCommerceVendorService();
