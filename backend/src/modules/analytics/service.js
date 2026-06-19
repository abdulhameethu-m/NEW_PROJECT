const mongoose = require("mongoose");
const { Order } = require("../../models/Order");
const { Vendor } = require("../../models/Vendor");
const { User } = require("../../models/User");
const { Campaign } = require("../campaign/model");
const CampaignEscrowWallet = require("../../models/CampaignEscrowWallet");
const CampaignPaymentRelease = require("../../models/CampaignPaymentRelease");
const CampaignRefund = require("../../models/CampaignRefund");
const { TrackingSession } = require("../tracking/model");
const { CampaignDeliverable, DeliverableSubmission, DeliverablePayout } = require("../campaign/executionModel");
const { InfluencerProfile } = require("../influencer/model");
const {
  CampaignAffiliateClick,
  CampaignAffiliateAttribution,
  AffiliateConversion,
  CommissionSnapshot,
  CommissionEarning,
  CommissionRecord,
  CommissionWalletTransaction,
  CampaignBudgetTracker,
  InfluencerWallet,
  InfluencerWithdrawalRequest,
} = require("../commission/models");
const { registerHandler } = require("../events/event-bus");
const { INFLUENCER_EVENTS } = require("../shared/constants");
const auditService = require("../../services/audit.service");
const vendorRepo = require("../../repositories/vendor.repository");
const { AppError } = require("../../utils/AppError");
const { logger } = require("../../utils/logger");
const {
  AnalyticsEvent,
  CampaignMetrics,
  VendorMetrics,
  InfluencerMetrics,
  AdminMetrics,
} = require("./models");

const ACTIVE_CAMPAIGN_STATES = new Set(["active", "product_shipped", "content_in_progress", "content_submitted", "under_review", "approved", "published", "tracking_active", "partially_completed"]);
const COMPLETED_CAMPAIGN_STATES = new Set(["completed", "fully_released"]);
const REVENUE_ORDER_STATUSES = new Set(["Placed", "Packed", "Shipped", "Out for Delivery", "Delivered"]);
const PAID_COMMISSION_STATES = new Set(["APPROVED", "PAID"]);

function money(value = 0) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

function pct(numerator = 0, denominator = 0) {
  const den = Number(denominator || 0);
  if (!den) return 0;
  return money((Number(numerator || 0) / den) * 100);
}

function id(value) {
  return mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : null;
}

function dateRange(query = {}) {
  const rangeDays = Number(query.range || query.days || 0);
  const endDate = query.endDate ? new Date(query.endDate) : rangeDays ? new Date() : null;
  const startDate = query.startDate
    ? new Date(query.startDate)
    : rangeDays
      ? new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000)
      : null;
  const range = {};
  if (startDate && !Number.isNaN(startDate.getTime())) range.$gte = startDate;
  if (endDate && !Number.isNaN(endDate.getTime())) range.$lte = endDate;
  return {
    startDate: range.$gte || null,
    endDate: range.$lte || null,
    mongo: Object.keys(range).length ? range : null,
    persist: !Object.keys(range).length,
  };
}

function withDate(match, range, field = "createdAt") {
  if (range?.mongo) match[field] = range.mongo;
  return match;
}

function first(rows = []) {
  return rows[0] || {};
}

function sum(rows = [], key) {
  return money(rows.reduce((total, row) => total + Number(row[key] || 0), 0));
}

function breakdownKey(value) {
  return String(value || "unknown").trim() || "unknown";
}

function addBreakdown(breakdown, key, patch) {
  const normalized = breakdownKey(key);
  const current = breakdown[normalized] || {};
  breakdown[normalized] = {
    campaigns: Number(current.campaigns || 0) + Number(patch.campaigns || 0),
    orders: Number(current.orders || 0) + Number(patch.orders || 0),
    revenue: money(Number(current.revenue || 0) + Number(patch.revenue || 0)),
    spend: money(Number(current.spend || 0) + Number(patch.spend || 0)),
    earnings: money(Number(current.earnings || 0) + Number(patch.earnings || 0)),
  };
}

function totalsFromCampaignMetrics(rows = []) {
  const breakdown = {};
  const totals = rows.reduce(
    (acc, row) => {
      const paymentModel = breakdownKey(row.paymentModel);
      const spend = money(Number(row.released || 0) + Number(row.commissionApproved || row.commissionPaid || 0) + Number(row.productValue || 0));
      addBreakdown(breakdown, paymentModel, {
        campaigns: 1,
        orders: row.orders,
        revenue: row.revenue,
        spend,
        earnings: row.totalEarnings,
      });
      acc.campaignCount += 1;
      if (ACTIVE_CAMPAIGN_STATES.has(String(row.state || ""))) acc.activeCampaigns += 1;
      if (COMPLETED_CAMPAIGN_STATES.has(String(row.state || ""))) acc.completedCampaigns += 1;
      acc.orders += Number(row.orders || 0);
      acc.revenue += Number(row.revenue || 0);
      acc.platformRevenue += Number(row.platformRevenue || 0);
      acc.commission += Number(row.commission || 0);
      acc.commissionPaid += Number(row.commissionPaid || row.commissionApproved || 0);
      acc.escrow += Number(row.escrow || 0);
      acc.released += Number(row.released || 0);
      acc.unreleased += Number(row.unreleased || 0);
      acc.refund += Number(row.refund || 0);
      acc.fixedEarnings += Number(row.fixedEarnings || 0);
      acc.commissionEarnings += Number(row.commissionEarnings || 0);
      acc.totalEarnings += Number(row.totalEarnings || 0);
      return acc;
    },
    {
      campaignCount: 0,
      activeCampaigns: 0,
      completedCampaigns: 0,
      orders: 0,
      revenue: 0,
      platformRevenue: 0,
      commission: 0,
      commissionPaid: 0,
      escrow: 0,
      released: 0,
      unreleased: 0,
      refund: 0,
      fixedEarnings: 0,
      commissionEarnings: 0,
      totalEarnings: 0,
    }
  );
  Object.keys(totals).forEach((key) => {
    if (typeof totals[key] === "number") totals[key] = money(totals[key]);
  });
  return { ...totals, paymentModelBreakdown: breakdown };
}

async function aggregateSum(Model, match, fields) {
  const group = { _id: null };
  Object.entries(fields).forEach(([alias, field]) => {
    group[alias] = field && typeof field === "object" && field.$sum !== undefined
      ? field
      : { $sum: typeof field === "string" ? `$${field}` : field };
  });
  const rows = await Model.aggregate([{ $match: match }, { $group: group }]);
  return first(rows);
}

class AnalyticsAggregator {
  async recordEvent(eventType, { entityType = "", entityId = null, payload = {}, actor = {} } = {}) {
    const event = await AnalyticsEvent.create({
      eventType,
      entityType,
      entityId: id(entityId) || undefined,
      actorId: id(actor?._id || actor?.sub || actor?.id) || undefined,
      actorRole: actor?.role || actor?.type || "",
      payload,
    });
    return event.toObject();
  }

  async buildCampaignMetrics(campaignId, query = {}, { persist = true } = {}) {
    const campaignObjectId = id(campaignId);
    if (!campaignObjectId) throw new AppError("Invalid campaign id", 400, "INVALID_CAMPAIGN");
    const range = dateRange(query);
    const shouldPersist = persist && range.persist;
    const campaign = await Campaign.findById(campaignObjectId).lean();
    if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");

    const orderMatch = withDate({ "attribution.campaignId": campaignObjectId, status: { $in: [...REVENUE_ORDER_STATUSES] } }, range);
    const clickMatch = withDate({ campaignId: campaignObjectId }, range);
    const conversionMatch = withDate({ campaignId: campaignObjectId }, range, "convertedAt");
    const releaseMatch = withDate({ campaignId: campaignObjectId }, range);
    const refundMatch = withDate({ campaignId: campaignObjectId }, range);
    const deliverableMatch = { campaignId: campaignObjectId };

    const [
      orderAgg,
      affiliateClickCount,
      attributionCount,
      conversionAgg,
      snapshotAgg,
      earningAgg,
      recordAgg,
      budgetTracker,
      escrow,
      releaseAgg,
      refundAgg,
      deliverableAgg,
      submissionCount,
      payoutAgg,
    ] = await Promise.all([
      aggregateSum(Order, orderMatch, {
        orders: 1,
        revenue: { $sum: { $ifNull: ["$totalAmount", "$subtotal"] } },
        platformRevenue: "$platformCommissionAmount",
        refund: { $sum: { $ifNull: ["$refundSummary.grossAmount", 0] } },
      }),
      CampaignAffiliateClick.countDocuments(clickMatch),
      CampaignAffiliateAttribution.countDocuments(clickMatch),
      AffiliateConversion.aggregate([{ $match: conversionMatch }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: "$orderRevenue" }, commission: { $sum: "$commissionAmount" } } }]),
      CommissionSnapshot.aggregate([{ $match: withDate({ campaignId: campaignObjectId }, range) }, { $group: { _id: null, count: { $sum: 1 }, commission: { $sum: "$finalEarnings" }, gross: { $sum: "$grossSale" }, eligible: { $sum: "$eligibleRevenue" } } }]),
      CommissionEarning.aggregate([{ $match: withDate({ campaignId: campaignObjectId }, range) }, { $group: { _id: "$status", amount: { $sum: "$commissionAmount" }, count: { $sum: 1 } } }]),
      CommissionRecord.aggregate([{ $match: withDate({ campaignId: campaignObjectId }, range) }, { $group: { _id: "$state", gross: { $sum: "$gross" }, commission: { $sum: "$influencerShare" }, count: { $sum: 1 } } }]),
      CampaignBudgetTracker.findOne({ campaignId: campaignObjectId }).lean(),
      CampaignEscrowWallet.findOne({ campaignId: campaignObjectId }).lean(),
      CampaignPaymentRelease.aggregate([{ $match: releaseMatch }, { $group: { _id: "$status", amount: { $sum: "$totalAmount" }, net: { $sum: "$netAmount" }, count: { $sum: 1 } } }]),
      CampaignRefund.aggregate([{ $match: refundMatch }, { $group: { _id: "$status", amount: { $sum: "$totalRefundAmount" }, count: { $sum: 1 } } }]).catch(() => []),
      CampaignDeliverable.aggregate([
        { $match: deliverableMatch },
        { $group: { _id: "$approvalStatus", count: { $sum: 1 }, value: { $sum: "$totalPrice" } } },
      ]),
      DeliverableSubmission.countDocuments(withDate({ campaignId: campaignObjectId }, range, "submittedAt")),
      DeliverablePayout.aggregate([{ $match: withDate({ campaignId: campaignObjectId }, range) }, { $group: { _id: "$status", amount: { $sum: "$approvedAmount" }, count: { $sum: 1 } } }]),
    ]);

    const conversions = first(conversionAgg);
    const snapshots = first(snapshotAgg);
    const clicks = Number(affiliateClickCount || 0);
    const orders = Number(conversions.count || orderAgg.orders || 0);
    const revenue = money(conversions.revenue || orderAgg.revenue || snapshots.gross || 0);
    const commissionByStatus = Object.fromEntries((earningAgg || []).map((row) => [row._id, row]));
    const recordsByState = Object.fromEntries((recordAgg || []).map((row) => [row._id, row]));
    const releaseByStatus = Object.fromEntries((releaseAgg || []).map((row) => [row._id, row]));
    const refund = sum(refundAgg || [], "amount") || money(orderAgg.refund || 0);
    const deliverableByStatus = Object.fromEntries((deliverableAgg || []).map((row) => [row._id, row]));
    const payoutByStatus = Object.fromEntries((payoutAgg || []).map((row) => [row._id, row]));
    const released = money((releaseByStatus.released?.amount || 0) + (releaseByStatus.settled?.amount || 0));
    const pendingReleases = money((releaseByStatus.pending_approval?.amount || 0) + (releaseByStatus.approved?.amount || 0));
    const commissionGenerated = money(snapshots.commission || recordsByState.HOLD?.commission || conversions.commission || 0);
    const commissionApproved = money(
      (commissionByStatus.APPROVED?.amount || 0) +
        (commissionByStatus.PAID?.amount || 0) ||
        (recordsByState.SETTLED?.commission || 0)
    );
    const commissionPaid = money(commissionByStatus.PAID?.amount || 0);
    const pendingCommission = money((commissionByStatus.PENDING?.amount || 0) + (recordsByState.HOLD?.commission || 0));
    const paymentModel = campaign.paymentType || campaign.paymentModelSnapshot?.paymentType || "commission";
    const escrowFunded = money(escrow?.amountFunded || escrow?.totalEscrowAmount || 0);
    const unreleased = money(escrow?.amountRemaining ?? Math.max(0, escrowFunded - released - refund));
    const productValue = money(campaign.paymentModelSnapshot?.productValue || campaign.pricing?.productCost || 0);
    const deliverableTotal = (deliverableAgg || []).reduce((total, row) => total + Number(row.count || 0), 0);
    const deliverablesApproved = Number(deliverableByStatus.approved?.count || 0);
    const deliverablesRejected = Number(deliverableByStatus.rejected?.count || 0);
    const deliverablesReleased = Number((payoutByStatus.released?.count || 0) + (releaseByStatus.released?.count || 0) + (releaseByStatus.settled?.count || 0));
    const fixedEarnings = ["fixed", "hybrid"].includes(paymentModel) ? released : 0;
    const commissionEarnings = ["commission", "hybrid"].includes(paymentModel) ? commissionApproved || commissionGenerated : 0;
    const totalEarnings = money(fixedEarnings + commissionEarnings);
    const spend = money(released + commissionApproved + productValue);

    const metrics = {
      campaignId: campaign._id,
      vendorId: campaign.vendorId,
      influencerId: campaign.influencerId,
      paymentModel,
      state: campaign.state || "",
      clicks,
      orders,
      attributedOrders: Math.max(Number(attributionCount || 0), Number(conversions.count || 0), orders),
      revenue,
      campaignRevenue: revenue,
      platformRevenue: money(orderAgg.platformRevenue || 0),
      commission: commissionGenerated,
      commissionGenerated,
      commissionApproved,
      commissionPaid,
      pendingCommission,
      fixedEarnings,
      commissionEarnings,
      totalEarnings,
      escrow: escrowFunded,
      escrowFunded,
      released,
      unreleased,
      refund,
      productsShipped: ["product_shipped", "content_in_progress", "content_submitted", "approved", "published", "tracking_active", "completed"].includes(campaign.state) ? campaign.productIds?.length || 0 : 0,
      productsDelivered: ["completed", "published", "tracking_active"].includes(campaign.state) ? campaign.productIds?.length || 0 : 0,
      productsPending: Math.max(0, (campaign.productIds?.length || 0) - (["completed", "published", "tracking_active"].includes(campaign.state) ? campaign.productIds?.length || 0 : 0)),
      productValue,
      deliverablesSubmitted: Number(submissionCount || 0),
      deliverablesApproved,
      deliverablesRejected,
      deliverablesReleased,
      campaignCompletionPercent: pct(deliverablesApproved, deliverableTotal || (campaign.marketplace?.requiredDeliverables || []).length),
      conversionRate: pct(orders, clicks),
      averageOrderValue: orders ? money(revenue / orders) : 0,
      roi: spend ? pct(revenue - spend, spend) : 0,
      remainingBudget: money(budgetTracker?.remainingBudget || 0),
      remainingCap: money(budgetTracker?.remainingCap || 0),
      lastAggregatedAt: new Date(),
      metadata: {
        pendingReleases,
        source: "analytics_aggregator",
        range: { startDate: range.startDate, endDate: range.endDate },
      },
    };

    if (!shouldPersist) return metrics;
    const saved = await CampaignMetrics.findOneAndUpdate(
      { campaignId: campaign._id },
      { $set: metrics },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ).lean();
    await auditService.log({
      action: "analytics.campaign_metrics.updated",
      entityType: "CampaignMetrics",
      entityId: saved?._id,
      metadata: { campaignId: String(campaign._id), paymentModel },
    }).catch(() => {});
    return saved || metrics;
  }

  async rebuildCampaignMetrics(query = {}) {
    const match = {};
    if (query.paymentModel && query.paymentModel !== "all") match.paymentType = query.paymentModel;
    if (id(query.vendorId)) match.vendorId = id(query.vendorId);
    if (id(query.influencerId)) match.influencerId = id(query.influencerId);
    const campaigns = await Campaign.find(match).select("_id").lean();
    const rows = [];
    for (const campaign of campaigns) rows.push(await this.buildCampaignMetrics(campaign._id, query, { persist: true }));
    return rows;
  }

  async getCampaignAnalytics(campaignId, query = {}) {
    return this.buildCampaignMetrics(campaignId, query, { persist: true });
  }

  async getVendorAnalytics(userIdOrVendorId, query = {}) {
    const vendor = mongoose.isValidObjectId(userIdOrVendorId)
      ? (await vendorRepo.findByUserId(userIdOrVendorId)) || (await Vendor.findById(userIdOrVendorId).lean())
      : null;
    if (!vendor) throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
    const campaignRows = await this.rebuildCampaignMetrics({ ...query, vendorId: vendor._id });
    const campaignTotals = totalsFromCampaignMetrics(campaignRows);
    const commerceOrders = await aggregateSum(Order, withDate({ sellerId: vendor._id, status: { $in: [...REVENUE_ORDER_STATUSES] } }, dateRange(query)), {
      orders: 1,
      revenue: { $sum: { $ifNull: ["$totalAmount", "$subtotal"] } },
      platformRevenue: "$platformCommissionAmount",
    });
    const totalCampaignSpend = money(campaignTotals.released + campaignTotals.commissionPaid + campaignTotals.refund);
    const metrics = {
      vendorId: vendor._id,
      campaignCount: campaignTotals.campaignCount,
      activeCampaigns: campaignTotals.activeCampaigns,
      completedCampaigns: campaignTotals.completedCampaigns,
      orders: Number(commerceOrders.orders || campaignTotals.orders || 0),
      revenue: money(commerceOrders.revenue || campaignTotals.revenue || 0),
      campaignRevenue: campaignTotals.revenue,
      totalCampaignSpend,
      commissionPaid: campaignTotals.commissionPaid,
      influencerEarnings: campaignTotals.totalEarnings,
      platformRevenue: money(commerceOrders.platformRevenue || campaignTotals.platformRevenue || 0),
      totalEscrow: campaignTotals.escrow,
      totalReleased: campaignTotals.released,
      pendingReleases: money(campaignTotals.unreleased),
      roi: totalCampaignSpend ? pct(campaignTotals.revenue - totalCampaignSpend, totalCampaignSpend) : 0,
      paymentModelBreakdown: campaignTotals.paymentModelBreakdown,
      lastAggregatedAt: new Date(),
    };
    if (dateRange(query).persist) {
      await VendorMetrics.findOneAndUpdate({ vendorId: vendor._id }, { $set: metrics }, { upsert: true, setDefaultsOnInsert: true });
    }
    return { metrics, campaigns: campaignRows };
  }

  async getInfluencerAnalytics(userIdOrInfluencerId, query = {}) {
    const profile = mongoose.isValidObjectId(userIdOrInfluencerId)
      ? (await InfluencerProfile.findOne({ userId: userIdOrInfluencerId }).lean()) || (await InfluencerProfile.findById(userIdOrInfluencerId).lean())
      : null;
    if (!profile) throw new AppError("Influencer profile not found", 404, "INFLUENCER_NOT_FOUND");
    const campaignRows = await this.rebuildCampaignMetrics({ ...query, influencerId: profile._id });
    const campaignTotals = totalsFromCampaignMetrics(campaignRows);
    const [wallet, withdrawals, walletCredits] = await Promise.all([
      InfluencerWallet.findOne({ influencerId: profile._id }).lean(),
      InfluencerWithdrawalRequest.aggregate([{ $match: withDate({ influencerId: profile._id }, dateRange(query), "requestedAt") }, { $group: { _id: "$status", amount: { $sum: "$amount" }, count: { $sum: 1 } } }]),
      CommissionWalletTransaction.aggregate([{ $match: withDate({ influencerId: profile._id, type: "CREDIT" }, dateRange(query)) }, { $group: { _id: "$source", amount: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    ]);
    const completedWithdrawals = withdrawals.filter((row) => ["COMPLETED", "PAID", "PROCESSED"].includes(row._id)).reduce((total, row) => total + Number(row.amount || 0), 0);
    const pendingWithdrawals = withdrawals.filter((row) => ["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROCESSING"].includes(row._id)).reduce((total, row) => total + Number(row.amount || 0), 0);
    const credited = sum(walletCredits, "amount");
    const metrics = {
      influencerId: profile._id,
      campaignCount: campaignTotals.campaignCount,
      campaignsJoined: campaignTotals.campaignCount,
      campaignsCompleted: campaignTotals.completedCampaigns,
      orders: campaignTotals.orders,
      earnings: money(credited || campaignTotals.totalEarnings),
      fixedEarnings: campaignTotals.fixedEarnings,
      commissionEarnings: campaignTotals.commissionEarnings,
      hybridEarnings: money(campaignTotals.paymentModelBreakdown.hybrid?.earnings || 0),
      pendingBalance: money(campaignTotals.commission - campaignTotals.commissionPaid + campaignTotals.unreleased),
      availableBalance: money(wallet?.availableBalance ?? wallet?.balance ?? 0),
      withdrawn: money(completedWithdrawals),
      pendingWithdrawals: money(pendingWithdrawals),
      productsReceived: sum(campaignRows, "productsDelivered"),
      productValue: sum(campaignRows, "productValue"),
      pendingDeliveries: sum(campaignRows, "productsPending"),
      paymentModelBreakdown: campaignTotals.paymentModelBreakdown,
      lastAggregatedAt: new Date(),
    };
    if (dateRange(query).persist) {
      await InfluencerMetrics.findOneAndUpdate({ influencerId: profile._id }, { $set: metrics }, { upsert: true, setDefaultsOnInsert: true });
    }
    return { metrics, campaigns: campaignRows };
  }

  async getAdminAnalytics(query = {}) {
    const campaignRows = await this.rebuildCampaignMetrics(query);
    const totals = totalsFromCampaignMetrics(campaignRows);
    const range = dateRange(query);
    const [vendors, influencers, orderAgg, withdrawals] = await Promise.all([
      Vendor.countDocuments({}),
      InfluencerProfile.countDocuments({}),
      aggregateSum(Order, withDate({ status: { $in: [...REVENUE_ORDER_STATUSES] } }, range), {
        totalOrders: 1,
        totalRevenue: { $sum: { $ifNull: ["$totalAmount", "$subtotal"] } },
        platformRevenue: "$platformCommissionAmount",
      }),
      InfluencerWithdrawalRequest.aggregate([{ $match: withDate({ status: { $in: ["COMPLETED", "PAID", "PROCESSED"] } }, range, "requestedAt") }, { $group: { _id: null, amount: { $sum: "$amount" } } }]),
    ]);
    const byModel = totals.paymentModelBreakdown;
    const metrics = {
      key: "global",
      totalCampaigns: totals.campaignCount,
      totalVendors: Number(vendors || 0),
      totalInfluencers: Number(influencers || 0),
      totalOrders: Number(orderAgg.totalOrders || totals.orders || 0),
      totalRevenue: money(orderAgg.totalRevenue || totals.revenue || 0),
      totalCommission: totals.commission,
      totalCommissionPaid: totals.commissionPaid,
      totalPlatformRevenue: money(orderAgg.platformRevenue || totals.platformRevenue || 0),
      totalWithdrawals: money(first(withdrawals).amount || 0),
      totalEscrow: totals.escrow,
      totalEscrowBalance: totals.unreleased,
      totalReleased: totals.released,
      fixedCampaignRevenue: money(byModel.fixed?.revenue || 0),
      commissionCampaignRevenue: money(byModel.commission?.revenue || 0),
      hybridCampaignRevenue: money(byModel.hybrid?.revenue || 0),
      freeProductCampaignRevenue: money(byModel.free_product?.revenue || 0),
      paymentModelBreakdown: byModel,
      lastAggregatedAt: new Date(),
    };
    if (range.persist) {
      await AdminMetrics.findOneAndUpdate({ key: "global" }, { $set: metrics }, { upsert: true, setDefaultsOnInsert: true });
    }
    return { metrics, campaigns: campaignRows };
  }

  async rebuildAll(query = {}) {
    const campaigns = await this.rebuildCampaignMetrics(query);
    const vendorIds = [...new Set(campaigns.map((row) => String(row.vendorId || "")).filter(Boolean))];
    const influencerIds = [...new Set(campaigns.map((row) => String(row.influencerId || "")).filter(Boolean))];
    for (const vendorId of vendorIds) await this.getVendorAnalytics(vendorId, query).catch((error) => logger.warn("Vendor analytics rebuild skipped", { vendorId, error: error.message }));
    for (const influencerId of influencerIds) await this.getInfluencerAnalytics(influencerId, query).catch((error) => logger.warn("Influencer analytics rebuild skipped", { influencerId, error: error.message }));
    const admin = await this.getAdminAnalytics(query);
    await this.recordEvent("ANALYTICS_REBUILT", { entityType: "Analytics", payload: { campaigns: campaigns.length, vendors: vendorIds.length, influencers: influencerIds.length } }).catch(() => null);
    return { campaigns: campaigns.length, vendors: vendorIds.length, influencers: influencerIds.length, admin: admin.metrics };
  }

  async auditPipeline(query = {}) {
    const range = dateRange(query);
    const [clicks, sessions, orders, commissionBearingOrders, attributions, conversions, snapshots, earnings, records, escrows, withdrawals, events] = await Promise.all([
      CampaignAffiliateClick.countDocuments(withDate({}, range)),
      TrackingSession.countDocuments(withDate({}, range)),
      Order.countDocuments(withDate({ "attribution.campaignId": { $exists: true } }, range)),
      Order.aggregate([
        { $match: withDate({ "attribution.campaignId": { $exists: true } }, range) },
        { $lookup: { from: "campaigns", localField: "attribution.campaignId", foreignField: "_id", as: "campaign" } },
        { $unwind: "$campaign" },
        { $match: { "campaign.paymentType": { $in: ["commission", "hybrid"] } } },
        { $count: "count" },
      ]),
      CampaignAffiliateAttribution.countDocuments(withDate({}, range)),
      AffiliateConversion.countDocuments(withDate({}, range, "convertedAt")),
      CommissionSnapshot.countDocuments(withDate({}, range)),
      CommissionEarning.countDocuments(withDate({}, range)),
      CommissionRecord.countDocuments(withDate({}, range)),
      CampaignEscrowWallet.countDocuments({}),
      InfluencerWithdrawalRequest.countDocuments(withDate({}, range, "requestedAt")),
      AnalyticsEvent.countDocuments(withDate({}, range)),
    ]);
    const missing = [];
    if (clicks || sessions) {
      if (!orders) missing.push("Orders missing after clicks/tracking sessions");
      if (orders && !attributions && !conversions) missing.push("Attribution/conversion records missing for attributed orders");
      if (Number(first(commissionBearingOrders).count || 0) && !snapshots && !records) missing.push("Commission records missing for commission-bearing attributed orders");
    }
    if (records && !earnings) missing.push("Commission earnings read model missing while commission records exist");
    if (!events) missing.push("Analytics event log has no records for selected period");
    return {
      counts: { clicks, sessions, orders, commissionBearingOrders: Number(first(commissionBearingOrders).count || 0), attributions, conversions, snapshots, earnings, records, escrows, withdrawals, events },
      missingDataLinks: missing,
      healthy: missing.length === 0,
    };
  }

  registerEventHandlers() {
    const events = [
      "ORDER_CREATED",
      "VENDOR_ORDER_CREATED",
      INFLUENCER_EVENTS.ORDER_CREATED,
      INFLUENCER_EVENTS.ORDER_DELIVERED,
      INFLUENCER_EVENTS.ORDER_ELIGIBLE_FOR_SETTLEMENT,
      INFLUENCER_EVENTS.TRACKING_CREATED,
      INFLUENCER_EVENTS.CAMPAIGN_ACTIVATED,
      INFLUENCER_EVENTS.REEL_PUBLISHED,
      INFLUENCER_EVENTS.COMMISSION_DISTRIBUTED,
      "COMMISSION_CALCULATED",
      "COMMISSION_APPROVED",
      "AFFILIATE_CONVERSION_RECORDED",
      "ESCROW_RELEASED",
      "WITHDRAWAL_REQUESTED",
      "WITHDRAWAL_COMPLETED",
      "REFUND_COMPLETED",
    ];
    events.forEach((eventName) => {
      registerHandler(eventName, async (payload = {}) => {
        const entityId = payload.campaignId || payload.orderId || payload.reelId || payload.withdrawalRequestId || null;
        await this.recordEvent(eventName, { entityType: payload.campaignId ? "Campaign" : payload.orderId ? "Order" : "", entityId, payload }).catch(() => null);
        const campaignId = payload.campaignId || payload.order?.attribution?.campaignId;
        if (campaignId && mongoose.isValidObjectId(campaignId)) {
          await this.buildCampaignMetrics(campaignId).catch((error) => logger.warn("Campaign analytics refresh failed", { campaignId, error: error.message }));
        }
      });
    });
  }
}

module.exports = new AnalyticsAggregator();
module.exports.__private__ = { money, pct, totalsFromCampaignMetrics, dateRange };
