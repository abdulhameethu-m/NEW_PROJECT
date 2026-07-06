const mongoose = require("mongoose");
const auditService = require("../../services/audit.service");
const notificationService = require("../../services/notification.service");
const { isInfluencerCommerceEnabled, invalidateInfluencerCommerceConfigCache } = require("../../services/influencer-commerce-config.service");
const influencerRateCardService = require("../../services/influencer-rate-card.service");
const analyticsAggregator = require("../analytics/service");
const { AppError } = require("../../utils/AppError");
const { Campaign } = require("../campaign/model");
const {
  InfluencerProfile,
  InfluencerApplication,
  InfluencerSocialAccount,
  InfluencerBusinessProfile,
  InfluencerPaymentProfile,
  InfluencerProductAssignment,
} = require("../influencer/model");
const {
  AffiliateLink,
  AffiliateConversion,
  CampaignAffiliateAttribution,
  CampaignAffiliateClick,
  CommissionRecord,
  InfluencerWallet,
  InfluencerPayoutAccount,
  InfluencerLedger,
  InfluencerWithdrawalRequest,
} = require("../commission/models");
const { TrackingSession } = require("../tracking/model");
const { emitDomainEvent } = require("../events/event-bus");

async function upsertProductAssignments({ campaign, influencerId, status = "approved", source = "admin_manual", actorId = null }) {
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
const { Vendor } = require("../../models/Vendor");
const { Product } = require("../../models/Product");
const { Order } = require("../../models/Order");
const { AuditLog } = require("../../models/AuditLog");
const PlatformConfig = require("../../models/PlatformConfig");
const CampaignFeeConfiguration = require("../../models/CampaignFeeConfiguration");
const CampaignEscrowWallet = require("../../models/CampaignEscrowWallet");
const PlatformRevenueTransaction = require("../../models/PlatformRevenueTransaction");
const { VendorInfluencerRelationship } = require("../influencerCommerce/model");
const {
  VendorSubscription,
  SubscriptionPayment,
  SubscriptionRevenue,
  VendorSubscriptionChange,
  SubscriptionCreditWallet,
} = require("../../models/InfluencerCommerceConfig");

function oid(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function oidList(values = []) {
  const ids = [];
  values.flat().forEach((value) => {
    const id = oid(value);
    if (id) ids.push(id);
  });
  return ids;
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pageOptions(query = {}, fallback = 20) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || fallback));
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

function parseRange(query = {}) {
  const now = new Date();
  let end = query.endDate ? new Date(query.endDate) : now;
  if (Number.isNaN(end.getTime())) end = now;
  let start = query.startDate ? new Date(query.startDate) : addDays(now, -29);
  if (Number.isNaN(start.getTime())) start = addDays(now, -29);
  return { start: startOfDay(start), end };
}

function money(value) {
  return Number(Number(value || 0).toFixed(2));
}

const REVENUE_MODEL_LABELS = {
  fixed: "Fixed Payment",
  commission: "Commission",
  hybrid: "Hybrid",
  free_product: "Free Product",
};

function revenueModel(value = "commission") {
  const next = String(value || "commission").toLowerCase();
  return REVENUE_MODEL_LABELS[next] ? next : "commission";
}

function selectedRevenueModel(value = "all") {
  const next = String(value || "all").toLowerCase();
  return next === "all" || REVENUE_MODEL_LABELS[next] ? next : "all";
}

function campaignBudget(campaign = {}, fallback = 0) {
  const pricing = campaign.pricing || {};
  return money(pricing.totalBudget || pricing.fixedCost || campaign.fixedFee || fallback || 0);
}

function buckets(start, end) {
  const rows = [];
  const cursor = startOfDay(start);
  const last = startOfDay(end);
  while (cursor <= last) {
    rows.push({ date: cursor.toISOString().slice(0, 10), revenue: 0, commission: 0, campaigns: 0, influencers: 0, vendors: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return rows;
}

function influencerName(profile = {}) {
  return profile.displayName || profile.userId?.name || profile.userId?.email || "Influencer";
}

function vendorName(vendor = {}) {
  return vendor.shopName || vendor.companyName || vendor.userId?.name || "Vendor";
}

function productImage(product = {}) {
  return product.thumbnail || product.images?.find((image) => image?.isPrimary)?.url || product.images?.[0]?.url || "";
}

function normalizeSort(sort = "", fallback = { createdAt: -1 }) {
  const map = {
    revenue: { "analytics.revenue": -1, createdAt: -1 },
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    followers: { followers: -1 },
    commission: { influencerShare: -1 },
  };
  return map[sort] || fallback;
}

function normalizeCampaignState(payload = {}) {
  const action = String(payload.action || "").toLowerCase();
  const status = String(payload.status || "").toLowerCase();
  const state = String(payload.state || "").toLowerCase();
  const requested = action || status || state;
  const map = {
    pause: "cancelled",
    paused: "cancelled",
    close: "completed",
    closed: "completed",
    complete: "completed",
    activate: "active",
    active: "active",
    draft: "draft",
    proposed: "proposed",
    accepted: "accepted",
    completed: "completed",
    cancelled: "cancelled",
  };
  return map[requested] || "";
}

function campaignEndDate(campaign = {}) {
  return campaign.deadline || campaign.marketplace?.applicationDeadline || campaign.termsFrozen?.deadline || null;
}

function isDateReached(value, now = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() <= now.getTime();
}

function frontendBaseUrl() {
  return String(process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");
}

function affiliateUrl(row = {}) {
  const productId = row.productId?._id || row.productId || "";
  const trackingCode = row.trackingCode || row.trackingId || "";
  const canonicalProductPath = productId ? `/product/${productId}${trackingCode ? `?ref=${encodeURIComponent(trackingCode)}` : ""}` : "";
  const destination = String(row.destinationUrl || "").trim();
  const path = canonicalProductPath || destination;
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${frontendBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function linkTrackingStatus(row = {}) {
  const campaign = row.campaignId || {};
  if (row.trackingStatus) return row.trackingStatus;
  if (row.status === "active" && campaign.state === "tracking_active" && campaign.commissionWorkflow?.trackingActive !== false && !isDateReached(campaignEndDate(campaign))) {
    return "active";
  }
  if (row.status === "expired" || isDateReached(row.expiresAt) || isDateReached(campaignEndDate(campaign))) return "expired";
  return "inactive";
}

function linkActionAvailability(row = {}) {
  const campaign = row.campaignId || {};
  const campaignState = String(campaign.state || "").toLowerCase();
  const expired = linkTrackingStatus(row) === "expired" || isDateReached(campaignEndDate(campaign));
  const blockedState = ["completed", "closed", "cancelled", "refunded", "expired"].includes(campaignState);
  const campaignTrackingActive = campaignState === "tracking_active" && campaign.commissionWorkflow?.trackingActive !== false;
  const productState = String(row.productId?.status || row.productId?.approvalStatus || "").toLowerCase();
  const productActive = !row.productId || (row.productId.isActive !== false && !["blocked", "rejected", "inactive", "disabled", "archived"].includes(productState));
  const vendorActive = !row.vendorId || !["blocked", "suspended", "rejected"].includes(String(row.vendorId.status || "").toLowerCase());
  const influencerActive = !row.influencerId || !["blocked", "suspended", "rejected"].includes(String(row.influencerId.state || "").toLowerCase());
  const canActivate = !expired && !blockedState && campaignTrackingActive && productActive && vendorActive && influencerActive && row.status !== "active";
  const canDeactivate = !expired && !blockedState && row.status === "active";
  const disabledReason = expired
    ? "Campaign ended. Affiliate link expired automatically."
    : blockedState
      ? `Campaign is ${campaignState}.`
      : !campaignTrackingActive
        ? "Campaign tracking is inactive."
        : !productActive
          ? "Product is inactive."
          : !vendorActive
            ? "Vendor is inactive."
            : !influencerActive
              ? "Influencer is inactive."
              : "";
  return { canActivate, canDeactivate, disabledReason, expired, blockedState };
}

function presentAffiliateLink(row = {}, metrics = {}, history = []) {
  const campaign = row.campaignId || {};
  const product = row.productId || {};
  const vendor = row.vendorId || campaign.vendorId || {};
  const influencer = row.influencerId || {};
  const trackingStatus = linkTrackingStatus(row);
  const actions = linkActionAvailability(row);
  const url = affiliateUrl(row);
  return {
    id: row._id,
    affiliateId: row._id,
    campaignId: campaign._id || row.campaignId,
    campaignName: campaign.title || "",
    campaignStatus: campaign.state || "",
    campaignType: campaign.campaignType || "",
    paymentModel: campaign.paymentType || campaign.paymentModelSnapshot?.paymentType || "",
    vendorId: vendor._id || row.vendorId,
    vendorName: vendorName(vendor),
    influencerId: influencer._id || row.influencerId,
    influencerName: influencerName(influencer),
    productId: product._id || row.productId,
    productName: product.name || "",
    productStatus: product.status || "",
    affiliateLink: url,
    originalProductUrl: product._id ? `${frontendBaseUrl()}/product/${product._id}` : "",
    shortUrl: row.metadata?.shortUrl || "",
    trackingToken: row.trackingCode || row.trackingId || "",
    trackingCode: row.trackingCode || "",
    trackingId: row.trackingId || "",
    status: row.status || "",
    trackingStatus,
    disabledByAdmin: Boolean(row.disabledByAdmin),
    disabledReason: row.disabledReason || actions.disabledReason || "",
    createdAt: row.createdAt,
    expiryDate: row.expiresAt || campaignEndDate(campaign),
    expiresAt: row.expiresAt || campaignEndDate(campaign),
    activatedAt: row.activatedAt,
    disabledAt: row.disabledAt,
    expiredAt: row.expiredAt,
    clicks: Number(metrics.clicks ?? row.totalClicks ?? 0),
    uniqueClicks: Number(metrics.uniqueClicks ?? row.uniqueClicks ?? 0),
    orders: Number(metrics.orders ?? row.totalOrders ?? 0),
    revenue: money(metrics.revenue ?? row.totalRevenue ?? 0),
    commission: money(metrics.commission ?? row.totalCommission ?? 0),
    conversionRate: Number(metrics.clicks || row.totalClicks || 0) ? money((Number(metrics.orders || row.totalOrders || 0) / Number(metrics.clicks || row.totalClicks || 1)) * 100) : 0,
    roi: Number(metrics.commission || row.totalCommission || 0) ? money(((Number(metrics.revenue || row.totalRevenue || 0) - Number(metrics.commission || row.totalCommission || 0)) / Number(metrics.commission || row.totalCommission || 1)) * 100) : 0,
    lastClick: metrics.lastClick || row.lastClick || row.lastClickedAt,
    lastOrder: metrics.lastOrder || row.lastOrder,
    lastCommission: metrics.lastCommission || row.lastCommission,
    actions,
    history,
  };
}

class AdminInfluencerCommerceService {
  dateMatch(query = {}) {
    const { start, end } = parseRange(query);
    return { createdAt: { $gte: start, $lte: end } };
  }

  campaignFilter(query = {}) {
    const filter = {};
    if (oid(query.vendorId)) filter.vendorId = oid(query.vendorId);
    if (oid(query.influencerId)) {
      filter.$or = [{ influencerId: oid(query.influencerId) }, { "applications.influencerId": oid(query.influencerId) }];
    }
    if (query.status || query.state) filter.state = query.status || query.state;
    if (query.campaignType) filter.campaignType = query.campaignType;
    if (query.category) filter.category = query.category;
    if (query.search) {
      const re = new RegExp(escapeRegex(query.search), "i");
      filter.$and = [{ $or: [{ title: re }, { description: re }, { category: re }] }];
    }
    return filter;
  }

  commissionFilter(query = {}) {
    const filter = { ...this.dateMatch(query) };
    if (oid(query.vendorId)) filter.vendorId = oid(query.vendorId);
    if (oid(query.influencerId)) filter.influencerId = oid(query.influencerId);
    if (oid(query.campaignId)) filter.campaignId = oid(query.campaignId);
    if (query.status || query.state) filter.state = String(query.status || query.state).toUpperCase();
    return filter;
  }

  async applyCommissionSearch(filter, query = {}) {
    const search = String(query.search || "").trim();
    if (!search) return filter;
    const re = new RegExp(escapeRegex(search), "i");
    const [orders, campaigns, vendors, influencers] = await Promise.all([
      Order.find({ $or: [{ orderNumber: re }, { status: re }, { paymentStatus: re }] }).select("_id").limit(100).lean(),
      Campaign.find({ $or: [{ title: re }, { campaignType: re }, { category: re }] }).select("_id").limit(100).lean(),
      Vendor.find({ $or: [{ shopName: re }, { companyName: re }] }).select("_id").limit(100).lean(),
      InfluencerProfile.find({ $or: [{ displayName: re }, { storeSlug: re }] }).select("_id").limit(100).lean(),
    ]);
    const clauses = [
      { idempotencyKey: re },
      { surface: re },
      { "metadata.adminNote": re },
      { "metadata.productName": re },
      ...orders.map((row) => ({ orderId: row._id })),
      ...campaigns.map((row) => ({ campaignId: row._id })),
      ...vendors.map((row) => ({ vendorId: row._id })),
      ...influencers.map((row) => ({ influencerId: row._id })),
    ];
    return { $and: [filter, { $or: clauses }] };
  }

  async dashboard(query = {}) {
    const { start, end } = parseRange(query);
    const commissionMatch = this.commissionFilter(query);
    const campaignMatch = this.campaignFilter(query);

    const [
      totalInfluencers,
      activeInfluencers,
      totalVendors,
      activeCampaigns,
      commissionAgg,
      recentCampaigns,
      topInfluencers,
      topVendors,
      pendingVerifications,
      revenueTrendRows,
      campaignTrendRows,
      influencerGrowthRows,
      vendorGrowthRows,
      subscriptionRevenueAgg,
      monthlySubscriptionRevenueAgg,
      annualSubscriptionRevenueAgg,
      activeSubscribers,
      expiredSubscribers,
      planDistribution,
      failedPayments,
      pendingRenewals,
      recentSubscriptionPayments,
      upgradeRevenueAgg,
      downgradeChanges,
      creditWalletAgg,
      mostUpgradedPlans,
    ] = await Promise.all([
      InfluencerProfile.countDocuments({}),
      InfluencerProfile.countDocuments({ state: "active" }),
      Vendor.countDocuments({}),
      Campaign.countDocuments({ ...campaignMatch, state: "active" }),
      CommissionRecord.aggregate([
        { $match: commissionMatch },
        { $group: { _id: null, revenue: { $sum: "$gross" }, commission: { $sum: "$influencerShare" }, paid: { $sum: { $cond: [{ $eq: ["$state", "SETTLED"] }, "$influencerShare", 0] } }, pending: { $sum: { $cond: [{ $eq: ["$state", "HOLD"] }, "$influencerShare", 0] } }, orders: { $sum: 1 } } },
      ]),
      Campaign.find(campaignMatch).populate("vendorId", "shopName companyName").populate({ path: "influencerId", populate: { path: "userId", select: "name email" } }).sort({ createdAt: -1 }).limit(8).lean(),
      CommissionRecord.aggregate([{ $match: commissionMatch }, { $group: { _id: "$influencerId", revenue: { $sum: "$gross" }, commission: { $sum: "$influencerShare" }, orders: { $sum: 1 } } }, { $sort: { revenue: -1 } }, { $limit: 8 }]),
      CommissionRecord.aggregate([{ $match: commissionMatch }, { $group: { _id: "$vendorId", revenue: { $sum: "$gross" }, commission: { $sum: "$influencerShare" }, orders: { $sum: 1 } } }, { $sort: { revenue: -1 } }, { $limit: 8 }]),
      InfluencerApplication.find({ status: { $in: ["submitted", "under_review", "pending_documents", "verification_in_progress", "requires_changes"] } }).sort({ updatedAt: -1 }).limit(8).lean(),
      CommissionRecord.aggregate([{ $match: commissionMatch }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$gross" }, commission: { $sum: "$influencerShare" } } }]),
      Campaign.aggregate([{ $match: { createdAt: { $gte: start, $lte: end } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, campaigns: { $sum: 1 } } }]),
      InfluencerProfile.aggregate([{ $match: { createdAt: { $gte: start, $lte: end } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, influencers: { $sum: 1 } } }]),
      Vendor.aggregate([{ $match: { createdAt: { $gte: start, $lte: end } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, vendors: { $sum: 1 } } }]),
      SubscriptionRevenue.aggregate([{ $match: { createdAt: { $gte: start, $lte: end }, status: "recognized" } }, { $group: { _id: null, gross: { $sum: "$grossAmount" }, net: { $sum: "$netAmount" }, gatewayFee: { $sum: "$gatewayFee" }, tax: { $sum: "$tax" } } }]),
      SubscriptionRevenue.aggregate([{ $match: { createdAt: { $gte: addDays(new Date(), -30), $lte: new Date() }, status: "recognized" } }, { $group: { _id: null, gross: { $sum: "$grossAmount" } } }]),
      SubscriptionRevenue.aggregate([{ $match: { createdAt: { $gte: addDays(new Date(), -365), $lte: new Date() }, status: "recognized" } }, { $group: { _id: null, gross: { $sum: "$grossAmount" } } }]),
      VendorSubscription.countDocuments({ status: "active", $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: new Date() } }] }),
      VendorSubscription.countDocuments({ $or: [{ status: "expired" }, { endDate: { $lt: new Date() } }] }),
      VendorSubscription.aggregate([{ $match: { status: "active" } }, { $group: { _id: "$planId", subscribers: { $sum: 1 } } }, { $sort: { subscribers: -1 } }, { $limit: 20 }]),
      SubscriptionPayment.countDocuments({ status: "failed", createdAt: { $gte: start, $lte: end } }),
      VendorSubscription.countDocuments({ status: "active", endDate: { $gte: new Date(), $lte: addDays(new Date(), 7) } }),
      SubscriptionPayment.find({}).populate("vendorId", "shopName companyName").populate("planId", "planName").sort({ createdAt: -1 }).limit(8).lean(),
      VendorSubscriptionChange.aggregate([{ $match: { status: "completed", changeType: { $in: ["upgrade", "cycle_change"] }, createdAt: { $gte: start, $lte: end } } }, { $group: { _id: null, amount: { $sum: "$finalAmountPaid" } } }]),
      VendorSubscriptionChange.countDocuments({ status: "completed", changeType: "downgrade", createdAt: { $gte: start, $lte: end } }),
      SubscriptionCreditWallet.aggregate([{ $match: { status: "active" } }, { $group: { _id: null, balance: { $sum: "$remainingAmount" } } }]),
      VendorSubscriptionChange.aggregate([{ $match: { status: "completed", changeType: { $in: ["upgrade", "cycle_change"] } } }, { $group: { _id: "$newPlanId", upgrades: { $sum: 1 } } }, { $sort: { upgrades: -1 } }, { $limit: 10 }]),
    ]);

    const trendMap = new Map(buckets(start, end).map((row) => [row.date, row]));
    revenueTrendRows.forEach((row) => Object.assign(trendMap.get(row._id) || {}, { revenue: money(row.revenue), commission: money(row.commission) }));
    campaignTrendRows.forEach((row) => Object.assign(trendMap.get(row._id) || {}, { campaigns: row.campaigns }));
    influencerGrowthRows.forEach((row) => Object.assign(trendMap.get(row._id) || {}, { influencers: row.influencers }));
    vendorGrowthRows.forEach((row) => Object.assign(trendMap.get(row._id) || {}, { vendors: row.vendors }));

    const influencerIds = topInfluencers.map((row) => row._id).filter(Boolean);
    const vendorIds = topVendors.map((row) => row._id).filter(Boolean);
    const [influencers, vendors] = await Promise.all([
      InfluencerProfile.find({ _id: { $in: influencerIds } }).populate("userId", "name email").lean(),
      Vendor.find({ _id: { $in: vendorIds } }).lean(),
    ]);
    const influencerMap = new Map(influencers.map((row) => [String(row._id), row]));
    const vendorMap = new Map(vendors.map((row) => [String(row._id), row]));
    const summary = commissionAgg[0] || {};
    const subscriptionSummary = subscriptionRevenueAgg[0] || {};
    const mostPopularPlan = planDistribution[0] || null;
    const unified = await analyticsAggregator.getAdminAnalytics(query).catch(() => null);
    const unifiedMetrics = unified?.metrics || {};

    return {
      kpis: {
        totalInfluencers,
        activeInfluencers,
        totalVendors,
        activeCampaigns,
        campaignRevenue: money(unifiedMetrics.totalRevenue || summary.revenue),
        commissionPaid: money(unifiedMetrics.totalCommissionPaid || summary.paid),
        escrowBalance: money(unifiedMetrics.totalEscrowBalance || summary.pending),
        totalEscrow: money(unifiedMetrics.totalEscrow || 0),
        totalReleased: money(unifiedMetrics.totalReleased || 0),
        platformRevenue: money(unifiedMetrics.totalPlatformRevenue || 0),
        totalSubscriptionRevenue: money(subscriptionSummary.gross),
        monthlySubscriptionRevenue: money(monthlySubscriptionRevenueAgg[0]?.gross || 0),
        annualSubscriptionRevenue: money(annualSubscriptionRevenueAgg[0]?.gross || 0),
        subscriptionNetRevenue: money(subscriptionSummary.net),
        activeSubscribers,
        expiredSubscribers,
        pendingRenewals,
        failedSubscriptionPayments: failedPayments,
        upgradeRevenue: money(upgradeRevenueAgg[0]?.amount || 0),
        downgradeRequests: downgradeChanges,
        subscriptionCreditBalance: money(creditWalletAgg[0]?.balance || 0),
        mostPopularPlanId: mostPopularPlan?._id || null,
      },
      unified,
      charts: {
        revenueTrend: [...trendMap.values()],
        campaignTrend: [...trendMap.values()].map(({ date, campaigns }) => ({ date, campaigns })),
        influencerGrowth: [...trendMap.values()].map(({ date, influencers }) => ({ date, influencers })),
        vendorGrowth: [...trendMap.values()].map(({ date, vendors }) => ({ date, vendors })),
        commissionTrend: [...trendMap.values()].map(({ date, commission }) => ({ date, commission })),
      },
      widgets: {
        recentCampaigns,
        topInfluencers: topInfluencers.map((row) => ({ ...row, influencer: influencerMap.get(String(row._id)), name: influencerName(influencerMap.get(String(row._id))) })),
        topVendors: topVendors.map((row) => ({ ...row, vendor: vendorMap.get(String(row._id)), name: vendorName(vendorMap.get(String(row._id))) })),
        pendingVerifications,
        subscriptionRevenue: subscriptionSummary,
        planDistribution,
        mostUpgradedPlans,
        recentSubscriptionPayments,
      },
    };
  }

  async influencers(query = {}) {
    const { page, limit, skip } = pageOptions(query);
    const filter = {};
    if (query.status) filter.state = query.status;
    if (query.category) filter.$or = [{ categories: query.category }, { primaryCategory: query.category }, { secondaryCategories: query.category }];
    if (query.country) filter["location.country"] = query.country;
    if (query.search) {
      const re = new RegExp(escapeRegex(query.search), "i");
      filter.$and = [{ $or: [{ displayName: re }, { influencerCode: re }, { primaryCategory: re }] }];
    }
    const [items, total, commissionRows, socialAccounts] = await Promise.all([
      InfluencerProfile.find(filter).populate("userId", "name email username status").sort(normalizeSort(query.sort, { createdAt: -1 })).skip(skip).limit(limit).lean(),
      InfluencerProfile.countDocuments(filter),
      CommissionRecord.aggregate([{ $group: { _id: "$influencerId", revenue: { $sum: "$gross" }, commission: { $sum: "$influencerShare" }, orders: { $sum: 1 } } }]),
      InfluencerSocialAccount.find({}).lean(),
    ]);
    const commissionMap = new Map(commissionRows.map((row) => [String(row._id), row]));
    const socialMap = socialAccounts.reduce((map, account) => {
      const key = String(account.influencerId || "");
      const list = map.get(key) || [];
      list.push(account);
      map.set(key, list);
      return map;
    }, new Map());
    return {
      items: items.map((profile) => {
        const stats = commissionMap.get(String(profile._id)) || {};
        const socials = socialMap.get(String(profile._id)) || [];
        const engagementRate = socials.length ? money(socials.reduce((sum, item) => sum + Number(item.engagementRate || 0), 0) / socials.length) : 0;
        const clicks = Number(profile.stats?.clicks || 0);
        return {
          ...profile,
          name: influencerName(profile),
          username: profile.userId?.username || profile.influencerCode,
          engagementRate,
          conversionRate: clicks ? money((Number(profile.stats?.sales || 0) / clicks) * 100) : 0,
          revenueGenerated: money(stats.revenue),
          commissionEarned: money(stats.commission),
          kycStatus: profile.verified ? "verified" : profile.state,
          accountStatus: profile.userId?.status || profile.state,
        };
      }),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async vendors(query = {}) {
    const { page, limit, skip } = pageOptions(query);
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.search) {
      const re = new RegExp(escapeRegex(query.search), "i");
      filter.$or = [{ shopName: re }, { companyName: re }, { vendorCode: re }];
    }
    const [items, total, campaignAgg, commissionAgg, relationshipAgg] = await Promise.all([
      Vendor.find(filter).populate("userId", "name email status").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Vendor.countDocuments(filter),
      Campaign.aggregate([{ $group: { _id: "$vendorId", activeCampaigns: { $sum: { $cond: [{ $eq: ["$state", "active"] }, 1, 0] } }, totalCampaigns: { $sum: 1 } } }]),
      CommissionRecord.aggregate([{ $group: { _id: "$vendorId", revenue: { $sum: "$gross" }, commission: { $sum: "$influencerShare" }, pending: { $sum: { $cond: [{ $eq: ["$state", "HOLD"] }, "$influencerShare", 0] } } } }]),
      VendorInfluencerRelationship.aggregate([{ $group: { _id: "$vendorId", influencersConnected: { $sum: 1 } } }]),
    ]);
    const campaignMap = new Map(campaignAgg.map((row) => [String(row._id), row]));
    const commissionMap = new Map(commissionAgg.map((row) => [String(row._id), row]));
    const relationshipMap = new Map(relationshipAgg.map((row) => [String(row._id), row]));
    return {
      items: items.map((vendor) => {
        const c = campaignMap.get(String(vendor._id)) || {};
        const m = commissionMap.get(String(vendor._id)) || {};
        const r = relationshipMap.get(String(vendor._id)) || {};
        return {
          ...vendor,
          name: vendorName(vendor),
          activeCampaigns: c.activeCampaigns || 0,
          influencersConnected: r.influencersConnected || 0,
          campaignRevenue: money(m.revenue),
          commissionLiability: money(m.pending),
          escrowUsage: money(m.pending),
          pendingSettlements: money(m.pending),
          fraudFlags: 0,
        };
      }),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async campaigns(query = {}) {
    const { page, limit, skip } = pageOptions(query);
    const filter = this.campaignFilter(query);
    const [items, total] = await Promise.all([
      Campaign.find(filter).populate("vendorId", "shopName companyName").populate({ path: "influencerId", populate: { path: "userId", select: "name email" } }).populate("productIds", "name category images thumbnail").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Campaign.countDocuments(filter),
    ]);
    const commerceDocs = await influencerRateCardService.getCampaignCommerceDocs(items.map((campaign) => campaign._id));
    return {
      items: items.map((campaign) => {
        const paymentModel = commerceDocs.paymentModels.get(String(campaign._id)) || campaign.paymentModelSnapshot || null;
        return {
          ...campaign,
          paymentModel,
          attributionRule: commerceDocs.attributionRules.get(String(campaign._id)) || null,
          vendorName: vendorName(campaign.vendorId),
          influencerName: campaign.influencerId ? influencerName(campaign.influencerId) : "",
          budget: Number(campaign.pricing?.totalBudget || paymentModel?.totalBudget || campaign.fixedFee || 0),
          revenue: Number(campaign.analytics?.revenue || 0),
          applicationsCount: campaign.applications?.length || 0,
          approvedCreators: (campaign.applications || []).filter((app) => app.status === "approved").length + (campaign.influencerId ? 1 : 0),
        };
      }),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async updateCampaign(actor, campaignId, payload = {}) {
    const allowed = {};
    ["title", "description", "campaignType", "category", "country", "language", "commissionPercent", "fixedFee", "deadline"].forEach((key) => {
      if (payload[key] !== undefined) allowed[key] = payload[key];
    });
    const nextState = normalizeCampaignState(payload);
    if (nextState) allowed.state = nextState;
    if (payload.action === "feature" || payload.featured === true) allowed["marketplace.public"] = true;
    if (payload.action === "unfeature" || payload.featured === false) allowed["marketplace.public"] = false;
    if (payload.marketplace?.public !== undefined) allowed["marketplace.public"] = Boolean(payload.marketplace.public);
    if (payload.marketplace?.applicationDeadline !== undefined) allowed["marketplace.applicationDeadline"] = payload.marketplace.applicationDeadline || null;
    if (payload.marketplace?.availableSlots !== undefined) allowed["marketplace.availableSlots"] = payload.marketplace.availableSlots;
    if (payload.marketplace?.requiredDeliverables !== undefined) allowed["marketplace.requiredDeliverables"] = payload.marketplace.requiredDeliverables;
    if (payload.marketplace?.assets !== undefined) allowed["marketplace.assets"] = payload.marketplace.assets;
    if (!Object.keys(allowed).length) throw new AppError("No campaign updates supplied", 400, "VALIDATION_ERROR");
    const pricingKeys = new Set(["commissionPercent", "fixedFee", "paymentType", "attributionWindowDays", "pricing", "paymentModelSnapshot", "influencerRateSnapshot"]);
    const touchesPricing = Object.keys(allowed).some((key) => pricingKeys.has(key));
    if (touchesPricing) {
      const current = await Campaign.findById(campaignId).select("contractSnapshot.locked termsFrozen.frozenAt").lean();
      if (current?.contractSnapshot?.locked || current?.termsFrozen?.frozenAt) {
        throw new AppError("Campaign pricing is locked after acceptance", 409, "CAMPAIGN_PRICING_LOCKED");
      }
    }

    const historyState = allowed.state || payload.action || "updated";
    const campaign = await Campaign.findByIdAndUpdate(
      campaignId,
      { $set: allowed, $push: { history: { state: historyState, actorId: actor.sub || actor._id, note: payload.note || `Admin ${historyState} campaign`, changedAt: new Date() } } },
      { returnDocument: "after", runValidators: true }
    );
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");

    const participantIds = [
      campaign.influencerId,
      ...(campaign.applications || []).filter((application) => application.status === "approved").map((application) => application.influencerId),
    ].filter(Boolean);
    const uniqueParticipantIds = [...new Set(participantIds.map(String))].map((id) => new mongoose.Types.ObjectId(id));

    if (uniqueParticipantIds.length && allowed.state === "active") {
      await Promise.all([
        VendorInfluencerRelationship.updateMany(
          { vendorId: campaign.vendorId, influencerId: { $in: uniqueParticipantIds } },
          { $set: { status: "active", lastActivityAt: new Date() }, $addToSet: { activeCampaignIds: campaign._id } }
        ),
        Promise.all(uniqueParticipantIds.map((influencerId) => upsertProductAssignments({ campaign, influencerId, status: "active", source: "admin_manual", actorId: actor.sub || actor._id }))),
      ]);
    }

    if (uniqueParticipantIds.length && ["completed", "cancelled"].includes(allowed.state)) {
      const assignmentUpdate = {
        status: allowed.state === "cancelled" ? "paused" : "approved",
        "metadata.lastActorId": actor.sub || actor._id,
      };
      if (allowed.state === "cancelled") assignmentUpdate.removedAt = new Date();
      await Promise.all([
        VendorInfluencerRelationship.updateMany(
          { vendorId: campaign.vendorId, influencerId: { $in: uniqueParticipantIds } },
          { $pull: { activeCampaignIds: campaign._id }, $set: { lastActivityAt: new Date(), ...(allowed.state === "cancelled" ? { status: "paused" } : {}) } }
        ),
        InfluencerProductAssignment.updateMany(
          { campaignId: campaign._id, influencerId: { $in: uniqueParticipantIds } },
          { $set: assignmentUpdate }
        ),
      ]);
    }

    await auditService.log({ actor, action: "admin.influencer_commerce.campaign.update", entityType: "Campaign", entityId: campaign._id, metadata: allowed }).catch(() => {});
    return campaign;
  }

  async matching(query = {}) {
    const [vendors, influencers, campaigns, products] = await Promise.all([
      Vendor.find({ status: "approved" }).limit(25).lean(),
      InfluencerProfile.find({ state: { $in: ["verified", "active"] } }).populate("userId", "name email").sort({ followers: -1, rating: -1 }).limit(50).lean(),
      Campaign.find({ state: { $nin: ["completed", "cancelled"] } }).populate("vendorId", "shopName companyName").sort({ "analytics.revenue": -1, createdAt: -1 }).limit(25).lean(),
      Product.find({ status: "APPROVED", isActive: true }).populate("sellerId", "shopName companyName").sort({ "analytics.salesCount": -1 }).limit(25).lean(),
    ]);
    const rawMatches = vendors.slice(0, 12).flatMap((vendor) => influencers.slice(0, 5).map((influencer) => {
      const categoryMatch = (influencer.categories || []).some((category) => (vendor.storeCategories || []).includes(category));
      const score = Math.min(99, Math.round(52 + Number(influencer.rating || 0) * 8 + (categoryMatch ? 18 : 0) + Math.log10(Number(influencer.followers || 0) + 1) * 4));
      return { vendor, influencer, score, reasons: [categoryMatch ? "Category fit" : "Audience scale", "Verified creator profile", "Revenue potential"] };
    })).sort((a, b) => b.score - a.score);
    const vendorIds = [...new Set(rawMatches.map((match) => String(match.vendor?._id)).filter(Boolean))].map((id) => new mongoose.Types.ObjectId(id));
    const influencerIds = [...new Set(rawMatches.map((match) => String(match.influencer?._id)).filter(Boolean))].map((id) => new mongoose.Types.ObjectId(id));
    const relationships = vendorIds.length && influencerIds.length
      ? await VendorInfluencerRelationship.find({ vendorId: { $in: vendorIds }, influencerId: { $in: influencerIds } }).lean()
      : [];
    const relationshipMap = new Map(relationships.map((relationship) => [`${relationship.vendorId}:${relationship.influencerId}`, relationship]));
    const matches = rawMatches.map((match) => {
      const relationship = relationshipMap.get(`${match.vendor?._id}:${match.influencer?._id}`);
      const relationshipStatus = relationship?.status || "";
      return {
        ...match,
        id: `${match.vendor?._id}:${match.influencer?._id}`,
        vendorId: match.vendor?._id,
        influencerId: match.influencer?._id,
        vendorName: vendorName(match.vendor),
        influencerName: influencerName(match.influencer),
        relationshipId: relationship?._id,
        relationshipStatus,
      };
    });
    return { matches, campaigns, products };
  }

  async affiliateLinks(query = {}) {
    await this.expireAffiliateLinks();
    const { page, limit, skip } = pageOptions(query);
    const filter = {};
    const campaignFilter = {};
    if (query.status) filter.status = query.status;
    if (query.trackingStatus) filter.trackingStatus = query.trackingStatus;
    if (oid(query.influencerId)) filter.influencerId = oid(query.influencerId);
    if (oid(query.campaignId)) filter.campaignId = oid(query.campaignId);
    if (oid(query.productId)) filter.productId = oid(query.productId);
    if (oid(query.vendorId)) filter.vendorId = oid(query.vendorId);
    if (query.startDate || query.endDate) Object.assign(filter, this.dateMatch(query));
    if (query.paymentModel && query.paymentModel !== "all") campaignFilter.paymentType = query.paymentModel;
    if (query.campaignType) campaignFilter.campaignType = query.campaignType;
    if (query.search) {
      const re = new RegExp(escapeRegex(query.search), "i");
      const [campaignIds, productIds, influencerIds, vendorIds] = await Promise.all([
        Campaign.find({ $or: [{ title: re }, { campaignType: re }, { category: re }] }).distinct("_id").catch(() => []),
        Product.find({ $or: [{ name: re }, { slug: re }, { category: re }] }).distinct("_id").catch(() => []),
        InfluencerProfile.find({ $or: [{ displayName: re }, { influencerCode: re }, { primaryCategory: re }] }).distinct("_id").catch(() => []),
        Vendor.find({ $or: [{ shopName: re }, { companyName: re }] }).distinct("_id").catch(() => []),
      ]);
      filter.$or = [
        { trackingCode: re },
        { trackingId: re },
        ...(campaignIds.length ? [{ campaignId: { $in: campaignIds } }] : []),
        ...(productIds.length ? [{ productId: { $in: productIds } }] : []),
        ...(influencerIds.length ? [{ influencerId: { $in: influencerIds } }] : []),
        ...(vendorIds.length ? [{ vendorId: { $in: vendorIds } }] : []),
      ];
    }
    if (Object.keys(campaignFilter).length) {
      const campaignIds = await Campaign.find(campaignFilter).distinct("_id").catch(() => []);
      filter.campaignId = filter.campaignId
        ? filter.campaignId
        : { $in: campaignIds };
    }
    const [rows, total] = await Promise.all([
      AffiliateLink.find(filter)
        .populate({ path: "influencerId", populate: { path: "userId", select: "name email" } })
        .populate("vendorId", "shopName companyName status userId")
        .populate("productId", "name slug status approvalStatus isActive category")
        .populate("campaignId", "title state paymentType campaignType deadline marketplace termsFrozen commissionWorkflow vendorId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AffiliateLink.countDocuments(filter),
    ]);
    const metrics = await this.affiliateLinkMetrics(rows.map((row) => row._id));
    return {
      items: rows.map((row) => presentAffiliateLink(row, metrics.get(String(row._id)) || {})),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async affiliateLinkMetrics(linkIds = []) {
    const ids = oidList(linkIds);
    if (!ids.length) return new Map();
    const [clickRows, conversionRows, commissionRows] = await Promise.all([
      CampaignAffiliateClick.aggregate([
        { $match: { affiliateLinkId: { $in: ids } } },
        {
          $group: {
            _id: "$affiliateLinkId",
            clicks: { $sum: 1 },
            uniqueIdentities: { $addToSet: { $ifNull: ["$userId", { $ifNull: ["$anonymousId", "$trackingTokenId"] }] } },
            lastClick: { $max: "$clickedAt" },
          },
        },
      ]),
      AffiliateConversion.aggregate([
        { $match: { affiliateLinkId: { $in: ids } } },
        {
          $group: {
            _id: "$affiliateLinkId",
            orders: { $sum: 1 },
            revenue: { $sum: "$orderTotal" },
            commission: { $sum: "$commissionAmount" },
            lastOrder: { $max: "$convertedAt" },
          },
        },
      ]),
      CommissionRecord.aggregate([
        { $match: { affiliateLinkId: { $in: ids } } },
        {
          $group: {
            _id: "$affiliateLinkId",
            commission: { $sum: "$commissionAmount" },
            lastCommission: { $max: "$createdAt" },
          },
        },
      ]).catch(() => []),
    ]);
    const map = new Map();
    const ensure = (id) => {
      const key = String(id);
      if (!map.has(key)) map.set(key, { clicks: 0, uniqueClicks: 0, orders: 0, revenue: 0, commission: 0 });
      return map.get(key);
    };
    clickRows.forEach((row) => {
      const item = ensure(row._id);
      item.clicks = Number(row.clicks || 0);
      item.uniqueClicks = (row.uniqueIdentities || []).filter(Boolean).length;
      item.lastClick = row.lastClick;
    });
    conversionRows.forEach((row) => {
      const item = ensure(row._id);
      item.orders = Number(row.orders || 0);
      item.revenue = money(row.revenue || 0);
      item.commission = money(row.commission || item.commission || 0);
      item.lastOrder = row.lastOrder;
    });
    commissionRows.forEach((row) => {
      const item = ensure(row._id);
      item.commission = money(row.commission || item.commission || 0);
      item.lastCommission = row.lastCommission;
    });
    return map;
  }

  async affiliateLinkHistory(linkId) {
    const rows = await AuditLog.find({ entityType: "AffiliateLink", entityId: oid(linkId) })
      .populate("actorId", "name email role")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return rows.map((row) => ({
      id: row._id,
      action: row.action,
      status: row.status,
      actor: row.actorId?.name || row.actorId?.email || row.actorRole || "System",
      metadata: row.metadata || {},
      createdAt: row.createdAt,
    }));
  }

  async affiliateLinkDetails(linkId) {
    await this.expireAffiliateLinks();
    const row = await AffiliateLink.findById(linkId)
      .populate({ path: "influencerId", populate: { path: "userId", select: "name email" } })
      .populate("vendorId", "shopName companyName status userId")
      .populate("productId", "name slug status approvalStatus isActive category")
      .populate("campaignId", "title state paymentType campaignType deadline marketplace termsFrozen commissionWorkflow vendorId")
      .lean();
    if (!row) throw new AppError("Affiliate link not found", 404, "AFFILIATE_LINK_NOT_FOUND");
    const [metrics, history] = await Promise.all([
      this.affiliateLinkMetrics([row._id]),
      this.affiliateLinkHistory(row._id),
    ]);
    return presentAffiliateLink(row, metrics.get(String(row._id)) || {}, history);
  }

  async updateAffiliateLinkStatus(actor, linkId, payload = {}, meta = {}) {
    await this.expireAffiliateLinks();
    const action = String(payload.action || payload.status || "").toLowerCase();
    if (!["activate", "deactivate", "inactive", "active", "disable", "enable"].includes(action)) {
      throw new AppError("Invalid affiliate link action", 400, "INVALID_AFFILIATE_LINK_ACTION");
    }
    const row = await AffiliateLink.findById(linkId)
      .populate({ path: "influencerId", populate: { path: "userId", select: "name email" } })
      .populate("vendorId", "shopName companyName status userId")
      .populate("productId", "name slug status approvalStatus isActive category")
      .populate("campaignId", "title state paymentType campaignType deadline marketplace termsFrozen commissionWorkflow vendorId")
      .exec();
    if (!row) throw new AppError("Affiliate link not found", 404, "AFFILIATE_LINK_NOT_FOUND");
    const oldStatus = row.status;
    const oldTrackingStatus = row.trackingStatus;
    const enable = ["activate", "active", "enable"].includes(action);
    const availability = linkActionAvailability(row);
    if (enable && !availability.canActivate) {
      throw new AppError(availability.disabledReason || "Affiliate link cannot be activated", 400, "AFFILIATE_LINK_ACTIVATION_BLOCKED");
    }
    if (!enable && !availability.canDeactivate && row.status !== "active") {
      throw new AppError(availability.disabledReason || "Affiliate link cannot be deactivated", 400, "AFFILIATE_LINK_DEACTIVATION_BLOCKED");
    }
    const now = new Date();
    const reason = String(payload.reason || (enable ? "Affiliate link activated by admin" : "Affiliate link deactivated by admin")).trim();
    if (enable) {
      row.status = "active";
      row.trackingStatus = "active";
      row.disabledByAdmin = false;
      row.disabledReason = "";
      row.disabledAt = undefined;
      row.disabledBy = undefined;
      row.activatedAt = row.activatedAt || now;
      row.activatedBy = actor?._id || actor?.sub || undefined;
    } else {
      row.status = "disabled";
      row.trackingStatus = "inactive";
      row.disabledByAdmin = true;
      row.disabledReason = reason;
      row.disabledAt = now;
      row.disabledBy = actor?._id || actor?.sub || undefined;
    }
    await row.save();
    if (!enable) {
      await Promise.all([
        CampaignAffiliateAttribution.updateMany(
          { affiliateLinkId: row._id, status: { $in: ["pending", "active"] } },
          { $set: { status: "expired", expiresAt: now, closedAt: now, closeReason: reason } }
        ),
        TrackingSession.updateMany(
          { campaignId: row.campaignId?._id || row.campaignId, influencerId: row.influencerId?._id || row.influencerId, productId: row.productId?._id || row.productId, expiresAt: { $gt: now } },
          { $set: { expiresAt: now, status: "expired", invalidationReason: reason } }
        ),
      ]);
    }
    await auditService.log({
      actor,
      action: enable ? "admin.affiliate_link.activated" : "admin.affiliate_link.deactivated",
      entityType: "AffiliateLink",
      entityId: row._id,
      metadata: { oldStatus, newStatus: row.status, oldTrackingStatus, newTrackingStatus: row.trackingStatus, reason },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    }).catch(() => null);
    await this.notifyAffiliateLinkStatusChange(row, enable, reason).catch(() => null);
    return this.affiliateLinkDetails(row._id);
  }

  async notifyAffiliateLinkStatusChange(row, enabled, reason) {
    const title = enabled ? "Affiliate link activated" : "Affiliate link deactivated";
    const message = `${row.campaignId?.title || "Campaign"} affiliate link for ${row.productId?.name || "a product"} was ${enabled ? "activated" : "deactivated"}.`;
    const payload = {
      module: "GROWTH",
      subModule: "INFLUENCER_COMMERCE",
      type: enabled ? "AFFILIATE_LINK_ACTIVATED" : "AFFILIATE_LINK_DEACTIVATED",
      title,
      message,
      referenceId: row._id,
      meta: { campaignId: row.campaignId?._id || row.campaignId, productId: row.productId?._id || row.productId, reason },
    };
    await Promise.all([
      notificationService.notifyVendorUser(row.vendorId?._id || row.vendorId || row.campaignId?.vendorId, payload),
      row.influencerId?.userId?._id || row.influencerId?.userId
        ? notificationService.createNotification({ ...payload, userId: row.influencerId.userId._id || row.influencerId.userId, role: "INFLUENCER" })
        : Promise.resolve(null),
    ]);
  }

  async expireAffiliateLinks() {
    const now = new Date();
    const expiredCampaignIds = await Campaign.find({
      state: { $in: ["tracking_active", "active", "accepted"] },
      $or: [{ deadline: { $lte: now } }, { "termsFrozen.deadline": { $lte: now } }],
    }).distinct("_id").catch(() => []);
    const expired = await AffiliateLink.find({
      trackingStatus: { $ne: "expired" },
      $or: [{ expiresAt: { $lte: now } }, { status: "expired" }, ...(expiredCampaignIds.length ? [{ campaignId: { $in: expiredCampaignIds } }] : [])],
    }).select("_id").lean();
    if (!expired.length) return { expired: 0 };
    const ids = expired.map((row) => row._id);
    await AffiliateLink.updateMany(
      { _id: { $in: ids } },
      { $set: { status: "expired", trackingStatus: "expired", expiredAt: now, disabledReason: "Affiliate link expired automatically." } }
    );
    await CampaignAffiliateAttribution.updateMany(
      { affiliateLinkId: { $in: ids }, status: { $in: ["pending", "active"] } },
      { $set: { status: "expired", expiresAt: now, closedAt: now, closeReason: "Affiliate link expired automatically." } }
    );
    if (expiredCampaignIds.length) {
      await Campaign.updateMany(
        { _id: { $in: expiredCampaignIds } },
        { $set: { state: "expired", "commissionWorkflow.trackingActive": false, "commissionWorkflow.closedAt": now, "commissionWorkflow.closedReason": "Campaign end date reached; affiliate links expired automatically" } }
      ).catch(() => null);
    }
    return { expired: ids.length };
  }

  async tracking(query = {}) {
    const { page, limit, skip } = pageOptions(query);
    const filter = {};
    if (oid(query.influencerId)) filter.influencerId = oid(query.influencerId);
    if (oid(query.campaignId)) filter.campaignId = oid(query.campaignId);
    if (oid(query.productId)) filter.productId = oid(query.productId);
    if (query.startDate || query.endDate) Object.assign(filter, this.dateMatch(query));
    if (query.category) {
      const productIds = await Product.find({ category: query.category }).distinct("_id").catch(() => []);
      filter.productId = { $in: productIds };
    }
    if (query.search) {
      const re = new RegExp(escapeRegex(query.search), "i");
      const [productIds, campaignIds, influencerIds] = await Promise.all([
        Product.find({ $or: [{ name: re }, { category: re }] }).distinct("_id").catch(() => []),
        Campaign.find({ $or: [{ title: re }, { category: re }, { campaignType: re }] }).distinct("_id").catch(() => []),
        InfluencerProfile.find({ $or: [{ displayName: re }, { influencerCode: re }, { primaryCategory: re }] }).distinct("_id").catch(() => []),
      ]);
      filter.$or = [
        { trackingTokenId: re },
        { surface: re },
        ...(productIds.length ? [{ productId: { $in: productIds } }] : []),
        ...(campaignIds.length ? [{ campaignId: { $in: campaignIds } }] : []),
        ...(influencerIds.length ? [{ influencerId: { $in: influencerIds } }] : []),
      ];
    }

    const rows = await TrackingSession.find(filter)
      .populate({ path: "influencerId", populate: { path: "userId", select: "name email" } })
      .populate({ path: "campaignId", populate: { path: "vendorId", select: "shopName companyName" } })
      .populate({ path: "productId", select: "name category sellerId", populate: { path: "sellerId", select: "shopName companyName" } })
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    const ids = rows.map((row) => row._id);
    const [orderRows, commissionRows] = await Promise.all([
      ids.length ? Order.find({ "attribution.trackingSessionId": { $in: ids } }).select("orderNumber totalAmount status paymentStatus attribution createdAt").lean() : [],
      ids.length ? CommissionRecord.find({ trackingSessionId: { $in: ids } }).select("trackingSessionId state gross influencerShare").lean().catch(() => []) : [],
    ]);
    const orderMap = new Map(orderRows.map((order) => [String(order.attribution?.trackingSessionId), order]));
    const commissionMap = commissionRows.reduce((map, row) => {
      const key = String(row.trackingSessionId || "");
      const current = map.get(key) || { gross: 0, commission: 0, count: 0, states: new Set() };
      current.gross += Number(row.gross || 0);
      current.commission += Number(row.influencerShare || 0);
      current.count += 1;
      if (row.state) current.states.add(row.state);
      map.set(key, current);
      return map;
    }, new Map());

    const now = new Date();
    const items = rows.map((row) => {
      const order = orderMap.get(String(row._id));
      const commission = commissionMap.get(String(row._id));
      const expired = row.expiresAt && new Date(row.expiresAt) <= now;
      const sameUser = row.userId && row.influencerId?.userId?._id && String(row.userId) === String(row.influencerId.userId._id);
      const fraudRisk = sameUser ? "high" : expired && !order ? "medium" : "low";
      const conversionStatus = order ? "converted" : expired ? "expired" : "pending";
      return {
        ...row,
        sessionId: row.trackingTokenId || row._id,
        influencerName: influencerName(row.influencerId),
        vendorName: vendorName(row.campaignId?.vendorId || row.productId?.sellerId),
        productName: row.productId?.name || "",
        campaignTitle: row.campaignId?.title || "",
        order,
        orderNumber: order?.orderNumber || "",
        revenue: money(order?.totalAmount || commission?.gross || 0),
        commission: money(commission?.commission || 0),
        conversionStatus,
        fraudRisk,
      };
    }).filter((row) => {
      const status = String(query.status || "").toLowerCase();
      if (!status) return true;
      if (["converted", "pending", "expired"].includes(status)) return row.conversionStatus === status;
      if (["high", "medium", "low"].includes(status)) return row.fraudRisk === status;
      return true;
    });

    const total = items.length;
    return {
      items: items.slice(skip, skip + limit),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async productPromotions(query = {}) {
    const { page, limit } = pageOptions(query);
    const campaignFilter = { productIds: { $exists: true, $ne: [] } };
    if (query.status) campaignFilter.state = String(query.status).toLowerCase();
    if (query.startDate || query.endDate) Object.assign(campaignFilter, this.dateMatch(query));
    if (query.category) campaignFilter.category = query.category;
    if (oid(query.vendorId)) campaignFilter.vendorId = oid(query.vendorId);
    if (oid(query.campaignId)) campaignFilter._id = oid(query.campaignId);

    let searchProductIds = [];
    if (query.search) {
      const re = new RegExp(escapeRegex(query.search), "i");
      const [vendorIds, productIds] = await Promise.all([
        Vendor.find({ $or: [{ shopName: re }, { companyName: re }] }).distinct("_id").catch(() => []),
        Product.find({ $or: [{ name: re }, { category: re }] }).distinct("_id").catch(() => []),
      ]);
      searchProductIds = productIds;
      campaignFilter.$or = [
        { title: re },
        { category: re },
        { campaignType: re },
        ...(vendorIds.length ? [{ vendorId: { $in: vendorIds } }] : []),
        ...(productIds.length ? [{ productIds: { $in: productIds } }] : []),
      ];
    }

    const campaigns = await Campaign.find(campaignFilter)
      .populate("vendorId", "shopName companyName")
      .populate("productIds", "name category thumbnail images status analytics sellerId")
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    let promotionRows = campaigns.flatMap((campaign) => (campaign.productIds || []).map((product) => ({
      id: `${campaign._id}-${product?._id || "product"}`,
      campaign,
      campaignId: campaign._id,
      campaignTitle: campaign.title,
      campaignState: campaign.state,
      productId: product?._id,
      product,
      productName: product?.name || "Product",
      category: product?.category || campaign.category || "",
      vendor: campaign.vendorId,
      vendorName: vendorName(campaign.vendorId),
      image: productImage(product),
      status: campaign.state || product?.status,
      commissionRate: Number(campaign.commissionPercent || 0),
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    }))).filter((row) => row.productId);

    if (query.category) {
      promotionRows = promotionRows.filter((row) => row.category === query.category || row.campaign?.category === query.category);
    }
    if (searchProductIds.length) {
      const allowed = new Set(searchProductIds.map(String));
      const hasCampaignSearch = Boolean(campaignFilter.$or?.some((condition) => !condition.productIds));
      if (!hasCampaignSearch) promotionRows = promotionRows.filter((row) => allowed.has(String(row.productId)));
    }

    const campaignIds = oidList(promotionRows.map((row) => row.campaignId));
    const productIds = oidList(promotionRows.map((row) => row.productId));
    const [trackingRows, commissionRows, assignmentRows] = campaignIds.length && productIds.length ? await Promise.all([
      TrackingSession.aggregate([
        { $match: { campaignId: { $in: campaignIds }, productId: { $in: productIds } } },
        { $group: { _id: { campaignId: "$campaignId", productId: "$productId" }, clicks: { $sum: 1 }, influencers: { $addToSet: "$influencerId" } } },
      ]).catch(() => []),
      CommissionRecord.aggregate([
        { $match: { campaignId: { $in: campaignIds }, "metadata.productId": { $in: productIds } } },
        { $group: { _id: { campaignId: "$campaignId", productId: "$metadata.productId" }, revenue: { $sum: "$gross" }, commission: { $sum: "$influencerShare" }, orders: { $sum: 1 }, influencers: { $addToSet: "$influencerId" } } },
      ]).catch(() => []),
      InfluencerProductAssignment.aggregate([
        { $match: { campaignId: { $in: campaignIds }, productId: { $in: productIds }, status: { $in: ["assigned", "accepted", "approved", "active"] } } },
        { $group: { _id: { campaignId: "$campaignId", productId: "$productId" }, influencers: { $addToSet: "$influencerId" } } },
      ]).catch(() => []),
    ]) : [[], [], []];

    const keyOf = (campaignId, productId) => `${String(campaignId)}:${String(productId)}`;
    const trackingMap = new Map(trackingRows.map((row) => [keyOf(row._id.campaignId, row._id.productId), row]));
    const commissionMap = new Map(commissionRows.map((row) => [keyOf(row._id.campaignId, row._id.productId), row]));
    const assignmentMap = new Map(assignmentRows.map((row) => [keyOf(row._id.campaignId, row._id.productId), row]));
    const total = promotionRows.length;
    const items = promotionRows.slice((page - 1) * limit, page * limit).map((row) => {
      const key = keyOf(row.campaignId, row.productId);
      const tracking = trackingMap.get(key) || {};
      const commission = commissionMap.get(key) || {};
      const assignments = assignmentMap.get(key) || {};
      const influencerIds = new Set([...(tracking.influencers || []), ...(commission.influencers || []), ...(assignments.influencers || [])].filter(Boolean).map(String));
      const clicks = Number(tracking.clicks || row.product?.analytics?.views || 0);
      const orders = Number(commission.orders || 0);
      return {
        ...row,
        influencersPromoting: influencerIds.size,
        clicks,
        orders,
        revenue: money(commission.revenue),
        commission: money(commission.commission),
        conversionRate: clicks ? money((orders / clicks) * 100) : 0,
      };
    });

    return { items, pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 } };
  }

  async settlements(query = {}) {
    const { page, limit, skip } = pageOptions(query);
    const filter = await this.applyCommissionSearch(this.commissionFilter({ ...query, status: query.status || "HOLD" }), query);
    const [items, total] = await Promise.all([
      CommissionRecord.find(filter).populate("vendorId", "shopName companyName").populate({ path: "influencerId", populate: { path: "userId", select: "name email" } }).populate("campaignId", "title campaignType").populate("orderId", "orderNumber status paymentStatus totalAmount").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      CommissionRecord.countDocuments(filter),
    ]);
    return {
      items: items.map((row) => ({
        ...row,
        escrowAmount: row.influencerShare,
        commissionHold: row.influencerShare,
        settlementStatus: row.state,
        releasedDate: row.settledAt,
      })),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async payouts(query = {}) {
    const { page, limit, skip } = pageOptions(query);
    const requestFilter = {};
    if (query.status) requestFilter.status = String(query.status).toUpperCase();
    if (oid(query.influencerId)) requestFilter.influencerId = oid(query.influencerId);
    if (query.startDate || query.endDate) Object.assign(requestFilter, this.dateMatch(query));
    const [wallets, total, withdrawals] = await Promise.all([
      InfluencerWallet.find({}).populate({ path: "influencerId", populate: { path: "userId", select: "name email" } }).sort({ totalEarnings: -1 }).skip(skip).limit(limit).lean(),
      InfluencerWallet.countDocuments({}),
      InfluencerWithdrawalRequest.find(requestFilter)
        .populate({ path: "influencerId", populate: { path: "userId", select: "name email" } })
        .populate("bankAccountId")
        .sort({ requestedAt: -1 })
        .limit(100)
        .lean(),
    ]);
    const accountIds = wallets.map((wallet) => wallet.influencerId?._id || wallet.influencerId);
    const accounts = await InfluencerPayoutAccount.find({ influencerId: { $in: accountIds }, isActive: true }).lean();
    const accountMap = new Map(accounts.map((account) => [String(account.influencerId), account]));
    return {
      items: wallets.map((wallet) => ({ ...wallet, influencerName: influencerName(wallet.influencerId), payoutAccount: accountMap.get(String(wallet.influencerId?._id || wallet.influencerId)) })),
      withdrawalRequests: withdrawals.map((request) => ({
        ...request,
        influencerName: influencerName(request.influencerId),
        accountLabel: request.bankAccountId?.bankName || request.bankAccountId?.paymentMethod || "",
      })),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async revenueDashboard(query = {}) {
    const { start, end } = parseRange(query);
    const { limit } = pageOptions(query, 50);
    const selectedPaymentModel = selectedRevenueModel(query.paymentModel);
    const baseDateMatch = { createdAt: { $gte: start, $lte: end } };
    const scopedMatch = { ...baseDateMatch };
    const campaignMatch = { ...baseDateMatch };
    const vendorId = oid(query.vendorId);
    const campaignId = oid(query.campaignId);
    if (vendorId) {
      scopedMatch.vendorId = vendorId;
      campaignMatch.vendorId = vendorId;
    }
    if (campaignId) {
      scopedMatch.campaignId = campaignId;
      campaignMatch._id = campaignId;
    }
    if (query.status || query.state) campaignMatch.state = query.status || query.state;
    if (query.category) campaignMatch.category = query.category;
    if (query.search) {
      const re = new RegExp(escapeRegex(query.search), "i");
      campaignMatch.$or = [{ title: re }, { description: re }, { category: re }];
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodTotal = async (periodStart, periodEnd) => {
      const match = { createdAt: { $gte: periodStart, $lte: periodEnd } };
      if (vendorId) match.vendorId = vendorId;
      if (campaignId) match.campaignId = campaignId;
      const [fixedPeriodRows, commissionPeriodRows] = await Promise.all([
        PlatformRevenueTransaction.find(match).populate("campaignId", "paymentType").lean(),
        CommissionRecord.find(match).populate("campaignId", "paymentType").lean(),
      ]);
      const fixedTotal = fixedPeriodRows.reduce((sum, row) => {
        const modelKey = revenueModel(row.campaignId?.paymentType || row.paymentModel || "fixed");
        return selectedPaymentModel === "all" || selectedPaymentModel === modelKey ? sum + Number(row.platformFeeAmount || 0) : sum;
      }, 0);
      const commissionTotal = commissionPeriodRows.reduce((sum, row) => {
        const modelKey = revenueModel(row.campaignId?.paymentType === "hybrid" ? "hybrid" : "commission");
        return selectedPaymentModel === "all" || selectedPaymentModel === modelKey ? sum + Number(row.platformFee || 0) : sum;
      }, 0);
      return money(fixedTotal + commissionTotal);
    };

    const [
      fixedRows,
      commissionRows,
      freeProductCampaigns,
      configuredFeeRows,
      todaysRevenue,
      monthlyRevenue,
    ] = await Promise.all([
      PlatformRevenueTransaction.find(scopedMatch)
        .populate("campaignId", "title description category state paymentType fixedFee pricing fixedPaymentWorkflow createdAt")
        .populate("vendorId", "shopName companyName")
        .sort({ createdAt: -1 })
        .limit(500)
        .lean(),
      CommissionRecord.find(scopedMatch)
        .populate("campaignId", "title description category state paymentType fixedFee pricing createdAt")
        .populate("vendorId", "shopName companyName")
        .sort({ createdAt: -1 })
        .limit(1000)
        .lean(),
      selectedPaymentModel === "all" || selectedPaymentModel === "free_product" ? Campaign.find({ ...campaignMatch, paymentType: "free_product" })
        .populate("vendorId", "shopName companyName")
        .sort({ createdAt: -1 })
        .limit(200)
        .lean() : [],
      CampaignFeeConfiguration.find(selectedPaymentModel === "all" ? {} : {
        $or: [
          { paymentModel: selectedPaymentModel },
          { paymentModel: "all" },
          { paymentModel: "" },
          { paymentModel: { $exists: false } },
        ],
      }).sort({ feeCode: 1, effectiveFrom: -1, createdAt: -1 }).lean(),
      periodTotal(todayStart, now),
      periodTotal(monthStart, now),
    ]);

    const campaignAllows = (campaign = {}) => {
      if (!campaign || !campaign._id) return true;
      if ((query.status || query.state) && String(campaign.state || "") !== String(query.status || query.state)) return false;
      if (query.category && String(campaign.category || "") !== String(query.category)) return false;
      if (!query.search) return true;
      const haystack = `${campaign.title || ""} ${campaign.description || ""} ${campaign.category || ""}`.toLowerCase();
      return haystack.includes(String(query.search).toLowerCase());
    };
    const modelAllows = (modelKey) => selectedPaymentModel === "all" || selectedPaymentModel === modelKey;

    const modelMap = new Map(Object.keys(REVENUE_MODEL_LABELS).map((key) => [key, {
      model: key,
      label: REVENUE_MODEL_LABELS[key],
      fixedFeeRevenue: 0,
      commissionFeeRevenue: 0,
      totalPlatformRevenue: 0,
      grossRevenue: 0,
      influencerPayout: 0,
      campaignIds: new Set(),
      transactionCount: 0,
    }]));
    const campaignMap = new Map();
    const feeMap = new Map();
    const ensureModel = (key) => modelMap.get(key) || modelMap.get("commission");
    const ensureCampaign = (key, seed = {}) => {
      if (!campaignMap.has(key)) {
        campaignMap.set(key, {
          id: key,
          campaignId: seed.campaignId || null,
          campaignName: seed.campaignName || "Campaign",
          vendor: seed.vendor || "Vendor",
          vendorId: seed.vendorId || null,
          paymentModel: seed.paymentModel || "commission",
          paymentModelLabel: REVENUE_MODEL_LABELS[seed.paymentModel] || REVENUE_MODEL_LABELS.commission,
          campaignBudget: money(seed.campaignBudget || 0),
          fixedFeeRevenue: 0,
          commissionFeeRevenue: 0,
          totalPlatformRevenue: 0,
          gatewayFeeAmount: 0,
          taxAmount: 0,
          grossRevenue: 0,
          influencerPayout: 0,
          transactionCount: 0,
          commissionRecordCount: 0,
          campaignStatus: seed.campaignStatus || "",
          createdDate: seed.createdDate || null,
          sources: [],
        });
      }
      return campaignMap.get(key);
    };
    const ensureFeeRow = (key, seed = {}) => {
      if (!feeMap.has(key)) {
        feeMap.set(key, {
          id: key,
          feeName: seed.feeName || "Fee",
          feeCode: seed.feeCode || "",
          paymentModel: seed.paymentModel || selectedPaymentModel,
          paymentModelLabel: seed.paymentModelLabel || REVENUE_MODEL_LABELS[seed.paymentModel] || "All Models",
          feeType: seed.feeType || "",
          percentageValue: Number(seed.percentageValue || 0),
          fixedValue: money(seed.fixedValue),
          calculationBase: seed.calculationBase || "",
          source: seed.source || "",
          amount: 0,
          baseAmount: 0,
          campaignIds: new Set(),
          transactionCount: 0,
          configured: Boolean(seed.configured),
        });
      }
      return feeMap.get(key);
    };
    const addFeeLine = (line = {}, modelKey, campaignId, source) => {
      const key = `${modelKey}:${line.configurationId || line.feeCode || line.feeName || "fee"}:${line.feeCode || line.feeName || "Fee"}`;
      const feeRow = ensureFeeRow(key, {
        feeName: line.feeName || line.label || "Fee",
        feeCode: line.feeCode || "",
        paymentModel: modelKey,
        paymentModelLabel: REVENUE_MODEL_LABELS[modelKey],
        feeType: line.feeType || "",
        percentageValue: line.percentageValue,
        fixedValue: line.fixedValue,
        calculationBase: line.calculationBase,
        source,
      });
      feeRow.amount += money(line.amount);
      feeRow.baseAmount += money(line.baseAmount);
      feeRow.transactionCount += 1;
      if (campaignId) feeRow.campaignIds.add(String(campaignId));
    };

    fixedRows.forEach((row) => {
      const campaign = row.campaignId || {};
      const modelKey = revenueModel(campaign.paymentType || row.paymentModel || "fixed");
      if (!modelAllows(modelKey) || !campaignAllows(campaign)) return;
      const model = ensureModel(modelKey);
      const campaignKey = String(campaign._id || row.campaignId || `platform-${row._id}`);
      const campaignRow = ensureCampaign(campaignKey, {
        campaignId: campaign._id || row.campaignId,
        campaignName: campaign.title || "Campaign",
        vendor: vendorName(row.vendorId),
        vendorId: row.vendorId?._id || row.vendorId,
        paymentModel: modelKey,
        campaignBudget: campaignBudget(campaign, row.campaignBudget),
        campaignStatus: campaign.fixedPaymentWorkflow?.status || campaign.state || row.status,
        createdDate: campaign.createdAt || row.createdAt,
      });
      const fee = money(row.platformFeeAmount);
      model.fixedFeeRevenue += fee;
      model.totalPlatformRevenue += fee;
      model.transactionCount += 1;
      if (campaignRow.campaignId) model.campaignIds.add(String(campaignRow.campaignId));
      campaignRow.fixedFeeRevenue += fee;
      campaignRow.totalPlatformRevenue += fee;
      campaignRow.gatewayFeeAmount += money(row.gatewayFeeAmount);
      campaignRow.taxAmount += money(row.taxAmount);
      campaignRow.transactionCount += 1;
      campaignRow.sources.push({
        source: "platform_revenue_transactions.platformFeeAmount",
        amount: fee,
        recordedAt: row.createdAt,
        id: String(row._id),
      });
      (row.feeConfigurationSnapshot || []).forEach((line) => {
        addFeeLine(line, modelKey, campaignRow.campaignId, "platform_revenue_transactions.feeConfigurationSnapshot");
      });
    });

    commissionRows.forEach((row) => {
      const campaign = row.campaignId || {};
      const modelKey = revenueModel(campaign.paymentType === "hybrid" ? "hybrid" : "commission");
      if (!modelAllows(modelKey) || !campaignAllows(campaign)) return;
      const model = ensureModel(modelKey);
      const campaignKey = String(campaign._id || row.campaignId || `commission-${row._id}`);
      const campaignRow = ensureCampaign(campaignKey, {
        campaignId: campaign._id || row.campaignId,
        campaignName: campaign.title || "Unassigned commission traffic",
        vendor: vendorName(row.vendorId),
        vendorId: row.vendorId?._id || row.vendorId,
        paymentModel: modelKey,
        campaignBudget: campaignBudget(campaign),
        campaignStatus: campaign.state || row.state,
        createdDate: campaign.createdAt || row.createdAt,
      });
      const fee = money(row.platformFee);
      const gross = money(row.gross);
      const influencerShare = money(row.influencerShare);
      model.commissionFeeRevenue += fee;
      model.totalPlatformRevenue += fee;
      model.grossRevenue += gross;
      model.influencerPayout += influencerShare;
      model.transactionCount += 1;
      if (campaignRow.campaignId) model.campaignIds.add(String(campaignRow.campaignId));
      campaignRow.commissionFeeRevenue += fee;
      campaignRow.totalPlatformRevenue += fee;
      campaignRow.grossRevenue += gross;
      campaignRow.influencerPayout += influencerShare;
      campaignRow.commissionRecordCount += 1;
      campaignRow.sources.push({
        source: "commission_records.platformFee",
        amount: fee,
        recordedAt: row.createdAt,
        id: String(row._id),
      });
      addFeeLine({
        feeName: "Commission Platform Fee",
        feeCode: "platform_fee",
        feeType: "commission",
        amount: fee,
        baseAmount: gross,
        percentageValue: row.commissionPercent,
      }, modelKey, campaignRow.campaignId, "commission_records.platformFee");
    });

    freeProductCampaigns.forEach((campaign) => {
      const model = ensureModel("free_product");
      model.campaignIds.add(String(campaign._id));
      const campaignRow = ensureCampaign(String(campaign._id), {
        campaignId: campaign._id,
        campaignName: campaign.title || "Free product campaign",
        vendor: vendorName(campaign.vendorId),
        vendorId: campaign.vendorId?._id || campaign.vendorId,
        paymentModel: "free_product",
        campaignBudget: campaignBudget(campaign),
        campaignStatus: campaign.state,
        createdDate: campaign.createdAt,
      });
      campaignRow.sources.push({
        source: "No cash platform fee configured",
        amount: 0,
        recordedAt: campaign.createdAt,
        id: String(campaign._id),
      });
    });

    configuredFeeRows.forEach((config) => {
      const modelKey = selectedPaymentModel === "all" ? selectedRevenueModel(config.paymentModel) : selectedPaymentModel;
      const rowModel = modelKey === "all" ? "all" : revenueModel(modelKey);
      ensureFeeRow(`${rowModel}:${config._id}:${config.feeCode || config.feeName || "Fee"}`, {
        feeName: config.feeName,
        feeCode: config.feeCode,
        paymentModel: rowModel,
        paymentModelLabel: rowModel === "all" ? "All Models" : REVENUE_MODEL_LABELS[rowModel],
        feeType: config.feeType,
        percentageValue: config.percentageValue,
        fixedValue: config.fixedValue,
        calculationBase: config.calculationBase,
        source: "campaign_fee_configurations",
        configured: true,
      });
    });

    const modelBreakdown = Array.from(modelMap.values()).map((row) => ({
      model: row.model,
      label: row.label,
      fixedFeeRevenue: money(row.fixedFeeRevenue),
      commissionFeeRevenue: money(row.commissionFeeRevenue),
      totalPlatformRevenue: money(row.totalPlatformRevenue),
      grossRevenue: money(row.grossRevenue),
      influencerPayout: money(row.influencerPayout),
      campaignCount: row.campaignIds.size,
      transactionCount: row.transactionCount,
    }));
    const sourceBreakdown = [
      {
        source: "platform_revenue_transactions.platformFeeAmount",
        description: "Fixed payment cash platform fees, including the fixed-fee side of hybrid campaigns.",
        amount: money(modelBreakdown.reduce((total, row) => total + row.fixedFeeRevenue, 0)),
      },
      {
        source: "commission_records.platformFee",
        description: "Commission platform fees, including the commission side of hybrid campaigns.",
        amount: money(modelBreakdown.reduce((total, row) => total + row.commissionFeeRevenue, 0)),
      },
      {
        source: "Free Product",
        description: "No cash platform fee unless separately configured and recorded.",
        amount: money(modelMap.get("free_product")?.totalPlatformRevenue || 0),
      },
    ];
    const campaignWiseRevenue = Array.from(campaignMap.values())
      .map((row) => ({
        ...row,
        fixedFeeRevenue: money(row.fixedFeeRevenue),
        commissionFeeRevenue: money(row.commissionFeeRevenue),
        totalPlatformRevenue: money(row.totalPlatformRevenue),
        gatewayFeeAmount: money(row.gatewayFeeAmount),
        taxAmount: money(row.taxAmount),
        grossRevenue: money(row.grossRevenue),
        influencerPayout: money(row.influencerPayout),
      }))
      .sort((a, b) => b.totalPlatformRevenue - a.totalPlatformRevenue || new Date(b.createdDate || 0) - new Date(a.createdDate || 0))
      .slice(0, limit);
    const feeTableRows = Array.from(feeMap.values())
      .map((row) => ({
        ...row,
        amount: money(row.amount),
        baseAmount: money(row.baseAmount),
        fixedValue: money(row.fixedValue),
        campaignCount: row.campaignIds.size,
      }))
      .sort((a, b) => b.amount - a.amount || a.feeName.localeCompare(b.feeName));
    const feeCards = feeTableRows.map((row) => ({
      id: row.id,
      label: row.feeName,
      feeCode: row.feeCode,
      amount: row.amount,
      paymentModel: row.paymentModel,
      paymentModelLabel: row.paymentModelLabel,
      source: row.source,
    }));
    const modelTotal = (key) => money(modelMap.get(key)?.totalPlatformRevenue || 0);
    const totalPlatformRevenue = money(modelBreakdown.reduce((total, row) => total + row.totalPlatformRevenue, 0));

    return {
      selectedPaymentModel,
      kpis: {
        fixedPaymentRevenue: modelTotal("fixed"),
        commissionRevenue: modelTotal("commission"),
        hybridRevenue: modelTotal("hybrid"),
        freeProductRevenue: modelTotal("free_product"),
        totalPlatformRevenue,
        todaysRevenue,
        monthlyRevenue,
        periodRevenue: totalPlatformRevenue,
        grossRevenue: money(modelBreakdown.reduce((total, row) => total + row.grossRevenue, 0)),
        influencerPayout: money(modelBreakdown.reduce((total, row) => total + row.influencerPayout, 0)),
        fixedFeeSourceRevenue: sourceBreakdown[0].amount,
        commissionFeeSourceRevenue: sourceBreakdown[1].amount,
      },
      feeCards,
      feeTableRows,
      modelBreakdown,
      sourceBreakdown,
      campaignWiseRevenue,
      range: { start, end },
    };
  }

  async fixedRevenueDashboard(query = {}) {
    const { start, end } = parseRange(query);
    const match = {
      paymentModel: "fixed",
      createdAt: { $gte: start, $lte: end },
    };
    if (oid(query.vendorId)) match.vendorId = oid(query.vendorId);
    if (oid(query.campaignId)) match.campaignId = oid(query.campaignId);

    const todayStart = startOfDay(new Date());
    const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
    const [
      summaryRows,
      todayRows,
      monthRows,
      campaignRows,
      escrowRows,
      releaseRows,
    ] = await Promise.all([
      PlatformRevenueTransaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalPlatformRevenue: { $sum: "$platformFeeAmount" },
            gatewayExpense: { $sum: "$gatewayFeeAmount" },
            taxCollected: { $sum: "$taxAmount" },
            grossPaidAmount: { $sum: "$grossPaidAmount" },
            campaignBudget: { $sum: "$campaignBudget" },
            count: { $sum: 1 },
          },
        },
      ]),
      PlatformRevenueTransaction.aggregate([
        { $match: { ...match, createdAt: { $gte: todayStart, $lte: new Date() } } },
        { $group: { _id: null, amount: { $sum: "$platformFeeAmount" } } },
      ]),
      PlatformRevenueTransaction.aggregate([
        { $match: { ...match, createdAt: { $gte: monthStart, $lte: new Date() } } },
        { $group: { _id: null, amount: { $sum: "$platformFeeAmount" } } },
      ]),
      PlatformRevenueTransaction.find(match)
        .populate("campaignId", "title state fixedPaymentWorkflow")
        .populate("vendorId", "shopName companyName")
        .sort({ createdAt: -1 })
        .limit(Math.min(100, Number(query.limit) || 50))
        .lean(),
      CampaignEscrowWallet.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            ...(oid(query.vendorId) ? { vendorId: oid(query.vendorId) } : {}),
            ...(oid(query.campaignId) ? { campaignId: oid(query.campaignId) } : {}),
          },
        },
        {
          $group: {
            _id: null,
            pendingEscrowAmount: { $sum: "$amountRemaining" },
            releasedAmount: { $sum: "$amountReleased" },
            refundAmount: { $sum: "$amountRefunded" },
          },
        },
      ]),
      CampaignEscrowWallet.find({
        createdAt: { $gte: start, $lte: end },
        ...(oid(query.vendorId) ? { vendorId: oid(query.vendorId) } : {}),
        ...(oid(query.campaignId) ? { campaignId: oid(query.campaignId) } : {}),
      }).select("campaignId vendorId amountRemaining amountReleased amountRefunded").lean(),
    ]);

    const summary = summaryRows[0] || {};
    const escrow = escrowRows[0] || {};
    return {
      kpis: {
        totalFixedCampaignRevenue: money(summary.totalPlatformRevenue),
        revenueFromFixedCampaigns: money(summary.totalPlatformRevenue),
        todaysRevenue: money(todayRows[0]?.amount || 0),
        monthlyRevenue: money(monthRows[0]?.amount || 0),
        pendingEscrowAmount: money(escrow.pendingEscrowAmount),
        releasedAmount: money(escrow.releasedAmount),
        refundAmount: money(escrow.refundAmount),
        gatewayExpense: money(summary.gatewayExpense),
        taxCollected: money(summary.taxCollected),
        grossPaidAmount: money(summary.grossPaidAmount),
      },
      campaignWiseRevenue: campaignRows.map((row) => ({
        id: String(row._id),
        campaignId: row.campaignId?._id || row.campaignId,
        campaignName: row.campaignId?.title || "Campaign",
        vendor: vendorName(row.vendorId),
        vendorId: row.vendorId?._id || row.vendorId,
        campaignBudget: row.campaignBudget,
        platformFeePercentage: row.platformFeePercentage,
        platformRevenue: row.platformFeeAmount,
        gatewayFeeAmount: row.gatewayFeeAmount,
        taxAmount: row.taxAmount,
        campaignStatus: row.campaignId?.fixedPaymentWorkflow?.status || row.campaignId?.state || row.status,
        createdDate: row.createdAt,
      })),
      escrowSummaryRows: releaseRows,
      range: { start, end },
    };
  }

  async updateWithdrawalRequest(actor, requestId, payload = {}) {
    const nextStatus = String(payload.status || payload.action || "").toUpperCase();
    const allowed = ["UNDER_REVIEW", "APPROVED", "PROCESSING", "COMPLETED", "REJECTED", "CANCELLED", "FAILED"];
    if (!allowed.includes(nextStatus)) throw new AppError("Unsupported withdrawal status", 400, "INVALID_WITHDRAWAL_STATUS");

    const request = await InfluencerWithdrawalRequest.findById(requestId);
    if (!request) throw new AppError("Withdrawal request not found", 404, "NOT_FOUND");
    const current = request.status;
    const transitions = {
      REQUESTED: ["UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"],
      UNDER_REVIEW: ["APPROVED", "REJECTED", "CANCELLED"],
      APPROVED: ["PROCESSING", "REJECTED", "CANCELLED"],
      PROCESSING: ["COMPLETED", "FAILED"],
      FAILED: ["PROCESSING", "CANCELLED"],
    };
    if (!transitions[current]?.includes(nextStatus)) {
      throw new AppError(`Cannot move withdrawal from ${current} to ${nextStatus}`, 409, "INVALID_WITHDRAWAL_TRANSITION");
    }

    const now = new Date();
    const update = {
      status: nextStatus,
      transactionReference: payload.transactionReference || request.transactionReference || "",
      rejectionReason: ["REJECTED", "FAILED", "CANCELLED"].includes(nextStatus) ? payload.reason || payload.rejectionReason || "" : request.rejectionReason,
      metadata: {
        ...(request.metadata || {}),
        lastActionBy: actor?.sub || actor?._id || actor?.id || null,
        lastActionAt: now,
        lastActionReason: payload.reason || payload.note || "",
      },
    };
    if (nextStatus === "APPROVED") update.approvedAt = now;
    if (nextStatus === "PROCESSING") update.processedAt = now;
    if (nextStatus === "COMPLETED") update.completedAt = now;

    request.set(update);
    await request.save();

    if (["REJECTED", "CANCELLED", "FAILED"].includes(nextStatus)) {
      const ledgerEntry = await InfluencerLedger.findOne({
        influencerId: request.influencerId,
        "meta.withdrawalRequestId": request._id,
        type: "DEBIT",
        source: "WITHDRAWAL",
      }).lean();
      const alreadyReversed = await InfluencerLedger.findOne({
        idempotencyKey: `withdrawal-reversal:${request._id}`,
      }).lean();
      if (ledgerEntry && !alreadyReversed) {
        const wallet = await InfluencerWallet.findByIdAndUpdate(
          request.walletId,
          { $inc: { availableBalance: request.amount } },
          { returnDocument: "after", runValidators: true }
        );
        await InfluencerLedger.create({
          influencerId: request.influencerId,
          type: "CREDIT",
          amount: request.amount,
          source: "WITHDRAWAL_REVERSAL",
          idempotencyKey: `withdrawal-reversal:${request._id}`,
          balanceAfter: wallet.availableBalance,
          meta: {
            withdrawalRequestId: request._id,
            originalLedgerId: ledgerEntry._id,
            status: nextStatus,
          },
        });
      }
    }
    if (nextStatus === "COMPLETED") {
      await InfluencerWallet.findByIdAndUpdate(
        request.walletId,
        { $inc: { withdrawnBalance: request.amount } },
        { runValidators: true }
      );
      await emitDomainEvent("WITHDRAWAL_COMPLETED", {
        withdrawalRequestId: request._id,
        influencerId: request.influencerId,
        amount: request.amount,
      }).catch(() => null);
    }

    await auditService.log({
      actor,
      action: "admin.influencer_commerce.withdrawal.status_updated",
      entityType: "InfluencerWithdrawalRequest",
      entityId: request._id,
      metadata: { oldStatus: current, newStatus: nextStatus, amount: request.amount },
    }).catch(() => {});

    const influencer = await InfluencerProfile.findById(request.influencerId).select("userId").lean();
    if (influencer?.userId && ["APPROVED", "COMPLETED", "REJECTED", "FAILED"].includes(nextStatus)) {
      await notificationService.createNotification({
        userId: influencer.userId,
        role: "INFLUENCER",
        module: "FINANCE",
        subModule: "INFLUENCER_WITHDRAWALS",
        type: "WITHDRAWAL_STATUS_UPDATED",
        title: "Withdrawal status updated",
        message: `Your withdrawal request is now ${nextStatus.replace(/_/g, " ").toLowerCase()}.`,
        referenceId: request._id,
        meta: { withdrawalRequestId: String(request._id), status: nextStatus },
      }).catch(() => null);
    }

    return request.toObject();
  }

  async settings() {
    return {
      enabled: await isInfluencerCommerceEnabled(),
      defaultCommissionRate: Number(process.env.INFLUENCER_DEFAULT_COMMISSION_RATE || 10),
      maximumCommissionRate: Number(process.env.INFLUENCER_MAX_COMMISSION_RATE || 50),
      commissionHoldDays: Number(process.env.INFLUENCER_HOLD_DAYS || 7),
      trackingCookieDurationHours: Number(process.env.INFLUENCER_TRACKING_TTL_HOURS || 24),
      selfAttributionBlocking: true,
      fraudDetectionThresholds: { repeatedClicks: 10, conversionSpike: 5 },
      campaignApprovalRules: { adminOverrideEnabled: true },
      contentApprovalRules: { vendorAndAdminModeration: true },
      autoSettlementRules: { enabled: true },
      payoutProcessingRules: { manualReviewRequired: true },
    };
  }

  async updateSettings(actor, payload = {}) {
    if (payload.enabled !== undefined) {
      await PlatformConfig.findOneAndUpdate(
        { key: "influencer_commerce_enabled" },
        {
          $set: {
            value: Boolean(payload.enabled),
            description: "Master switch for influencer commerce, vendor campaign tools, reels, and attribution.",
            category: "feature",
            type: "boolean",
            isPublic: true,
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
      invalidateInfluencerCommerceConfigCache();
    }
    await auditService.log({ actor, action: "admin.influencer_commerce.settings.update", entityType: "PlatformConfig", entityId: "influencer_commerce", metadata: payload }).catch(() => {});
    return this.settings();
  }

  async auditLogs(query = {}) {
    const { page, limit, skip } = pageOptions(query);
    const filter = { action: /influencer_commerce|influencer|campaign|commission|content/i };
    const [items, total] = await Promise.all([
      AuditLog.find(filter).populate("actorId", "name email role").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);
    return { items, pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 } };
  }
}

module.exports = new AdminInfluencerCommerceService();
