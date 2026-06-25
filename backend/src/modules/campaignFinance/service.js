const mongoose = require("mongoose");
const { AppError } = require("../../utils/AppError");
const auditService = require("../../services/audit.service");
const walletService = require("../../services/wallet.service");
const { Order } = require("../../models/Order");
const CampaignEscrowWallet = require("../../models/CampaignEscrowWallet");
const CampaignPaymentRelease = require("../../models/CampaignPaymentRelease");
const { Campaign } = require("../campaign/model");
const { CampaignDeliverable } = require("../campaign/executionModel");
const { InfluencerProfile } = require("../influencer/model");
const { CommissionEarning, CampaignBudgetTracker } = require("../commission/models");
const {
  CampaignFinanceSummary,
  CampaignFinanceOrder,
  CampaignFinanceVendorMetric,
  CampaignFinanceInfluencerMetric,
  CampaignFinanceAdminMetric,
} = require("./model");

const PAYMENT_MODELS = new Set(["fixed", "commission", "hybrid", "free_product"]);
const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;
const money = (value) => Math.max(0, roundMoney(value));

function normalizePaymentModel(value) {
  const model = String(value || "").toLowerCase();
  return PAYMENT_MODELS.has(model) ? model : "commission";
}

function isRealizedOrder(order) {
  return order?.paymentStatus === "Paid" && !["Cancelled", "Returned"].includes(order?.status);
}

function emptyMetrics() {
  return {
    campaignRevenue: 0,
    campaignOrders: 0,
    productsSold: 0,
    totalInfluencerCost: 0,
    vendorNetRevenue: 0,
    totalInfluencerEarnings: 0,
    campaignCount: 0,
    releasedAmount: 0,
    unreleasedAmount: 0,
    escrowBalance: 0,
    completedDeliverables: 0,
    pendingDeliverables: 0,
    commissionGenerated: 0,
    commissionPaid: 0,
    pendingCommission: 0,
    attributedRevenue: 0,
    commissionCap: 0,
    commissionCapUtilized: 0,
    remainingCommissionBudget: 0,
    fixedReleasedAmount: 0,
    fixedUnreleasedAmount: 0,
    commissionEarnings: 0,
    productsSent: 0,
    productsDelivered: 0,
    productValue: 0,
    promotionCount: 0,
    platformRevenue: 0,
    escrowFunds: 0,
    releasedFunds: 0,
    unreleasedFunds: 0,
    commissionRevenue: 0,
  };
}

function addMetrics(target, source = {}) {
  Object.keys(emptyMetrics()).forEach((key) => {
    target[key] = roundMoney(Number(target[key] || 0) + Number(source[key] || 0));
  });
  return target;
}

function finalizeMetrics(metrics) {
  const result = { ...emptyMetrics(), ...metrics };
  result.campaignRoi = result.totalInfluencerCost > 0
    ? roundMoney(((result.campaignRevenue - result.totalInfluencerCost) / result.totalInfluencerCost) * 100)
    : 0;
  result.conversionRate = result.productsSent > 0
    ? roundMoney((result.campaignOrders / result.productsSent) * 100)
    : 0;
  result.averageCommissionPerOrder = result.campaignOrders > 0
    ? roundMoney(result.commissionGenerated / result.campaignOrders)
    : 0;
  return result;
}

function buildOrderRow(order, campaign, earning) {
  const firstItem = order.items?.[0] || {};
  const influencerCommission = money(earning?.commissionAmount ?? order.attribution?.commission?.influencerShare);
  const vendorNet = money(
    order.attribution?.commission?.vendorNet ??
      order.settlementSnapshot?.vendorNet ??
      order.vendorEarning ??
      Math.max(0, Number(order.subtotal || order.totalAmount || 0) - influencerCommission)
  );
  return {
    campaignId: campaign._id,
    orderId: order._id,
    vendorId: campaign.vendorId,
    influencerId: campaign.influencerId,
    paymentModel: normalizePaymentModel(campaign.paymentType),
    campaignName: campaign.title || "Campaign",
    orderNumber: order.orderNumber || "",
    productId: firstItem.productId || order.attribution?.productId || undefined,
    productName: firstItem.name || "Product",
    customerName: order.userId?.name || order.userId?.email || "Customer",
    grossAmount: money(order.totalAmount || order.subtotal),
    shippingFee: money(order.shippingFee),
    platformFee: money(order.platformFee),
    adminCommission: money(order.platformCommissionAmount),
    influencerCommission,
    vendorNet,
    orderStatus: order.status || "",
    paymentStatus: order.paymentStatus || "",
    settlementStatus: order.settlementStatus || "",
    orderDate: order.createdAt,
  };
}

class CampaignFinanceService {
  async syncCampaign(campaignId) {
    if (!mongoose.isValidObjectId(campaignId)) throw new AppError("Invalid campaign id", 400, "VALIDATION_ERROR");
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");

    const [orders, earnings, escrow, releases, deliverables, budget] = await Promise.all([
      Order.find({ "attribution.campaignId": campaign._id })
        .select("orderNumber userId items subtotal totalAmount shippingFee platformFee platformCommissionAmount vendorEarning settlementSnapshot attribution status paymentStatus settlementStatus createdAt")
        .populate("userId", "name email")
        .lean(),
      CommissionEarning.find({ campaignId: campaign._id }).select("orderId commissionAmount status").lean(),
      CampaignEscrowWallet.findOne({ campaignId: campaign._id }).lean(),
      CampaignPaymentRelease.find({ campaignId: campaign._id }).select("totalAmount netAmount status").lean(),
      CampaignDeliverable.find({ campaignId: campaign._id }).select("status approvalStatus paymentEligibility totalPrice").lean(),
      CampaignBudgetTracker.findOne({ campaignId: campaign._id }).lean(),
    ]);

    const earningsByOrder = new Map(earnings.map((row) => [String(row.orderId), row]));
    const realizedOrders = orders.filter(isRealizedOrder);
    const activeEarnings = earnings.filter((row) => !["REVERSED", "CANCELLED", "BLOCKED"].includes(row.status));
    const fixedReleases = releases.filter((row) => !["cancelled", "disputed"].includes(row.status));
    const released = fixedReleases.filter((row) => ["released", "settled"].includes(row.status));
    const fixedReleasedAmount = money(released.reduce((sum, row) => sum + Number(row.netAmount ?? row.totalAmount ?? 0), 0));
    const fixedUnreleasedAmount = money(fixedReleases.filter((row) => !["released", "settled"].includes(row.status)).reduce((sum, row) => sum + Number(row.netAmount ?? row.totalAmount ?? 0), 0));
    const commissionGenerated = money(activeEarnings.reduce((sum, row) => sum + Number(row.commissionAmount || 0), 0));
    const commissionPaid = money(activeEarnings.filter((row) => row.status === "CREDITED").reduce((sum, row) => sum + Number(row.commissionAmount || 0), 0));
    const pendingCommission = money(activeEarnings.filter((row) => row.status === "PENDING").reduce((sum, row) => sum + Number(row.commissionAmount || 0), 0));
    const campaignRevenue = money(realizedOrders.reduce((sum, order) => sum + Number(order.totalAmount || order.subtotal || 0), 0));
    const vendorNetRevenue = money(realizedOrders.reduce((sum, order) => sum + buildOrderRow(order, campaign, earningsByOrder.get(String(order._id))).vendorNet, 0));
    const platformRevenue = money(realizedOrders.reduce((sum, order) => sum + Number(order.platformFee || 0) + Number(order.platformCommissionAmount || 0), 0));
    const completedDeliverables = deliverables.filter((row) => ["approved", "completed"].includes(row.status) || row.approvalStatus === "approved").length;
    const productValue = money(campaign.pricing?.productCost || campaign.pricing?.productValue || campaign.paymentModelSnapshot?.productValue || 0);
    const commissionCap = money(budget?.commissionCap || campaign.commissionConfig?.commissionCap || campaign.commissionConfig?.maxCampaignBudget || 0);
    const metrics = finalizeMetrics({
      ...emptyMetrics(),
      campaignRevenue,
      campaignOrders: orders.length,
      productsSold: orders.reduce((sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0), 0),
      totalInfluencerCost: money(fixedReleasedAmount + fixedUnreleasedAmount + commissionGenerated),
      vendorNetRevenue,
      totalInfluencerEarnings: money(fixedReleasedAmount + commissionGenerated),
      campaignCount: 1,
      releasedAmount: fixedReleasedAmount,
      unreleasedAmount: fixedUnreleasedAmount,
      escrowBalance: money(escrow?.amountRemaining),
      completedDeliverables,
      pendingDeliverables: Math.max(0, deliverables.length - completedDeliverables),
      commissionGenerated,
      commissionPaid,
      pendingCommission,
      attributedRevenue: campaignRevenue,
      commissionCap,
      commissionCapUtilized: commissionGenerated,
      remainingCommissionBudget: commissionCap > 0 ? money(Math.max(0, commissionCap - commissionGenerated)) : 0,
      fixedReleasedAmount,
      fixedUnreleasedAmount,
      commissionEarnings: commissionGenerated,
      productsSent: normalizePaymentModel(campaign.paymentType) === "free_product" ? (campaign.productIds || []).length : 0,
      productsDelivered: normalizePaymentModel(campaign.paymentType) === "free_product" ? completedDeliverables : 0,
      productValue,
      promotionCount: normalizePaymentModel(campaign.paymentType) === "free_product" ? 1 : 0,
      platformRevenue: money(platformRevenue + Number(escrow?.platformFeeAmount || 0)),
      escrowFunds: money(escrow?.amountFunded),
      releasedFunds: fixedReleasedAmount,
      unreleasedFunds: money(escrow?.amountRemaining),
      commissionRevenue: money(realizedOrders.reduce((sum, order) => sum + Number(order.platformCommissionAmount || 0), 0)),
    });

    await CampaignFinanceSummary.findOneAndUpdate(
      { campaignId: campaign._id },
      { $set: { campaignId: campaign._id, vendorId: campaign.vendorId, influencerId: campaign.influencerId, campaignName: campaign.title || "Campaign", paymentModel: normalizePaymentModel(campaign.paymentType), campaignState: campaign.state || "", currency: campaign.pricing?.currency || "INR", metrics, sourceUpdatedAt: campaign.updatedAt, reconciledAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (orders.length) {
      await CampaignFinanceOrder.bulkWrite(
        orders.map((order) => ({
          updateOne: {
            filter: { campaignId: campaign._id, orderId: order._id },
            update: { $set: buildOrderRow(order, campaign, earningsByOrder.get(String(order._id))) },
            upsert: true,
          },
        }))
      );
    }
    await CampaignFinanceOrder.deleteMany({ campaignId: campaign._id, ...(orders.length ? { orderId: { $nin: orders.map((order) => order._id) } } : {}) });
    return { campaignId: String(campaign._id), metrics };
  }

  async syncAll() {
    const campaigns = await Campaign.find({}).select("_id").lean();
    // Bounded concurrency keeps large marketplaces current without opening an
    // unbounded number of aggregation queries against MongoDB.
    const concurrency = Math.min(Math.max(Number(process.env.CAMPAIGN_FINANCE_SYNC_CONCURRENCY) || 5, 1), 20);
    for (let index = 0; index < campaigns.length; index += concurrency) {
      await Promise.all(campaigns.slice(index, index + concurrency).map((campaign) => this.syncCampaign(campaign._id)));
    }
    await this.refreshMetricReadModels();
    return { campaigns: campaigns.length };
  }

  async refreshMetricReadModels() {
    const summaries = await CampaignFinanceSummary.find({}).lean();
    const groups = { vendor: new Map(), influencer: new Map(), admin: new Map() };
    const add = (group, scopeId, model, metrics) => {
      if (!scopeId) return;
      for (const key of ["all", model]) {
        const id = `${scopeId}:${key}`;
        const row = group.get(id) || { scopeId, paymentModel: key, metrics: emptyMetrics() };
        addMetrics(row.metrics, metrics);
        group.set(id, row);
      }
    };
    summaries.forEach((summary) => {
      add(groups.vendor, String(summary.vendorId), summary.paymentModel, summary.metrics);
      add(groups.influencer, summary.influencerId ? String(summary.influencerId) : "", summary.paymentModel, summary.metrics);
      add(groups.admin, "global", summary.paymentModel, summary.metrics);
    });
    const write = async (Model, rows, key) => {
      if (!rows.size) return;
      await Model.bulkWrite([...rows.values()].map((row) => ({
        updateOne: {
          filter: key === "scopeId" ? { scopeId: row.scopeId, paymentModel: row.paymentModel } : { scopeKey: row.scopeId, paymentModel: row.paymentModel },
          update: { $set: { ...(key === "scopeId" ? { scopeId: row.scopeId } : { scopeKey: row.scopeId }), paymentModel: row.paymentModel, metrics: finalizeMetrics(row.metrics), reconciledAt: new Date() } },
          upsert: true,
        },
      })));
    };
    await Promise.all([
      write(CampaignFinanceVendorMetric, groups.vendor, "scopeId"),
      write(CampaignFinanceInfluencerMetric, groups.influencer, "scopeId"),
      write(CampaignFinanceAdminMetric, groups.admin, "scopeKey"),
    ]);
  }

  async ensureScope(filter) {
    const count = await CampaignFinanceSummary.countDocuments(filter);
    if (count) return;
    const campaigns = await Campaign.find(filter).select("_id").lean();
    for (const campaign of campaigns) await this.syncCampaign(campaign._id);
    await this.refreshMetricReadModels();
  }

  async getDashboard({ scope, scopeId = null, query = {} }) {
    const paymentModel = query.paymentModel && query.paymentModel !== "all" ? normalizePaymentModel(query.paymentModel) : "all";
    const summaryFilter = paymentModel === "all" ? {} : { paymentModel };
    if (scope === "vendor") summaryFilter.vendorId = scopeId;
    if (scope === "influencer") summaryFilter.influencerId = scopeId;
    if (query.campaignId) summaryFilter.campaignId = query.campaignId;
    await this.ensureScope(scope === "vendor" ? { vendorId: scopeId } : scope === "influencer" ? { influencerId: scopeId } : {});
    const [summaries, metric] = await Promise.all([
      CampaignFinanceSummary.find(summaryFilter).sort({ reconciledAt: -1 }).lean(),
      scope === "vendor"
        ? CampaignFinanceVendorMetric.findOne({ scopeId, paymentModel }).lean()
        : scope === "influencer"
          ? CampaignFinanceInfluencerMetric.findOne({ scopeId, paymentModel }).lean()
          : CampaignFinanceAdminMetric.findOne({ scopeKey: "global", paymentModel }).lean(),
    ]);
    const calculated = summaries.reduce((total, summary) => addMetrics(total, summary.metrics), emptyMetrics());
    const metrics = finalizeMetrics(metric?.metrics || calculated);
    const orderFilter = { ...(scope === "vendor" ? { vendorId: scopeId } : {}), ...(scope === "influencer" ? { influencerId: scopeId } : {}), ...(paymentModel === "all" ? {} : { paymentModel }), ...(query.campaignId ? { campaignId: query.campaignId } : {}) };
    if (query.startDate || query.endDate) orderFilter.orderDate = { ...(query.startDate ? { $gte: new Date(query.startDate) } : {}), ...(query.endDate ? { $lte: new Date(`${query.endDate}T23:59:59.999Z`) } : {}) };
    const page = Math.min(Math.max(Number(query.page) || 1, 1), 100000);
    const limit = Math.min(Math.max(Number(query.limit) || 25, 1), 100);
    const [orders, total] = await Promise.all([
      CampaignFinanceOrder.find(orderFilter).sort({ orderDate: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      CampaignFinanceOrder.countDocuments(orderFilter),
    ]);
    return { metrics, campaigns: summaries.map((summary) => ({ id: String(summary.campaignId), name: summary.campaignName, paymentModel: summary.paymentModel, state: summary.campaignState, ...summary.metrics })), orders, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }, reconciledAt: metric?.reconciledAt || null };
  }

  async getVendorDashboard(userId, query) {
    const vendor = await walletService.getVendorContext(userId);
    const data = await this.getDashboard({ scope: "vendor", scopeId: vendor._id, query });
    return { ...data, scope: { vendorId: String(vendor._id) } };
  }

  async getInfluencerDashboard(userId, query) {
    const profile = await InfluencerProfile.findOne({ userId }).select("_id").lean();
    if (!profile) throw new AppError("Influencer profile not found", 404, "INFLUENCER_NOT_FOUND");
    const data = await this.getDashboard({ scope: "influencer", scopeId: profile._id, query });
    return { ...data, scope: { influencerId: String(profile._id) } };
  }

  async getAdminDashboard(query) {
    return this.getDashboard({ scope: "admin", query });
  }

  async getCampaignDashboard(campaignId, actor) {
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
    const role = actor?.role;
    if (role === "vendor") {
      const vendor = await walletService.getVendorContext(actor.sub);
      if (String(vendor._id) !== String(campaign.vendorId)) throw new AppError("Campaign access denied", 403, "FORBIDDEN");
    }
    if (role === "influencer") {
      const profile = await InfluencerProfile.findOne({ userId: actor.sub }).select("_id").lean();
      if (!profile || String(profile._id) !== String(campaign.influencerId)) throw new AppError("Campaign access denied", 403, "FORBIDDEN");
    }
    await this.syncCampaign(campaign._id);
    await this.refreshMetricReadModels();
    return this.getDashboard({ scope: "admin", query: { campaignId: campaign._id, limit: 100 } });
  }

  logView(actor, scope, entityId = null) {
    return auditService.log({ actor, action: "campaign_finance.viewed", entityType: scope, entityId, metadata: { scope } }).catch(() => null);
  }
}

module.exports = new CampaignFinanceService();
