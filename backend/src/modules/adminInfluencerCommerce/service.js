const mongoose = require("mongoose");
const auditService = require("../../services/audit.service");
const notificationService = require("../../services/notification.service");
const { isInfluencerCommerceEnabled, invalidateInfluencerCommerceConfigCache } = require("../../services/influencer-commerce-config.service");
const influencerRateCardService = require("../../services/influencer-rate-card.service");
const { AppError } = require("../../utils/AppError");
const { Campaign } = require("../campaign/model");
const {
  InfluencerProfile,
  InfluencerApplication,
  InfluencerSocialAccount,
  InfluencerBusinessProfile,
  InfluencerPaymentProfile,
  InfluencerProductAssignment,
  AffiliateLink,
} = require("../influencer/model");
const {
  CommissionRecord,
  InfluencerWallet,
  InfluencerPayoutAccount,
} = require("../commission/models");
const { TrackingSession } = require("../tracking/model");

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

    return {
      kpis: {
        totalInfluencers,
        activeInfluencers,
        totalVendors,
        activeCampaigns,
        campaignRevenue: money(summary.revenue),
        commissionPaid: money(summary.paid),
        escrowBalance: money(summary.pending),
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
    if (payload.marketplace?.requirements !== undefined) allowed["marketplace.requirements"] = payload.marketplace.requirements;
    if (payload.marketplace?.assets !== undefined) allowed["marketplace.assets"] = payload.marketplace.assets;
    if (!Object.keys(allowed).length) throw new AppError("No campaign updates supplied", 400, "VALIDATION_ERROR");
    const pricingKeys = new Set(["commissionPercent", "fixedFee", "paymentType", "attributionWindowDays", "pricing", "paymentModelSnapshot", "influencerRateSnapshot", "requirementsSnapshot"]);
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
      const recommended = Boolean(relationship?.saved || ["saved", "invited", "approved", "active"].includes(relationshipStatus));
      return {
        ...match,
        id: `${match.vendor?._id}:${match.influencer?._id}`,
        vendorId: match.vendor?._id,
        influencerId: match.influencer?._id,
        vendorName: vendorName(match.vendor),
        influencerName: influencerName(match.influencer),
        relationshipId: relationship?._id,
        relationshipStatus,
        recommended,
      };
    });
    return { recommendedInfluencersForVendor: matches, recommendedCampaigns: campaigns, recommendedProducts: products };
  }

  async recommendMatch(actor, payload = {}) {
    const vendorId = oid(payload.vendorId);
    const influencerId = oid(payload.influencerId);
    if (!vendorId || !influencerId) throw new AppError("Vendor and influencer are required", 400, "VALIDATION_ERROR");

    const [vendor, influencer] = await Promise.all([
      Vendor.findById(vendorId).lean(),
      InfluencerProfile.findById(influencerId).populate("userId", "name email").lean(),
    ]);
    if (!vendor) throw new AppError("Vendor not found", 404, "NOT_FOUND");
    if (!influencer) throw new AppError("Influencer not found", 404, "NOT_FOUND");

    const recommended = payload.recommended !== false;
    const now = new Date();
    const update = recommended
      ? {
        $set: {
          vendorId,
          influencerId,
          status: "invited",
          source: "manual",
          saved: true,
          lastActivityAt: now,
          notes: payload.note || (recommended ? "Recommended by platform admin" : "Recommendation removed by platform admin"),
          "metricsSnapshot.calculatedAt": now,
        },
        $unset: { pausedAt: "" },
        $setOnInsert: { activeCampaignIds: [] },
      }
      : {
        $set: {
          status: "paused",
          source: "manual",
          saved: false,
          lastActivityAt: now,
          pausedAt: now,
          notes: payload.note || "Recommendation removed by platform admin",
          "metricsSnapshot.calculatedAt": now,
        },
      };
    const relationship = await VendorInfluencerRelationship.findOneAndUpdate(
      { vendorId, influencerId },
      update,
      { upsert: recommended, returnDocument: "after", setDefaultsOnInsert: true }
    );
    if (!relationship) throw new AppError("Recommendation not found", 404, "NOT_FOUND");

    await auditService.log({
      actor,
      action: recommended ? "admin.influencer_commerce.match.recommend" : "admin.influencer_commerce.match.unrecommend",
      entityType: "VendorInfluencerRelationship",
      entityId: relationship._id,
      metadata: { vendorId: String(vendorId), influencerId: String(influencerId), note: payload.note || "" },
    }).catch(() => {});

    if (recommended) {
      await notificationService.notifyVendorUser(vendorId, {
        module: "GROWTH",
        subModule: "INFLUENCER_COMMERCE",
        type: "INFLUENCER_MATCH_RECOMMENDATION",
        title: "Influencer match recommended",
        message: `Platform admin recommended ${influencerName(influencer)} for ${vendorName(vendor)}.`,
        referenceId: influencerId,
      }).catch(() => {});
    }

    return {
      relationship,
      recommended,
      vendorId,
      influencerId,
      vendorName: vendorName(vendor),
      influencerName: influencerName(influencer),
    };
  }

  async affiliateLinks(query = {}) {
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 100));
    const filter = {};
    if (query.status) filter.status = query.status;
    if (oid(query.influencerId)) filter.influencerId = oid(query.influencerId);
    if (oid(query.campaignId)) filter.campaignId = oid(query.campaignId);
    if (oid(query.productId)) filter.productId = oid(query.productId);
    const rows = await AffiliateLink.find(filter)
      .populate({ path: "influencerId", populate: { path: "userId", select: "name email" } })
      .populate("productId", "name")
      .populate("campaignId", "title")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return {
      items: rows.map((row) => ({
        id: row._id,
        affiliateCode: row.affiliateCode,
        status: row.status,
        influencerName: influencerName(row.influencerId),
        productName: row.productId?.name || "",
        campaignTitle: row.campaignId?.title || "",
        label: [row.affiliateCode, influencerName(row.influencerId), row.productId?.name || row.campaignId?.title].filter(Boolean).join(" - "),
      })),
    };
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
    const [wallets, total] = await Promise.all([
      InfluencerWallet.find({}).populate({ path: "influencerId", populate: { path: "userId", select: "name email" } }).sort({ totalEarnings: -1 }).skip(skip).limit(limit).lean(),
      InfluencerWallet.countDocuments({}),
    ]);
    const accountIds = wallets.map((wallet) => wallet.influencerId?._id || wallet.influencerId);
    const accounts = await InfluencerPayoutAccount.find({ influencerId: { $in: accountIds }, isActive: true }).lean();
    const accountMap = new Map(accounts.map((account) => [String(account.influencerId), account]));
    return {
      items: wallets.map((wallet) => ({ ...wallet, influencerName: influencerName(wallet.influencerId), payoutAccount: accountMap.get(String(wallet.influencerId?._id || wallet.influencerId)) })),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    };
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
