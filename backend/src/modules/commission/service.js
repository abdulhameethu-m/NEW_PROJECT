const crypto = require("crypto");
const mongoose = require("mongoose");
const { Order } = require("../../models/Order");
const CampaignPaymentRelease = require("../../models/CampaignPaymentRelease");
const { AppError } = require("../../utils/AppError");
const { emitDomainEvent, registerHandler } = require("../events/event-bus");
const { INFLUENCER_EVENTS } = require("../shared/constants");
const { roundMoney } = require("../shared/helpers");
const {
  InfluencerCommissionRule,
  CommissionRuleVersion,
  CommissionRuleCondition,
  CommissionSnapshot,
  CommissionLedger,
  CommissionReversal,
  CommissionSettlement,
  CommissionPayoutBatch,
  CommissionAuditLog,
  InfluencerWallet,
  InfluencerLedger,
  CommissionRecord,
  InfluencerPayoutAccount,
  InfluencerWithdrawalRequest,
  RULE_TYPES,
  COMMISSION_METHODS,
} = require("./models");
const { Reel } = require("../reel/model");
const { Campaign } = require("../campaign/model");
const { DeliverablePayout } = require("../campaign/executionModel");
const {
  InfluencerProfile,
  InfluencerSocialAccount,
  InfluencerBusinessProfile,
  InfluencerPaymentProfile,
  InfluencerProductAssignment,
} = require("../influencer/model");
const auditService = require("../../services/audit.service");
const notificationService = require("../../services/notification.service");

const HOLD_DAYS = Number(process.env.INFLUENCER_HOLD_DAYS || 7);
const RULE_PRECEDENCE = {
  product: 600,
  campaign: 500,
  influencer: 400,
  traffic_source: 300,
  category: 200,
  global: 100,
  affiliate: 90,
  performance: 80,
  custom_formula: 70,
};
const FINAL_ORDER_STATUSES = ["Delivered"];
const FINAL_PAYMENT_STATUSES = ["Paid"];
const INELIGIBLE_ORDER_STATUSES = ["Pending", "Cancelled", "Returned"];
const INELIGIBLE_PAYMENT_STATUSES = ["Pending", "Failed", "Refunded", "Partially Refunded"];
const RULE_STATUSES = ["draft", "pending_approval", "active", "inactive", "expired", "rejected", "archived"];

function buildCommissionRecordKey(orderId) {
  return `commission:${orderId}`;
}

function buildLedgerKey(orderId, type) {
  return `commission:${type.toLowerCase()}:${orderId}`;
}

function buildEngineLedgerKey(orderId, type) {
  return `commission-engine:${type.toLowerCase()}:${orderId}`;
}

function buildSnapshotKey(orderId) {
  return `commission-snapshot:${orderId}`;
}

function buildAuditActor(actor = {}) {
  return {
    userId: actor?._id || actor?.sub || actor?.id || null,
    userRole: actor?.role || actor?.type || "",
  };
}

function normalizeRuleCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeTrafficSource(value = "") {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function toComparable(value) {
  if (value == null) return value;
  if (mongoose.isValidObjectId(value)) return String(value);
  if (value instanceof Date) return value.getTime();
  return value;
}

function valuesEqual(left, right) {
  return String(toComparable(left)) === String(toComparable(right));
}

function readPath(source = {}, path = "") {
  return String(path || "")
    .split(".")
    .filter(Boolean)
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), source);
}

function conditionMatches(condition, context) {
  const actual = readPath(context, condition.field);
  const expected = condition.value;
  switch (condition.operator) {
    case "ne":
      return !valuesEqual(actual, expected);
    case "in":
      return Array.isArray(expected) && expected.some((item) => valuesEqual(actual, item));
    case "nin":
      return Array.isArray(expected) && !expected.some((item) => valuesEqual(actual, item));
    case "gt":
      return Number(actual || 0) > Number(expected || 0);
    case "gte":
      return Number(actual || 0) >= Number(expected || 0);
    case "lt":
      return Number(actual || 0) < Number(expected || 0);
    case "lte":
      return Number(actual || 0) <= Number(expected || 0);
    case "exists":
      return Boolean(actual) === Boolean(expected);
    case "between":
      return Number(actual || 0) >= Number(expected || 0) && Number(actual || 0) <= Number(condition.valueTo || 0);
    case "eq":
    default:
      return valuesEqual(actual, expected);
  }
}

function extractOrderCategoryId(order) {
  const firstItem = (order?.items || [])[0] || {};
  return firstItem?.commissionSnapshot?.categoryId || firstItem?.productId?.categoryId || firstItem?.categoryId || null;
}

function extractOrderProductId(order) {
  return order?.attribution?.productId || (order?.items || [])[0]?.productId?._id || (order?.items || [])[0]?.productId || null;
}

function buildCalculationContext(order, overrides = {}) {
  const grossSale = roundMoney(overrides.revenue ?? order?.subtotal ?? order?.totalAmount ?? 0);
  const refunds = roundMoney(overrides.refunds ?? order?.refundSummary?.grossAmount ?? 0);
  const discounts = roundMoney(overrides.discounts ?? order?.discountAmount ?? order?.priceBreakdown?.discountAmount ?? 0);
  const platformAdjustments = roundMoney(overrides.platformAdjustments ?? order?.platformFee ?? 0);
  const eligibleRevenue = Math.max(0, roundMoney(grossSale - refunds - discounts - platformAdjustments));
  const orders = Number(overrides.expectedOrders ?? overrides.orders ?? 1);
  const conversions = Number(overrides.conversions ?? orders);
  const clicks = Number(overrides.clicks ?? 0);
  return {
    order,
    influencerId: overrides.influencerId || order?.attribution?.influencerId,
    campaignId: overrides.campaignId || order?.attribution?.campaignId,
    productId: overrides.productId || extractOrderProductId(order),
    categoryId: overrides.categoryId || extractOrderCategoryId(order),
    vendorId: overrides.vendorId || order?.sellerId,
    trafficSource: normalizeTrafficSource(overrides.trafficSource || order?.attribution?.surface || "affiliate_link"),
    affiliateId: overrides.affiliateId || order?.attribution?.affiliateId,
    grossSale,
    refunds,
    discounts,
    platformAdjustments,
    eligibleRevenue,
    orders,
    conversionRate: Number(overrides.conversionRate ?? (clicks ? (conversions / clicks) * 100 : 0)),
    campaignCompletion: Number(overrides.campaignCompletion ?? 0),
    reelEngagement: Number(overrides.reelEngagement ?? 0),
    reelEngagementTarget: Number(overrides.reelEngagementTarget ?? 0),
    metrics: overrides.metrics || {},
  };
}

function evaluateArithmeticExpression(expression) {
  const tokens = String(expression || "").match(/\d+(?:\.\d+)?|[()+\-*/]/g) || [];
  const values = [];
  const operators = [];
  const precedence = { "+": 1, "-": 1, "*": 2, "/": 2 };
  const applyOperator = () => {
    const operator = operators.pop();
    const right = values.pop();
    const left = values.pop();
    if (operator === "+") values.push(left + right);
    if (operator === "-") values.push(left - right);
    if (operator === "*") values.push(left * right);
    if (operator === "/") values.push(right === 0 ? 0 : left / right);
  };

  for (const token of tokens) {
    if (/^\d/.test(token)) {
      values.push(Number(token));
    } else if (token === "(") {
      operators.push(token);
    } else if (token === ")") {
      while (operators.length && operators[operators.length - 1] !== "(") applyOperator();
      operators.pop();
    } else {
      while (operators.length && precedence[operators[operators.length - 1]] >= precedence[token]) applyOperator();
      operators.push(token);
    }
  }
  while (operators.length) applyOperator();
  return Number(values[0] || 0);
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

function parseDashboardRange(query = {}) {
  const now = new Date();
  const range = String(query.range || "30d").toLowerCase();
  let end = query.endDate ? new Date(query.endDate) : now;
  if (Number.isNaN(end.getTime())) end = now;
  let start;

  if (query.startDate) {
    start = new Date(query.startDate);
  } else if (range === "today") {
    start = startOfDay(now);
  } else if (range === "7d") {
    start = addDays(now, -6);
  } else if (range === "90d") {
    start = addDays(now, -89);
  } else if (range === "12m") {
    start = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate()));
  } else {
    start = addDays(now, -29);
  }

  if (Number.isNaN(start.getTime())) start = addDays(now, -29);
  return { start: startOfDay(start), end };
}

function objectIdOrNull(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function percentChange(current, previous) {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);
  if (!previousValue) return currentValue ? 100 : 0;
  return roundMoney(((currentValue - previousValue) / previousValue) * 100);
}

function buildDateBuckets(start, end) {
  const buckets = [];
  const cursor = startOfDay(start);
  const last = startOfDay(end);
  while (cursor <= last) {
    const key = cursor.toISOString().slice(0, 10);
    buckets.push({ date: key, revenue: 0, commission: 0, orders: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return buckets;
}

function includesProduct(order, productId) {
  if (!productId) return true;
  return (order?.items || []).some((item) => String(item.productId?._id || item.productId) === String(productId));
}

function productImage(product) {
  const first = Array.isArray(product?.images) ? product.images[0] : null;
  return typeof first === "string" ? first : first?.url || "";
}

function formatRuleLabel(value = "") {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildRuleSummary(rule) {
  if (!rule) return null;
  return {
    id: rule._id ? String(rule._id) : "",
    ruleName: rule.ruleName || rule.name || "",
    ruleCode: rule.ruleCode || "",
    ruleType: rule.ruleType || "",
    ruleTypeLabel: formatRuleLabel(rule.ruleType || ""),
    commissionMethod: rule.commissionMethod || "",
    commissionMethodLabel: formatRuleLabel(rule.commissionMethod || ""),
    commissionValue: Number(rule.commissionValue || 0),
    fixedAmount: Number(rule.fixedAmount || 0),
    revenueSharePercent: Number(rule.revenueSharePercent || 0),
    version: Number(rule.version || 1),
    status: rule.status || "",
  };
}

function buildSnapshotRuleSummary(snapshot) {
  if (!snapshot) return null;
  const rule = snapshot.appliedRuleId && typeof snapshot.appliedRuleId === "object" ? snapshot.appliedRuleId : null;
  return {
    snapshotId: String(snapshot._id || ""),
    appliedRuleId: String(rule?._id || snapshot.appliedRuleId || ""),
    appliedRuleVersion: Number(snapshot.appliedRuleVersion || rule?.version || 1),
    ruleName: rule?.ruleName || "Historical commission rule",
    ruleCode: rule?.ruleCode || "",
    ruleType: rule?.ruleType || snapshot.calculation?.ruleType || "",
    ruleTypeLabel: formatRuleLabel(rule?.ruleType || snapshot.calculation?.ruleType || ""),
    commissionMethod: rule?.commissionMethod || snapshot.calculation?.commissionMethod || "",
    commissionMethodLabel: formatRuleLabel(rule?.commissionMethod || snapshot.calculation?.commissionMethod || ""),
    trafficSource: snapshot.trafficSource || "",
    commissionPercent: Number(snapshot.commissionPercent || 0),
    commissionAmount: roundMoney(snapshot.commissionAmount || 0),
    bonusAmount: roundMoney(snapshot.bonusAmount || 0),
    finalEarnings: roundMoney(snapshot.finalEarnings || 0),
  };
}

function dominantRuleSummary(ruleMap = new Map()) {
  const counts = new Map();
  for (const rule of ruleMap.values()) {
    if (!rule) continue;
    const key = `${rule.appliedRuleId || rule.ruleName || ""}:${rule.appliedRuleVersion || ""}`;
    const row = counts.get(key) || { ...rule, count: 0, earnings: 0 };
    row.count += 1;
    row.earnings = roundMoney(row.earnings + Number(rule.finalEarnings || 0));
    counts.set(key, row);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || b.earnings - a.earnings)[0] || null;
}

async function executeWithOptionalTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    const message = String(error?.message || "");
    if (
      message.includes("Transaction numbers are only allowed") ||
      message.includes("replica set") ||
      message.includes("standalone")
    ) {
      return await work(null);
    }
    throw error;
  } finally {
    await session.endSession().catch(() => {});
  }
}

function attachSession(query, session) {
  if (session) query.session(session);
  return query;
}

async function getOrCreateWallet(influencerId, session = null) {
  return await InfluencerWallet.findOneAndUpdate(
    { influencerId },
    { $setOnInsert: { influencerId } },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
      session: session || undefined,
    }
  );
}

class CommissionService {
  validateRulePayload(payload = {}, { partial = false } = {}) {
    const ruleType = payload.ruleType;
    const method = payload.commissionMethod;
    if ((!partial || ruleType != null) && !RULE_TYPES.includes(ruleType)) {
      throw new AppError("Invalid commission rule type", 400, "VALIDATION_ERROR");
    }
    if ((!partial || method != null) && !COMMISSION_METHODS.includes(method)) {
      throw new AppError("Invalid commission method", 400, "VALIDATION_ERROR");
    }
    const effectiveDate = payload.effectiveDate ? new Date(payload.effectiveDate) : null;
    const expiryDate = payload.expiryDate ? new Date(payload.expiryDate) : null;
    if ((!partial || payload.effectiveDate != null) && (!effectiveDate || Number.isNaN(effectiveDate.getTime()))) {
      throw new AppError("effectiveDate is required", 400, "VALIDATION_ERROR");
    }
    if (expiryDate && Number.isNaN(expiryDate.getTime())) {
      throw new AppError("Invalid expiryDate", 400, "VALIDATION_ERROR");
    }
    if (effectiveDate && expiryDate && effectiveDate > expiryDate) {
      throw new AppError("effectiveDate cannot be after expiryDate", 400, "VALIDATION_ERROR");
    }
    const percent = Number(payload.commissionValue ?? 0);
    if (payload.commissionValue != null && (!Number.isFinite(percent) || percent < 0 || percent > 100)) {
      throw new AppError("commissionValue must be between 0 and 100", 400, "VALIDATION_ERROR");
    }
    if (["product"].includes(ruleType) && !payload.productId) throw new AppError("productId is required", 400, "VALIDATION_ERROR");
    if (["campaign"].includes(ruleType) && !payload.campaignId) throw new AppError("campaignId is required", 400, "VALIDATION_ERROR");
    if (["influencer"].includes(ruleType) && !payload.influencerId) throw new AppError("influencerId is required", 400, "VALIDATION_ERROR");
    if (["category"].includes(ruleType) && !payload.categoryId) throw new AppError("categoryId is required", 400, "VALIDATION_ERROR");
    if (["affiliate"].includes(ruleType) && !payload.affiliateId) throw new AppError("affiliateId is required", 400, "VALIDATION_ERROR");
    if (["traffic_source"].includes(ruleType) && !payload.trafficSource) throw new AppError("trafficSource is required", 400, "VALIDATION_ERROR");
  }

  async auditCommission(action, entityType, entityId, { actor = {}, oldValue = null, newValue = null, reason = "", meta = {} } = {}) {
    const auditActor = buildAuditActor(actor);
    await CommissionAuditLog.create({
      action,
      entityType,
      entityId,
      ...auditActor,
      oldValue,
      newValue,
      reason,
      ipAddress: meta?.ipAddress || "",
      userAgent: meta?.userAgent || "",
    }).catch(() => {});
  }

  async createRule(payload = {}, actor = {}, meta = {}) {
    this.validateRulePayload(payload);
    const ruleCode = normalizeRuleCode(payload.ruleCode || payload.ruleName);
    if (!ruleCode) throw new AppError("ruleCode is required", 400, "VALIDATION_ERROR");
    const exists = await InfluencerCommissionRule.findOne({ ruleCode }).lean();
    if (exists) throw new AppError("Commission rule code already exists", 409, "COMMISSION_RULE_EXISTS");

    const rule = await InfluencerCommissionRule.create({
      ...payload,
      ruleCode,
      trafficSource: payload.trafficSource ? normalizeTrafficSource(payload.trafficSource) : undefined,
      status: payload.status || "draft",
      effectiveDate: new Date(payload.effectiveDate),
      expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : undefined,
      createdBy: actor?._id || actor?.sub || undefined,
    });
    await CommissionRuleVersion.create({
      ruleId: rule._id,
      version: rule.version,
      snapshot: rule.toObject(),
      status: rule.status,
      createdBy: actor?._id || actor?.sub || undefined,
      changeReason: payload.reason || "Rule created",
    });
    if (Array.isArray(payload.conditions) && payload.conditions.length) {
      await CommissionRuleCondition.insertMany(payload.conditions.map((condition) => ({ ...condition, ruleId: rule._id })));
    }
    await this.auditCommission("RULE_CREATED", "InfluencerCommissionRule", rule._id, { actor, newValue: rule.toObject(), reason: payload.reason, meta });
    return rule;
  }

  async updateRule(ruleId, payload = {}, actor = {}, meta = {}) {
    if (!mongoose.isValidObjectId(ruleId)) throw new AppError("Invalid rule id", 400, "VALIDATION_ERROR");
    this.validateRulePayload(payload, { partial: true });
    const rule = await InfluencerCommissionRule.findById(ruleId);
    if (!rule) throw new AppError("Commission rule not found", 404, "NOT_FOUND");
    const oldValue = rule.toObject();
    const nextVersion = Number(rule.version || 1) + 1;
    const update = {
      ...payload,
      version: nextVersion,
      trafficSource: payload.trafficSource === null ? null : payload.trafficSource ? normalizeTrafficSource(payload.trafficSource) : rule.trafficSource,
      effectiveDate: payload.effectiveDate ? new Date(payload.effectiveDate) : rule.effectiveDate,
      expiryDate: payload.expiryDate === null ? null : payload.expiryDate ? new Date(payload.expiryDate) : rule.expiryDate,
    };
    Object.assign(rule, update);
    await rule.save();
    await CommissionRuleVersion.create({
      ruleId: rule._id,
      version: nextVersion,
      snapshot: rule.toObject(),
      status: rule.status,
      createdBy: actor?._id || actor?.sub || undefined,
      approvedBy: rule.approvedBy,
      changeReason: payload.reason || "Rule updated",
    });
    if (Array.isArray(payload.conditions)) {
      await CommissionRuleCondition.deleteMany({ ruleId: rule._id });
      if (payload.conditions.length) await CommissionRuleCondition.insertMany(payload.conditions.map((condition) => ({ ...condition, ruleId: rule._id })));
    }
    await this.auditCommission("RULE_UPDATED", "InfluencerCommissionRule", rule._id, { actor, oldValue, newValue: rule.toObject(), reason: payload.reason, meta });
    return rule;
  }

  async approveRule(ruleId, actor = {}, meta = {}) {
    if (!mongoose.isValidObjectId(ruleId)) throw new AppError("Invalid rule id", 400, "VALIDATION_ERROR");
    const rule = await InfluencerCommissionRule.findByIdAndUpdate(
      ruleId,
      { $set: { status: "active", approvedBy: actor?._id || actor?.sub || undefined, approvedAt: new Date() } },
      { returnDocument: "after", runValidators: true }
    );
    if (!rule) throw new AppError("Commission rule not found", 404, "NOT_FOUND");
    await this.auditCommission("RULE_ACTIVATED", "InfluencerCommissionRule", rule._id, { actor, newValue: rule.toObject(), reason: "Approved", meta });
    return rule;
  }

  async deactivateRule(ruleId, actor = {}, reason = "", meta = {}) {
    if (!mongoose.isValidObjectId(ruleId)) throw new AppError("Invalid rule id", 400, "VALIDATION_ERROR");
    const rule = await InfluencerCommissionRule.findByIdAndUpdate(ruleId, { $set: { status: "inactive" } }, { returnDocument: "after" });
    if (!rule) throw new AppError("Commission rule not found", 404, "NOT_FOUND");
    await this.auditCommission("RULE_DEACTIVATED", "InfluencerCommissionRule", rule._id, { actor, newValue: rule.toObject(), reason, meta });
    return rule;
  }

  async listRules(query = {}) {
    const filter = {};
    if (query.status && RULE_STATUSES.includes(query.status)) filter.status = query.status;
    if (query.ruleType) filter.ruleType = query.ruleType;
    if (query.commissionMethod) filter.commissionMethod = query.commissionMethod;
    if (query.search) {
      const re = new RegExp(String(query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ ruleName: re }, { ruleCode: re }, { description: re }];
    }
    ["productId", "campaignId", "influencerId", "categoryId", "affiliateId"].forEach((key) => {
      if (query[key] && mongoose.isValidObjectId(query[key])) filter[key] = query[key];
    });
    if (query.trafficSource) filter.trafficSource = normalizeTrafficSource(query.trafficSource);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const [rules, total] = await Promise.all([
      InfluencerCommissionRule.find(filter).sort({ priority: -1, updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      InfluencerCommissionRule.countDocuments(filter),
    ]);
    const conditions = rules.length
      ? await CommissionRuleCondition.find({ ruleId: { $in: rules.map((rule) => rule._id) } }).lean()
      : [];
    const conditionsByRule = conditions.reduce((acc, condition) => {
      const key = String(condition.ruleId);
      acc.set(key, [...(acc.get(key) || []), condition]);
      return acc;
    }, new Map());
    return {
      rules: rules.map((rule) => ({ ...rule, conditions: conditionsByRule.get(String(rule._id)) || [] })),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async resolveRule(context = {}) {
    const now = new Date();
    const base = {
      status: "active",
      effectiveDate: { $lte: now },
      $or: [{ expiryDate: null }, { expiryDate: { $exists: false } }, { expiryDate: { $gte: now } }],
    };
    const clauses = [{ ruleType: "global" }];
    if (mongoose.isValidObjectId(context.productId)) clauses.push({ ruleType: "product", productId: context.productId });
    if (mongoose.isValidObjectId(context.campaignId)) clauses.push({ ruleType: "campaign", campaignId: context.campaignId });
    if (mongoose.isValidObjectId(context.influencerId)) clauses.push({ ruleType: "influencer", influencerId: context.influencerId });
    if (mongoose.isValidObjectId(context.categoryId)) clauses.push({ ruleType: "category", categoryId: context.categoryId });
    if (context.trafficSource) clauses.push({ ruleType: "traffic_source", trafficSource: normalizeTrafficSource(context.trafficSource) });
    if (mongoose.isValidObjectId(context.affiliateId)) clauses.push({ ruleType: "affiliate", affiliateId: context.affiliateId });
    clauses.push({ ruleType: { $in: ["performance", "custom_formula"] } });

    const candidates = await InfluencerCommissionRule.find({ $and: [base, { $or: clauses }] }).lean();
    if (!candidates.length) return null;
    const conditions = await CommissionRuleCondition.find({ ruleId: { $in: candidates.map((rule) => rule._id) } }).lean();
    const byRule = conditions.reduce((acc, condition) => {
      const key = String(condition.ruleId);
      acc.set(key, [...(acc.get(key) || []), condition]);
      return acc;
    }, new Map());
    const valid = candidates.filter((rule) => (byRule.get(String(rule._id)) || []).every((condition) => conditionMatches(condition, context)));
    valid.sort((a, b) => {
      const rank = (RULE_PRECEDENCE[b.ruleType] || 0) - (RULE_PRECEDENCE[a.ruleType] || 0);
      return rank || Number(b.priority || 0) - Number(a.priority || 0) || Number(b.version || 1) - Number(a.version || 1);
    });
    return valid[0] || null;
  }

  calculateBaseCommission(rule, context) {
    const revenue = roundMoney(context.eligibleRevenue || 0);
    const percent = Number(rule.commissionValue || 0);
    let commissionPercent = 0;
    let commissionAmount = 0;
    if (rule.commissionMethod === "percentage") {
      commissionPercent = percent;
      commissionAmount = roundMoney((revenue * percent) / 100);
    } else if (rule.commissionMethod === "fixed") {
      commissionAmount = roundMoney(rule.fixedAmount || rule.commissionValue || 0);
      commissionPercent = revenue ? roundMoney((commissionAmount / revenue) * 100) : 0;
    } else if (rule.commissionMethod === "hybrid") {
      commissionPercent = percent;
      commissionAmount = roundMoney((revenue * percent) / 100 + Number(rule.fixedAmount || 0));
    } else if (rule.commissionMethod === "tiered") {
      const tiers = [...(rule.tiers || [])].sort((a, b) => Number(b.threshold || 0) - Number(a.threshold || 0));
      const tier = tiers.find((item) => revenue >= Number(item.threshold || 0));
      commissionPercent = Number(tier?.percent ?? percent);
      commissionAmount = roundMoney((revenue * commissionPercent) / 100 + Number(tier?.fixedAmount || 0));
    } else if (rule.commissionMethod === "revenue_share") {
      commissionPercent = Number(rule.revenueSharePercent || percent);
      commissionAmount = roundMoney((revenue * commissionPercent) / 100);
    } else if (rule.commissionMethod === "custom_formula") {
      commissionAmount = this.evaluateFormula(rule.customFormula, context);
      commissionPercent = revenue ? roundMoney((commissionAmount / revenue) * 100) : 0;
    } else if (rule.commissionMethod === "performance_bonus") {
      commissionPercent = percent;
      commissionAmount = roundMoney((revenue * percent) / 100);
    }
    return {
      commissionPercent: Math.min(100, roundMoney(commissionPercent)),
      commissionAmount: Math.min(revenue, roundMoney(commissionAmount)),
    };
  }

  evaluateFormula(formula = "", context = {}) {
    const expression = String(formula || "").trim();
    if (!expression) return 0;
    if (!/^[0-9+\-*/().\s_a-zA-Z]+$/.test(expression)) {
      throw new AppError("Custom formula contains unsupported characters", 400, "INVALID_CUSTOM_FORMULA");
    }
    const variables = {
      grossSale: context.grossSale,
      eligibleRevenue: context.eligibleRevenue,
      orders: context.orders,
      conversionRate: context.conversionRate,
      campaignCompletion: context.campaignCompletion,
      reelEngagement: context.reelEngagement,
    };
    const expanded = Object.entries(variables).reduce(
      (acc, [key, value]) => acc.replace(new RegExp(`\\b${key}\\b`, "g"), String(Number(value || 0))),
      expression
    );
    const result = evaluateArithmeticExpression(expanded);
    if (!Number.isFinite(result) || result < 0) return 0;
    return roundMoney(result);
  }

  calculateBonuses(rule, context, commissionAmount) {
    const bonuses = Array.isArray(rule.bonuses) ? rule.bonuses : [];
    let bonusPercent = 0;
    let bonusAmount = 0;
    for (const bonus of bonuses) {
      const metricValue = Number(readPath(context, bonus.metric) ?? 0);
      if (!conditionMatches({ field: bonus.metric, operator: bonus.operator || "gte", value: bonus.threshold }, context)) continue;
      if (bonus.type === "fixed") {
        bonusAmount = roundMoney(bonusAmount + Number(bonus.value || 0));
      } else {
        bonusPercent = roundMoney(bonusPercent + Number(bonus.value || 0));
      }
      void metricValue;
    }
    return {
      bonusPercent,
      bonusAmount: roundMoney(bonusAmount + (commissionAmount * bonusPercent) / 100),
    };
  }

  async calculateCommission(input = {}) {
    const context = buildCalculationContext(input.order, input);
    const rule = await this.resolveRule(context);
    if (!rule) {
      return { skipped: true, reason: "NO_ACTIVE_RULE", context };
    }
    const base = this.calculateBaseCommission(rule, context);
    const bonus = this.calculateBonuses(rule, context, base.commissionAmount);
    const finalEarnings = Math.min(context.eligibleRevenue, roundMoney(base.commissionAmount + bonus.bonusAmount));
    return {
      rule,
      context,
      commissionPercent: base.commissionPercent,
      commissionAmount: base.commissionAmount,
      bonusPercent: bonus.bonusPercent,
      bonusAmount: bonus.bonusAmount,
      finalEarnings,
      vendorNet: roundMoney(context.eligibleRevenue - finalEarnings),
    };
  }

  assertOrderEligible(order) {
    if (!order?.attribution?.influencerId) return { eligible: false, reason: "NO_ATTRIBUTION" };
    if (INELIGIBLE_ORDER_STATUSES.includes(order.status) || !FINAL_ORDER_STATUSES.includes(order.status)) return { eligible: false, reason: "ORDER_NOT_ELIGIBLE" };
    if (INELIGIBLE_PAYMENT_STATUSES.includes(order.paymentStatus) || !FINAL_PAYMENT_STATUSES.includes(order.paymentStatus)) return { eligible: false, reason: "PAYMENT_NOT_ELIGIBLE" };
    if (order.refundSummary?.status === "REFUNDED") return { eligible: false, reason: "REFUNDED" };
    return { eligible: true };
  }

  async calculateAndSnapshotOrder(order, session = null) {
    const eligibility = this.assertOrderEligible(order);
    if (!eligibility.eligible) return { skipped: true, reason: eligibility.reason };
    const existing = await attachSession(CommissionSnapshot.findOne({ orderId: order._id }), session).lean();
    if (existing) return { snapshot: existing, alreadySnapshotted: true };
    const result = await this.calculateCommission({ order });
    if (result.skipped) return result;
    const snapshotPayload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      influencerId: result.context.influencerId,
      campaignId: result.context.campaignId,
      productId: result.context.productId,
      categoryId: result.context.categoryId,
      vendorId: result.context.vendorId,
      appliedRuleId: result.rule._id,
      appliedRuleVersion: result.rule.version,
      trafficSource: result.context.trafficSource,
      commissionPercent: result.commissionPercent,
      commissionAmount: result.commissionAmount,
      bonusAmount: result.bonusAmount,
      finalEarnings: result.finalEarnings,
      eligibleRevenue: result.context.eligibleRevenue,
      grossSale: result.context.grossSale,
      refunds: result.context.refunds,
      discounts: result.context.discounts,
      platformAdjustments: result.context.platformAdjustments,
      calculation: {
        ruleType: result.rule.ruleType,
        commissionMethod: result.rule.commissionMethod,
        bonusPercent: result.bonusPercent,
      },
      idempotencyKey: buildSnapshotKey(order._id),
    };
    const [snapshot] = await CommissionSnapshot.create([snapshotPayload], { session: session || undefined });
    await CommissionLedger.create(
      [
        {
          influencerId: snapshot.influencerId,
          orderId: order._id,
          snapshotId: snapshot._id,
          entryType: "COMMISSION",
          direction: "CREDIT",
          amount: snapshot.commissionAmount,
          state: "PENDING",
          idempotencyKey: buildEngineLedgerKey(order._id, "COMMISSION"),
          reference: order.orderNumber,
          metadata: { appliedRuleId: snapshot.appliedRuleId, appliedRuleVersion: snapshot.appliedRuleVersion },
        },
        ...(snapshot.bonusAmount > 0
          ? [
              {
                influencerId: snapshot.influencerId,
                orderId: order._id,
                snapshotId: snapshot._id,
                entryType: "PERFORMANCE_BONUS",
                direction: "CREDIT",
                amount: snapshot.bonusAmount,
                state: "PENDING",
                idempotencyKey: buildEngineLedgerKey(order._id, "PERFORMANCE_BONUS"),
                reference: order.orderNumber,
                metadata: { appliedRuleId: snapshot.appliedRuleId },
              },
            ]
          : []),
      ],
      { session: session || undefined }
    );
    await this.auditCommission("COMMISSION_CALCULATED", "CommissionSnapshot", snapshot._id, { newValue: snapshotPayload });
    return { snapshot, calculation: result };
  }

  async createHoldRecord(order, session = null) {
    if (!order?.attribution?.influencerId) return null;
    const snapshotResult = await this.calculateAndSnapshotOrder(order, session);
    if (snapshotResult?.skipped) return null;
    const snapshot = snapshotResult.snapshot;

    const payload = {
      orderId: order._id,
      vendorId: order.sellerId,
      influencerId: order.attribution.influencerId,
      campaignId: order.attribution.campaignId,
      reelId: order.attribution.reelId,
      postId: order.attribution.postId,
      storefrontId: order.attribution.storefrontId,
      collectionId: order.attribution.collectionId,
      surface: order.attribution.surface,
      trackingSessionId: order.attribution.trackingSessionId,
      state: "HOLD",
      idempotencyKey: buildCommissionRecordKey(order._id),
      holdUntil: order.payoutEligibleAt || new Date(Date.now() + HOLD_DAYS * 24 * 60 * 60 * 1000),
      gross: roundMoney(order.subtotal || 0),
      platformFee: roundMoney(order.platformCommissionAmount || 0),
      influencerShare: roundMoney(snapshot.finalEarnings || 0),
      vendorNet: roundMoney(snapshot.eligibleRevenue - snapshot.finalEarnings),
      commissionPercent: roundMoney(snapshot.commissionPercent || 0),
      metadata: {
        orderNumber: order.orderNumber,
        productId: snapshot.productId || order.attribution.productId,
        commissionSnapshotId: snapshot._id,
        appliedRuleId: snapshot.appliedRuleId,
        appliedRuleVersion: snapshot.appliedRuleVersion,
      },
    };

    return await CommissionRecord.findOneAndUpdate(
      { orderId: order._id },
      { $setOnInsert: payload },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
        session: session || undefined,
      }
    );
  }

  async settleForOrder(orderId) {
    return await executeWithOptionalTransaction(async (session) => {
      const order = await attachSession(Order.findById(orderId), session).lean();
      if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
      if (!order.attribution?.influencerId) return { skipped: true, reason: "NO_ATTRIBUTION" };
      if (order.status !== "Delivered") return { skipped: true, reason: "ORDER_NOT_DELIVERED" };
      if (order.paymentStatus !== "Paid") return { skipped: true, reason: "PAYMENT_NOT_CAPTURED" };

      const holdRecord = await this.createHoldRecord(order, session);
      if (!holdRecord) return { skipped: true, reason: "NO_COMMISSION_RECORD" };
      if (holdRecord.state === "SETTLED") return { skipped: true, reason: "ALREADY_SETTLED" };
      if (holdRecord.state === "REVERSED") return { skipped: true, reason: "ALREADY_REVERSED" };
      if (holdRecord.holdUntil > new Date()) return { skipped: true, reason: "HOLD_OPEN" };

      const alreadyLedgered = await attachSession(
        InfluencerLedger.findOne({ idempotencyKey: buildLedgerKey(order._id, "COMMISSION") }),
        session
      ).lean();
      if (alreadyLedgered) {
        await CommissionRecord.updateOne(
          { _id: holdRecord._id, state: { $ne: "SETTLED" } },
          { $set: { state: "SETTLED", settledAt: new Date() } },
          { session: session || undefined }
        );
        return { skipped: true, reason: "ALREADY_SETTLED" };
      }

      const updatedRecord = await CommissionRecord.findOneAndUpdate(
        {
          _id: holdRecord._id,
          state: "HOLD",
          holdUntil: { $lte: new Date() },
        },
        {
          $set: {
            state: "SETTLED",
            settledAt: new Date(),
          },
        },
        {
          returnDocument: "after",
          session: session || undefined,
        }
      );

      if (!updatedRecord) {
        const latest = await attachSession(CommissionRecord.findOne({ orderId }), session).lean();
        return { skipped: true, reason: latest?.state === "SETTLED" ? "ALREADY_SETTLED" : "STATE_CHANGED" };
      }

      const wallet = await getOrCreateWallet(updatedRecord.influencerId, session);
      const nextAvailable = roundMoney(wallet.availableBalance) + roundMoney(updatedRecord.influencerShare);
      const nextTotal = roundMoney(wallet.totalEarnings) + roundMoney(updatedRecord.influencerShare);

      const updatedWallet = await InfluencerWallet.findByIdAndUpdate(
        wallet._id,
        {
          $set: {
            availableBalance: nextAvailable,
            totalEarnings: nextTotal,
          },
        },
        {
          returnDocument: "after",
          runValidators: true,
          session: session || undefined,
        }
      );

      await InfluencerLedger.create(
        [
          {
            influencerId: updatedRecord.influencerId,
            orderId: order._id,
            type: "CREDIT",
            amount: updatedRecord.influencerShare,
            source: "COMMISSION",
            idempotencyKey: buildLedgerKey(order._id, "COMMISSION"),
            balanceAfter: updatedWallet.availableBalance,
            meta: {
              campaignId: updatedRecord.campaignId,
              reelId: updatedRecord.reelId,
              trackingSessionId: updatedRecord.trackingSessionId,
            },
          },
        ],
        { session: session || undefined }
      );

      await CommissionLedger.updateMany(
        { orderId: order._id, state: "PENDING" },
        { $set: { state: "APPROVED" } },
        { session: session || undefined }
      );

      return {
        settled: true,
        record: updatedRecord,
        wallet: updatedWallet,
      };
    }).then(async (result) => {
      if (result?.settled) {
        await emitDomainEvent(INFLUENCER_EVENTS.COMMISSION_DISTRIBUTED, {
          orderId,
          influencerId: result.record.influencerId,
          amount: result.record.influencerShare,
        });
      }
      return result;
    });
  }

  async reverseForRefund(orderId) {
    return await executeWithOptionalTransaction(async (session) => {
      const record = await attachSession(CommissionRecord.findOne({ orderId }), session);
      if (!record) return { skipped: true, reason: "NOT_FOUND" };
      if (record.state === "REVERSED") return { skipped: true, reason: "ALREADY_REVERSED" };
      if (record.state === "CANCELLED") return { skipped: true, reason: "ALREADY_CANCELLED" };

      if (record.state === "HOLD") {
        await CommissionRecord.updateOne(
          { _id: record._id, state: "HOLD" },
          { $set: { state: "CANCELLED", reversedAt: new Date() } },
          { session: session || undefined }
        );
        return { cancelled: true };
      }

      if (record.state !== "SETTLED") {
        return { skipped: true, reason: "NOT_SETTLED" };
      }

      const reversalKey = buildLedgerKey(orderId, "REVERSAL");
      const existingReversal = await attachSession(InfluencerLedger.findOne({ idempotencyKey: reversalKey }), session).lean();
      if (existingReversal) {
        await CommissionRecord.updateOne(
          { _id: record._id, state: { $ne: "REVERSED" } },
          { $set: { state: "REVERSED", reversedAt: new Date() } },
          { session: session || undefined }
        );
        return { skipped: true, reason: "ALREADY_REVERSED" };
      }

      const updatedRecord = await CommissionRecord.findOneAndUpdate(
        { _id: record._id, state: "SETTLED" },
        { $set: { state: "REVERSED", reversedAt: new Date() } },
        { returnDocument: "after", session: session || undefined }
      );

      if (!updatedRecord) return { skipped: true, reason: "STATE_CHANGED" };

      const wallet = await getOrCreateWallet(record.influencerId, session);
      if (roundMoney(wallet.availableBalance) < roundMoney(record.influencerShare)) {
        throw new AppError("Influencer wallet does not have enough available balance for reversal", 409, "REVERSAL_BLOCKED");
      }

      const updatedWallet = await InfluencerWallet.findByIdAndUpdate(
        wallet._id,
        {
          $set: {
            availableBalance: roundMoney(wallet.availableBalance) - roundMoney(record.influencerShare),
            reversedAmount: roundMoney(wallet.reversedAmount) + roundMoney(record.influencerShare),
          },
        },
        {
          returnDocument: "after",
          runValidators: true,
          session: session || undefined,
        }
      );

      await InfluencerLedger.create(
        [
          {
            influencerId: record.influencerId,
            orderId,
            type: "DEBIT",
            amount: record.influencerShare,
            source: "REVERSAL",
            idempotencyKey: reversalKey,
            balanceAfter: updatedWallet.availableBalance,
            meta: {
              campaignId: record.campaignId,
              reelId: record.reelId,
              trackingSessionId: record.trackingSessionId,
            },
          },
        ],
        { session: session || undefined }
      );

      const snapshot = await attachSession(CommissionSnapshot.findOne({ orderId }), session).lean();
      const [engineReversal] = await CommissionLedger.create(
        [
          {
            influencerId: record.influencerId,
            orderId,
            snapshotId: snapshot?._id,
            entryType: "REVERSAL",
            direction: "DEBIT",
            amount: record.influencerShare,
            state: "REVERSED",
            idempotencyKey: buildEngineLedgerKey(orderId, "REVERSAL"),
            reason: "REFUND",
            metadata: { source: "reverseForRefund" },
          },
        ],
        { session: session || undefined }
      );
      if (snapshot) {
        await CommissionReversal.create(
          [
            {
              orderId,
              influencerId: record.influencerId,
              snapshotId: snapshot._id,
              ledgerId: engineReversal._id,
              amount: record.influencerShare,
              reason: "REFUND",
              idempotencyKey: `commission-reversal:${orderId}`,
            },
          ],
          { session: session || undefined }
        );
      }

      return { reversed: true, wallet: updatedWallet };
    });
  }

  async settleEligibleOrders() {
    const eligible = await CommissionRecord.find({
      state: "HOLD",
      holdUntil: { $lte: new Date() },
    })
      .select("orderId")
      .lean();

    const results = [];
    for (const record of eligible) {
      results.push(await this.settleForOrder(record.orderId));
    }

    return {
      processed: results.filter((item) => item?.settled).length,
      results,
    };
  }

  async getInfluencerDashboard(userId, query = {}) {
    const profile = await require("../influencer/service").getProfile(userId);
    const influencerId = profile._id;
    const { start, end } = parseDashboardRange(query);
    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - (end.getTime() - start.getTime()));
    const campaignId = objectIdOrNull(query.campaignId);
    const productId = objectIdOrNull(query.productId);
    const category = query.category ? String(query.category).trim().toLowerCase() : "";
    const brand = query.brand ? String(query.brand).trim().toLowerCase() : "";
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 8));

    const baseRecordMatch = {
      influencerId,
      createdAt: { $gte: start, $lte: end },
    };
    if (campaignId) baseRecordMatch.campaignId = campaignId;

    const previousRecordMatch = {
      influencerId,
      createdAt: { $gte: previousStart, $lte: previousEnd },
    };
    if (campaignId) previousRecordMatch.campaignId = campaignId;

    const campaignFilter = { influencerId };
    if (campaignId) campaignFilter._id = campaignId;

    const reelFilter = { influencerId };
    if (campaignId) reelFilter.campaignId = campaignId;
    if (productId) reelFilter.productIds = productId;

    const [
      currentAgg,
      previousAgg,
      records,
      reels,
      campaigns,
      socialAccounts,
      activeProfile,
    ] = await Promise.all([
      CommissionRecord.aggregate([
        { $match: baseRecordMatch },
        {
          $group: {
            _id: null,
            commission: { $sum: "$influencerShare" },
            gross: { $sum: "$gross" },
            orders: { $sum: 1 },
          },
        },
      ]),
      CommissionRecord.aggregate([
        { $match: previousRecordMatch },
        {
          $group: {
            _id: null,
            commission: { $sum: "$influencerShare" },
            gross: { $sum: "$gross" },
            orders: { $sum: 1 },
          },
        },
      ]),
      CommissionRecord.find(baseRecordMatch)
        .populate({
          path: "orderId",
          select: "orderNumber userId items totalAmount subtotal status paymentStatus createdAt",
          populate: [
            { path: "userId", select: "name email" },
            { path: "items.productId", select: "name images category brand price discountPrice analytics" },
          ],
        })
        .populate({ path: "campaignId", select: "state commissionPercent fixedFee deadline vendorId createdAt", populate: { path: "vendorId", select: "shopName companyName" } })
        .populate("reelId", "caption videoUrl metrics state publishedAt createdAt productIds")
        .sort({ createdAt: -1 })
        .limit(500)
        .lean(),
      Reel.find(reelFilter)
        .populate({ path: "campaignId", select: "state commissionPercent fixedFee deadline vendorId", populate: { path: "vendorId", select: "shopName companyName" } })
        .sort({ "metrics.orders": -1, "metrics.clicks": -1, createdAt: -1 })
        .limit(10)
        .lean(),
      Campaign.find(campaignFilter)
        .populate("productIds", "name category brand images")
        .populate("vendorId", "shopName companyName")
        .sort({ createdAt: -1 })
        .limit(12)
        .lean(),
      InfluencerSocialAccount.find({ influencerId }).select("platform followersCount engagementRate updatedAt").lean(),
      InfluencerProfile.findById(influencerId).select("followers stats permissions").lean(),
    ]);

    const filteredRecords = records.filter((record) => {
      const order = record.orderId;
      if (!includesProduct(order, productId)) return false;
      if (!category && !brand) return true;
      return (order?.items || []).some((item) => {
        const product = item.productId || {};
        const productCategory = String(product.category || "").toLowerCase();
        const productBrand = String(product.brand || "").toLowerCase();
        return (!category || productCategory === category) && (!brand || productBrand.includes(brand));
      });
    });

    const snapshotIds = filteredRecords
      .map((record) => record.metadata?.commissionSnapshotId)
      .filter((id) => id && mongoose.isValidObjectId(id));
    const orderIds = filteredRecords
      .map((record) => record.orderId?._id || record.orderId)
      .filter((id) => id && mongoose.isValidObjectId(id));
    const snapshotClauses = [
      ...(snapshotIds.length ? [{ _id: { $in: snapshotIds } }] : []),
      ...(orderIds.length ? [{ orderId: { $in: orderIds } }] : []),
    ];
    const snapshots = snapshotClauses.length
      ? await CommissionSnapshot.find({ $or: snapshotClauses }).populate("appliedRuleId").lean()
      : [];
    const snapshotByOrder = new Map();
    const snapshotById = new Map();
    for (const snapshot of snapshots) {
      snapshotByOrder.set(String(snapshot.orderId), snapshot);
      snapshotById.set(String(snapshot._id), snapshot);
    }
    const ruleByRecordId = new Map();
    for (const record of filteredRecords) {
      const snapshot =
        snapshotById.get(String(record.metadata?.commissionSnapshotId || "")) ||
        snapshotByOrder.get(String(record.orderId?._id || record.orderId || ""));
      ruleByRecordId.set(String(record._id), buildSnapshotRuleSummary(snapshot));
    }
    let currentApplicableRule = await this.resolveRule({
      influencerId,
      trafficSource: query.trafficSource || "affiliate_link",
      orders: filteredRecords.length,
      conversionRate: 0,
      campaignCompletion: 0,
      reelEngagement: 0,
      eligibleRevenue: 0,
      grossSale: 0,
    });

    const current = currentAgg[0] || {};
    const previous = previousAgg[0] || {};
    const totalClicks = reels.reduce((sum, reel) => sum + Number(reel.metrics?.clicks || 0), 0);
    const totalViews = reels.reduce((sum, reel) => sum + Number(reel.metrics?.views || 0), 0);
    const totalOrders = filteredRecords.length;
    const totalCommission = roundMoney(filteredRecords.reduce((sum, record) => sum + Number(record.influencerShare || 0), 0));
    const grossRevenue = roundMoney(filteredRecords.reduce((sum, record) => sum + Number(record.gross || 0), 0));
    const conversionRate = totalClicks > 0 ? roundMoney((totalOrders / totalClicks) * 100) : 0;
    const averageOrderValue = totalOrders > 0 ? roundMoney(grossRevenue / totalOrders) : 0;
    const followers = Number(activeProfile?.followers || socialAccounts.reduce((sum, account) => sum + Number(account.followersCount || 0), 0));
    const engagementRate = socialAccounts.length
      ? roundMoney(socialAccounts.reduce((sum, account) => sum + Number(account.engagementRate || 0), 0) / socialAccounts.length)
      : 0;
    currentApplicableRule = await this.resolveRule({
      influencerId,
      trafficSource: query.trafficSource || "affiliate_link",
      orders: totalOrders,
      conversionRate,
      campaignCompletion: 0,
      reelEngagement: engagementRate,
      eligibleRevenue: averageOrderValue,
      grossSale: averageOrderValue,
    });

    const revenueBuckets = buildDateBuckets(start, end);
    const revenueMap = new Map(revenueBuckets.map((item) => [item.date, item]));
    for (const record of filteredRecords) {
      const key = new Date(record.createdAt).toISOString().slice(0, 10);
      const row = revenueMap.get(key);
      if (row) {
        row.revenue = roundMoney(row.revenue + Number(record.gross || 0));
        row.commission = roundMoney(row.commission + Number(record.influencerShare || 0));
        row.orders += 1;
      }
    }

    const productRows = new Map();
    for (const record of filteredRecords) {
      const order = record.orderId;
      const appliedRule = ruleByRecordId.get(String(record._id));
      for (const item of order?.items || []) {
        const product = item.productId || {};
        const id = String(product._id || item.productId || "");
        if (!id) continue;
        if (productId && id !== String(productId)) continue;
        const row = productRows.get(id) || {
          id,
          name: product.name || item.name || "Product",
          image: productImage(product) || item.image || "",
          category: product.category || "",
          brand: product.brand || "",
          orders: 0,
          revenue: 0,
          commission: 0,
          clicks: 0,
          appliedRule: null,
          appliedRuleCounts: {},
        };
        row.orders += Number(item.quantity || 1);
        row.revenue = roundMoney(row.revenue + Number(item.price || 0) * Number(item.quantity || 1));
        row.commission = roundMoney(row.commission + Number(record.influencerShare || 0));
        if (appliedRule) {
          row.appliedRule = row.appliedRule || appliedRule;
          row.appliedRuleCounts[appliedRule.ruleTypeLabel || "Rule"] = Number(row.appliedRuleCounts[appliedRule.ruleTypeLabel || "Rule"] || 0) + 1;
        }
        productRows.set(id, row);
      }
    }

    for (const reel of reels) {
      const linkedProducts = (reel.productIds || []).map((id) => String(id));
      for (const linkedProductId of linkedProducts) {
        const row = productRows.get(linkedProductId);
        if (row) row.clicks += Number(reel.metrics?.clicks || 0);
      }
    }

    const reelRevenue = new Map();
    for (const record of filteredRecords) {
      const id = String(record.reelId?._id || record.reelId || "");
      if (!id) continue;
      const row = reelRevenue.get(id) || { revenue: 0, commission: 0, orders: 0 };
      row.revenue = roundMoney(row.revenue + Number(record.gross || 0));
      row.commission = roundMoney(row.commission + Number(record.influencerShare || 0));
      row.orders += 1;
      reelRevenue.set(id, row);
    }

    const topProducts = [...productRows.values()]
      .map((row) => ({
        ...row,
        ctr: totalViews ? roundMoney((row.clicks / totalViews) * 100) : 0,
        conversionRate: totalClicks ? roundMoney((row.orders / totalClicks) * 100) : 0,
        appliedRuleType: Object.entries(row.appliedRuleCounts || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || row.appliedRule?.ruleTypeLabel || "",
      }))
      .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders)
      .slice(0, 8);

    const topVideos = reels.map((reel) => {
      const money = reelRevenue.get(String(reel._id)) || {};
      const clicks = Number(reel.metrics?.clicks || 0);
      const views = Number(reel.metrics?.views || 0);
      return {
        id: String(reel._id),
        title: reel.caption || "Untitled content",
        thumbnail: reel.videoUrl || "",
        views,
        clicks,
        orders: Number(reel.metrics?.orders || money.orders || 0),
        revenue: roundMoney(money.revenue || 0),
        commission: roundMoney(money.commission || 0),
        ctr: views ? roundMoney((clicks / views) * 100) : 0,
        engagementRate: views ? roundMoney(((clicks + Number(reel.metrics?.orders || 0)) / views) * 100) : 0,
        publishedAt: reel.publishedAt || reel.createdAt,
        status: reel.state,
      };
    });

    const activeCampaigns = campaigns.map((campaign) => {
      const campaignRecords = filteredRecords.filter((record) => String(record.campaignId?._id || record.campaignId) === String(campaign._id));
      const campaignRule = dominantRuleSummary(new Map(campaignRecords.map((record) => [String(record._id), ruleByRecordId.get(String(record._id))])));
      return {
        id: String(campaign._id),
        name: campaign.productIds?.[0]?.name || `${campaign.vendorId?.shopName || campaign.vendorId?.companyName || "Brand"} campaign`,
        brand: campaign.vendorId?.shopName || campaign.vendorId?.companyName || "Brand",
        category: campaign.productIds?.[0]?.category || "",
        status: campaign.state,
        startDate: campaign.createdAt,
        endDate: campaign.deadline,
        budget: Number(campaign.fixedFee || 0),
        commissionPercent: Number(campaignRule?.commissionPercent ?? campaign.commissionPercent ?? 0),
        appliedRule: campaignRule,
        appliedRuleType: campaignRule?.ruleTypeLabel || "",
        revenueEarned: roundMoney(campaignRecords.reduce((sum, record) => sum + Number(record.influencerShare || 0), 0)),
      };
    });

    const recentOrders = filteredRecords.slice((page - 1) * limit, page * limit).map((record) => {
      const order = record.orderId || {};
      const firstItem = order.items?.[0] || {};
      const appliedRule = ruleByRecordId.get(String(record._id));
      return {
        id: String(order._id || record.orderId),
        orderNumber: order.orderNumber || String(order._id || record.orderId).slice(-8),
        product: firstItem.name || firstItem.productId?.name || "Product",
        productId: String(firstItem.productId?._id || firstItem.productId || ""),
        customer: order.userId?.name || order.userId?.email || "Customer",
        amount: Number(order.totalAmount || record.gross || 0),
        commission: Number(record.influencerShare || 0),
        commissionPercent: Number(appliedRule?.commissionPercent ?? record.commissionPercent ?? 0),
        appliedRule,
        appliedRuleType: appliedRule?.ruleTypeLabel || "",
        status: record.state === "HOLD" ? "Pending" : record.state === "SETTLED" ? "Completed" : record.state,
        orderStatus: order.status,
        createdAt: order.createdAt || record.createdAt,
      };
    });

    const dominantHistoricalRule = dominantRuleSummary(ruleByRecordId);
    const recentActivity = [
      ...activeCampaigns
        .filter((campaign) => campaign.status === "proposed")
        .slice(0, 3)
        .map((campaign) => ({
          id: `campaign-${campaign.id}`,
          type: "campaign",
          title: "Campaign invitation",
          message: `${campaign.brand} invited you to a campaign.`,
          createdAt: campaign.startDate,
        })),
    ]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 10);

    return {
      filters: {
        range: query.range || "30d",
        startDate: start,
        endDate: end,
        campaignId: campaignId ? String(campaignId) : "",
        productId: productId ? String(productId) : "",
        category,
        brand,
      },
      totalOrders,
      totalClicks,
      conversionRate,
      followers,
      commissionRuleSummary: {
        currentApplicableRule: buildRuleSummary(currentApplicableRule),
        mostAppliedRule: dominantHistoricalRule,
        ruleSource: dominantHistoricalRule ? "historical_snapshots" : currentApplicableRule ? "current_resolution" : "none",
        note: dominantHistoricalRule
          ? "Shown from immutable commission snapshots on attributed orders."
          : currentApplicableRule
            ? "Shown from current rule resolution for this influencer."
            : "No active commission rule currently applies to this influencer.",
      },
      recentActivity,
      kpis: [
        { key: "clicks", label: "Product Clicks", value: totalClicks, format: "number", growth: percentChange(totalClicks, 0), sparkline: reels.map((row) => row.metrics?.clicks || 0).slice(0, 12) },
        { key: "orders", label: "Orders Generated", value: totalOrders, format: "number", growth: percentChange(current.orders, previous.orders), sparkline: [...revenueMap.values()].map((row) => row.orders) },
        { key: "conversion", label: "Conversion Rate", value: conversionRate, format: "percent", growth: percentChange(conversionRate, 0), sparkline: [...revenueMap.values()].map((row) => row.orders) },
        { key: "followers", label: "Followers Count", value: followers, format: "number", growth: 0, sparkline: [followers, followers, followers] },
      ],
      metrics: {
        grossRevenue,
        commissionRevenue: totalCommission,
        bonusRevenue: 0,
        campaignRevenue: grossRevenue,
        averageOrderValue,
        engagementRate,
        totalViews,
      },
      revenueOverview: [...revenueMap.values()],
      topProducts,
      topVideos,
      activeCampaigns: activeCampaigns.filter((campaign) => ["active", "accepted", "completed", "proposed"].includes(campaign.status)),
      campaignInvitations: activeCampaigns.filter((campaign) => campaign.status === "proposed"),
      followersGrowth: [...revenueMap.values()].map((row, index, rows) => ({
        date: row.date,
        followers,
        newFollowers: index === rows.length - 1 ? 0 : 0,
        lostFollowers: 0,
        growthRate: 0,
      })),
      recentOrders: {
        rows: recentOrders,
        page,
        limit,
        total: filteredRecords.length,
        totalPages: Math.ceil(filteredRecords.length / limit) || 1,
      },
      quickActions: [
        { key: "affiliate", label: "Create Affiliate Link", href: "/influencer/affiliate-links", enabled: Boolean(profile.permissions?.affiliateLinks) },
        { key: "product", label: "Add Product", href: "/influencer/collections", enabled: Boolean(profile.permissions?.collections) },
        { key: "video", label: "Upload Video", href: "/influencer/reels/upload", enabled: true },
        { key: "collection", label: "Create Collection", href: "/influencer/collections", enabled: Boolean(profile.permissions?.collections) },
      ],
      notifications: {
        unreadCount: 0,
        items: [],
      },
    };
  }

  paymentModelDefinitions() {
    return [
      { key: "all", label: "All", ledgerSources: [] },
      { key: "fixed", label: "Fixed Payment", ledgerSources: ["CAMPAIGN"] },
      { key: "commission", label: "Commission", ledgerSources: ["COMMISSION"] },
      { key: "hybrid", label: "Hybrid", ledgerSources: ["CAMPAIGN", "COMMISSION"] },
      { key: "free_product", label: "Free Product Promotion", ledgerSources: [] },
    ];
  }

  normalizePaymentModelFilter(value = "all") {
    const key = String(value || "all").trim().toLowerCase();
    return this.paymentModelDefinitions().some((item) => item.key === key) ? key : "all";
  }

  buildLedgerDescription(row = {}) {
    const source = String(row.source || "").toLowerCase().replace(/_/g, " ");
    if (row.meta?.releaseId) return "Escrow release";
    if (row.meta?.withdrawalRequestId) return "Withdrawal request";
    if (row.source === "COMMISSION") return "Commission earned";
    if (row.source === "REVERSAL") return "Earnings reversal";
    return source ? `${source[0].toUpperCase()}${source.slice(1)}` : "Wallet transaction";
  }

  ledgerPaymentModel(row = {}) {
    if (row.source === "CAMPAIGN") return "fixed";
    if (row.source === "COMMISSION") return "commission";
    return row.meta?.paymentModel || "";
  }

  async aggregateInfluencerLedger(influencerId, match = {}) {
    const rows = await InfluencerLedger.aggregate([
      { $match: { influencerId, ...match } },
      {
        $group: {
          _id: { type: "$type", source: "$source" },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);
    const bySource = {};
    let credit = 0;
    let debit = 0;
    for (const row of rows) {
      const source = row._id.source || "UNKNOWN";
      const amount = roundMoney(row.total || 0);
      bySource[source] = bySource[source] || { credit: 0, debit: 0, count: 0 };
      bySource[source].count += Number(row.count || 0);
      if (row._id.type === "CREDIT") {
        credit = roundMoney(credit + amount);
        bySource[source].credit = roundMoney(bySource[source].credit + amount);
      } else {
        debit = roundMoney(debit + amount);
        bySource[source].debit = roundMoney(bySource[source].debit + amount);
      }
    }
    return { credit, debit, balance: roundMoney(credit - debit), bySource };
  }

  async getInfluencerEarningsDashboard(userId, query = {}) {
    const profile = await require("../influencer/service").getProfile(userId);
    const influencerId = profile._id;
    const paymentModel = this.normalizePaymentModelFilter(query.paymentModel);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const { start, end } = parseDashboardRange(query);
    const createdAtMatch = { createdAt: { $gte: start, $lte: end } };
    const modelDefinition = this.paymentModelDefinitions().find((item) => item.key === paymentModel);
    const ledgerMatch = paymentModel === "all" || paymentModel === "free_product"
      ? {}
      : { source: { $in: modelDefinition.ledgerSources } };

    const [
      ledgerTotals,
      periodLedgerTotals,
      wallet,
      withdrawalRows,
      withdrawalTotals,
      pendingCommissionLedger,
      pendingCommissionRecords,
      commissionStatusRows,
      commissionRows,
      fixedReleaseRows,
      fixedPendingRows,
      freeProductRows,
      payoutAccounts,
      paymentProfile,
      businessProfile,
      ledgerRows,
      ledgerTotalCount,
      trendRows,
    ] = await Promise.all([
      this.aggregateInfluencerLedger(influencerId),
      this.aggregateInfluencerLedger(influencerId, { ...createdAtMatch, ...ledgerMatch }),
      getOrCreateWallet(influencerId),
      InfluencerWithdrawalRequest.find({ influencerId }).populate("bankAccountId").sort({ requestedAt: -1 }).limit(20).lean(),
      InfluencerWithdrawalRequest.aggregate([
        { $match: { influencerId } },
        { $group: { _id: "$status", amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      CommissionLedger.aggregate([
        { $match: { influencerId, state: { $in: ["PENDING", "APPROVED"] } } },
        { $group: { _id: "$state", amount: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      CommissionRecord.aggregate([
        { $match: { influencerId, state: "HOLD" } },
        { $group: { _id: "$state", amount: { $sum: "$influencerShare" }, count: { $sum: 1 } } },
      ]),
      CommissionRecord.aggregate([
        { $match: { influencerId } },
        { $group: { _id: "$state", amount: { $sum: "$influencerShare" }, count: { $sum: 1 } } },
      ]),
      CommissionRecord.find({ influencerId })
        .populate({ path: "campaignId", select: "title paymentType campaignType state" })
        .populate({
          path: "orderId",
          select: "orderNumber items totalAmount subtotal createdAt",
          populate: { path: "items.productId", select: "name" },
        })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      CampaignPaymentRelease.find({ influencerId })
        .populate("campaignId", "title paymentType campaignType state")
        .sort({ releasedAt: -1, createdAt: -1 })
        .limit(100)
        .lean(),
      DeliverablePayout.find({ influencerId, status: { $in: ["eligible", "generated"] } })
        .populate("campaignId", "title paymentType campaignType state")
        .populate("deliverableId", "deliverableType title approvalStatus paymentEligibility completedAt")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      InfluencerProductAssignment.find({ influencerId, status: { $in: ["assigned", "accepted", "approved", "active"] } })
        .populate("campaignId", "title paymentType campaignType state")
        .populate("productId", "name price discountPrice")
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean(),
      InfluencerPayoutAccount.find({ influencerId, isActive: true }).sort({ isDefault: -1, createdAt: -1 }).lean(),
      InfluencerPaymentProfile.findOne({ influencerId }).sort({ updatedAt: -1 }).lean(),
      InfluencerBusinessProfile.findOne({ influencerId }).sort({ updatedAt: -1 }).lean(),
      InfluencerLedger.find({ influencerId, ...ledgerMatch })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      InfluencerLedger.countDocuments({ influencerId, ...ledgerMatch }),
      InfluencerLedger.aggregate([
        { $match: { influencerId, ...createdAtMatch, ...ledgerMatch } },
        {
          $group: {
            _id: {
              month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
              source: "$source",
              type: "$type",
            },
            amount: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.month": 1 } },
      ]),
    ]);

    const pendingWithdrawalStatuses = new Set(["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROCESSING"]);
    const pendingWithdrawals = withdrawalTotals
      .filter((row) => pendingWithdrawalStatuses.has(row._id))
      .reduce((sum, row) => roundMoney(sum + Number(row.amount || 0)), 0);
    const completedWithdrawals = withdrawalTotals
      .filter((row) => row._id === "COMPLETED")
      .reduce((sum, row) => roundMoney(sum + Number(row.amount || 0)), 0);
    const pendingCommissionFromEngine = pendingCommissionLedger.reduce((sum, row) => roundMoney(sum + Number(row.amount || 0)), 0);
    const pendingCommission = pendingCommissionFromEngine || roundMoney(pendingCommissionRecords[0]?.amount || 0);
    const pendingFixed = fixedPendingRows.reduce((sum, row) => roundMoney(sum + Number(row.approvedAmount || 0)), 0);
    const fixedEarnings = roundMoney(ledgerTotals.bySource.CAMPAIGN?.credit || 0);
    const commissionEarnings = roundMoney(ledgerTotals.bySource.COMMISSION?.credit || 0);
    const totalEarnings = roundMoney(ledgerTotals.credit);
    const availableBalance = roundMoney(ledgerTotals.balance);
    const pendingBalance = roundMoney(pendingCommission + pendingFixed);
    const currentWalletSnapshot = {
      id: wallet?._id,
      storedAvailableBalance: roundMoney(wallet?.availableBalance || 0),
      storedPendingBalance: roundMoney(wallet?.pendingBalance || 0),
      storedTotalEarnings: roundMoney(wallet?.totalEarnings || 0),
      storedWithdrawnBalance: roundMoney(wallet?.withdrawnBalance || wallet?.withdrawnAmount || 0),
      calculatedAvailableBalance: availableBalance,
      calculatedPendingBalance: pendingBalance,
      calculatedTotalEarnings: totalEarnings,
      calculatedWithdrawnAmount: completedWithdrawals,
      source: "influencer_ledgers",
    };

    const commissionByState = commissionStatusRows.reduce((acc, row) => {
      acc[row._id] = { amount: roundMoney(row.amount), count: Number(row.count || 0) };
      return acc;
    }, {});
    const fixedReleasedAmount = fixedReleaseRows.reduce((sum, row) => roundMoney(sum + Number(row.netAmount || row.totalAmount || 0)), 0);
    const freeProductDelivered = freeProductRows.filter((row) => ["active", "approved"].includes(String(row.status))).length;
    const freeProductValue = freeProductRows.reduce((sum, row) => {
      const product = row.productId || {};
      return roundMoney(sum + Number(product.discountPrice || product.price || row.metadata?.productValue || 0));
    }, 0);

    const trendMap = new Map();
    for (const row of trendRows) {
      const month = row._id.month;
      const source = row._id.source;
      const type = row._id.type;
      const item = trendMap.get(month) || { month, fixed: 0, commission: 0, hybrid: 0, withdrawals: 0, total: 0 };
      const amount = roundMoney(row.amount || 0);
      if (source === "CAMPAIGN" && type === "CREDIT") item.fixed = roundMoney(item.fixed + amount);
      if (source === "COMMISSION" && type === "CREDIT") item.commission = roundMoney(item.commission + amount);
      if (source === "WITHDRAWAL" && type === "DEBIT") item.withdrawals = roundMoney(item.withdrawals + amount);
      if (type === "CREDIT") item.total = roundMoney(item.total + amount);
      trendMap.set(month, item);
    }

    const kpis = [
      { key: "available_balance", label: "Available Balance", value: availableBalance, format: "currency", formula: "Approved ledger credits less withdrawal and reversal debits" },
      { key: "pending_balance", label: "Pending Balance", value: pendingBalance, format: "currency", formula: "Pending commission plus approved deliverables awaiting release" },
      { key: "total_earnings", label: "Total Earnings", value: totalEarnings, format: "currency", formula: "All wallet credit ledger records" },
      { key: "withdrawn_amount", label: "Withdrawn Amount", value: completedWithdrawals, format: "currency", formula: "Completed withdrawal requests" },
    ];

    const bankAccounts = payoutAccounts.map((account) => ({
      id: String(account._id),
      label: account.bankName || account.paymentMethod || "Payout account",
      paymentMethod: account.paymentMethod,
      accountHolderName: account.accountHolderName,
      accountNumberMask: account.accountNumberMask || "",
      isDefault: Boolean(account.isDefault),
      isVerified: Boolean(account.isVerified),
      verificationStatus: account.verificationStatus,
    }));
    if (!bankAccounts.length && paymentProfile) {
      bankAccounts.push({
        id: "",
        label: paymentProfile.bankName || paymentProfile.payoutMethod || "Registered payment profile",
        paymentMethod: paymentProfile.payoutMethod,
        accountHolderName: paymentProfile.accountHolderName,
        accountNumberMask: paymentProfile.accountNumberMask || "",
        isDefault: true,
        isVerified: paymentProfile.status === "verified",
        verificationStatus: String(paymentProfile.status || "draft").toUpperCase(),
      });
    }

    const kycApproved = ["active", "verified"].includes(String(profile.state || "").toLowerCase()) || businessProfile?.status === "verified";
    const bankVerified = bankAccounts.some((account) => account.isVerified || account.verificationStatus === "VERIFIED");
    const minimumWithdrawalAmount = Number(profile.preferences?.minimumPayoutThreshold || process.env.INFLUENCER_MIN_PAYOUT_THRESHOLD || 500);

    return {
      filters: { paymentModel, range: query.range || "30d", startDate: start, endDate: end },
      paymentModels: this.paymentModelDefinitions(),
      wallet: currentWalletSnapshot,
      kpis,
      breakdown: [
        { key: "fixed", label: "Fixed Earnings", value: fixedEarnings, format: "currency" },
        { key: "commission", label: "Commission Earnings", value: commissionEarnings, format: "currency" },
        { key: "hybrid", label: "Hybrid Earnings", value: roundMoney(fixedEarnings + commissionEarnings), format: "currency" },
        { key: "free_product", label: "Free Product Campaigns", value: freeProductDelivered, unit: "Products Received", format: "number" },
      ],
      views: {
        fixed: {
          cards: [
            { key: "released_amount", label: "Released Amount", value: fixedReleasedAmount, format: "currency" },
            { key: "unreleased_amount", label: "Unreleased Amount", value: pendingFixed, format: "currency" },
          ],
          rows: [
            ...fixedReleaseRows.flatMap((release) => (release.deliverables || []).map((deliverable) => ({
              id: `${release._id}-${deliverable.deliverableId}`,
              campaignName: release.campaignId?.title || "Campaign",
              deliverable: deliverable.title || deliverable.type || "Deliverable",
              amount: deliverable.amount || release.netAmount || 0,
              status: "Approved",
              releaseStatus: release.status === "settled" ? "Released" : release.status,
              releasedDate: release.releasedAt || release.settledAt || release.updatedAt,
            }))),
            ...fixedPendingRows.map((row) => ({
              id: String(row._id),
              campaignName: row.campaignId?.title || "Campaign",
              deliverable: row.deliverableId?.title || row.deliverableId?.deliverableType || "Deliverable",
              amount: row.approvedAmount,
              status: row.deliverableId?.approvalStatus || "approved",
              releaseStatus: "Not Released",
              releasedDate: null,
            })),
          ],
        },
        commission: {
          cards: [
            { key: "commission_earnings", label: "Commission Earnings", value: roundMoney(commissionEarnings + pendingCommission), format: "currency" },
            { key: "pending_commission", label: "Pending Commission", value: pendingCommission, format: "currency" },
            { key: "approved_commission", label: "Approved Commission", value: roundMoney(commissionByState.SETTLED?.amount || 0), format: "currency" },
            { key: "paid_commission", label: "Paid Commission", value: roundMoney(ledgerTotals.bySource.COMMISSION?.credit || 0), format: "currency" },
          ],
          rows: commissionRows.slice(0, 50).map((row) => ({
            id: String(row._id),
            campaign: row.campaignId?.title || "Campaign",
            product: row.metadata?.productName || row.orderId?.items?.[0]?.name || row.orderId?.items?.[0]?.productId?.name || "Product",
            saleAmount: row.gross,
            commissionPercent: row.commissionPercent,
            commissionAmount: row.influencerShare,
            status: row.state,
          })),
        },
        hybrid: {
          cards: [
            { key: "released_amount", label: "Released Amount", value: fixedReleasedAmount, format: "currency" },
            { key: "unreleased_amount", label: "Unreleased Amount", value: pendingFixed, format: "currency" },
            { key: "commission_earned", label: "Commission Earned", value: commissionEarnings, format: "currency" },
            { key: "pending_commission", label: "Pending Commission", value: pendingCommission, format: "currency" },
            { key: "approved_commission", label: "Approved Commission", value: roundMoney(commissionByState.SETTLED?.amount || 0), format: "currency" },
          ],
          rows: fixedReleaseRows.slice(0, 50).map((row) => {
            const commission = commissionRows
              .filter((record) => String(record.campaignId?._id || record.campaignId) === String(row.campaignId?._id || row.campaignId))
              .reduce((sum, record) => roundMoney(sum + Number(record.influencerShare || 0)), 0);
            return {
              id: String(row._id),
              campaign: row.campaignId?.title || "Campaign",
              fixedAmount: row.netAmount || row.totalAmount || 0,
              commissionAmount: commission,
              totalEarnings: roundMoney(Number(row.netAmount || row.totalAmount || 0) + commission),
              status: row.status,
            };
          }),
        },
        freeProduct: {
          cards: [
            { key: "products_received", label: "Products Received", value: freeProductDelivered, format: "number" },
            { key: "products_pending", label: "Products Pending Shipment", value: freeProductRows.filter((row) => ["assigned", "accepted"].includes(String(row.status))).length, format: "number" },
            { key: "products_delivered", label: "Products Delivered", value: freeProductDelivered, format: "number" },
            { key: "product_value_received", label: "Product Value Received", value: freeProductValue, format: "currency" },
          ],
          rows: freeProductRows.map((row) => ({
            id: String(row._id),
            campaign: row.campaignId?.title || "Campaign",
            product: row.productId?.name || "Product",
            value: Number(row.productId?.discountPrice || row.productId?.price || row.metadata?.productValue || 0),
            shipmentStatus: row.metadata?.shipmentStatus || row.status,
            deliveryDate: row.metadata?.deliveredAt || row.approvedAt || row.updatedAt,
          })),
        },
      },
      withdrawals: {
        availableBalance,
        minimumWithdrawalAmount,
        pendingWithdrawals,
        kycStatus: kycApproved ? "APPROVED" : "PENDING",
        bankAccountVerified: bankVerified,
        bankAccounts,
        eligibility: {
          kycApproved,
          bankAccountVerified: bankVerified,
          amountMeetsMinimum: availableBalance >= minimumWithdrawalAmount,
          hasAvailableBalance: availableBalance > 0,
          noPendingComplianceIssues: wallet?.status === "active",
          canWithdraw: kycApproved && bankVerified && availableBalance >= minimumWithdrawalAmount && wallet?.status === "active",
        },
        history: withdrawalRows.map((row) => ({
          id: String(row._id),
          requestId: String(row._id).slice(-8).toUpperCase(),
          amount: row.amount,
          status: row.status,
          requestedDate: row.requestedAt || row.createdAt,
          processedDate: row.completedAt || row.processedAt || row.approvedAt || null,
          transactionReference: row.transactionReference || "",
          bankAccount: row.bankAccountId?.bankName || row.bankAccountId?.paymentMethod || "",
        })),
      },
      transactionLedger: {
        rows: ledgerRows.map((row) => ({
          id: String(row._id),
          date: row.createdAt,
          description: this.buildLedgerDescription(row),
          source: row.source,
          paymentModel: this.ledgerPaymentModel(row),
          credit: row.type === "CREDIT" ? row.amount : 0,
          debit: row.type === "DEBIT" ? row.amount : 0,
          balance: row.balanceAfter,
          reference: row.meta?.releaseId || row.meta?.withdrawalRequestId || row.orderId || row.idempotencyKey,
        })),
        pagination: { total: ledgerTotalCount, page, limit, pages: Math.ceil(ledgerTotalCount / limit) || 1 },
      },
      analytics: {
        monthlyEarnings: [...trendMap.values()],
        fixedEarningsTrend: [...trendMap.values()].map(({ month, fixed }) => ({ month, value: fixed })),
        commissionTrend: [...trendMap.values()].map(({ month, commission }) => ({ month, value: commission })),
        hybridTrend: [...trendMap.values()].map(({ month, fixed, commission }) => ({ month, value: roundMoney(fixed + commission) })),
        withdrawalTrend: [...trendMap.values()].map(({ month, withdrawals }) => ({ month, value: withdrawals })),
      },
      sourceSummary: {
        periodLedgerTotals,
        pendingCommissionRecords: pendingCommissionFromEngine ? "commission_ledgers" : "commission_records_legacy",
      },
    };
  }

  async requestInfluencerWithdrawal(userId, payload = {}, actor = {}, meta = {}) {
    const profile = await require("../influencer/service").getProfile(userId);
    const influencerId = profile._id;
    const amount = roundMoney(payload.amount);
    const minimumWithdrawalAmount = Number(profile.preferences?.minimumPayoutThreshold || process.env.INFLUENCER_MIN_PAYOUT_THRESHOLD || 500);
    if (!amount || amount <= 0) throw new AppError("Withdrawal amount is required", 400, "VALIDATION_ERROR");
    if (amount < minimumWithdrawalAmount) {
      throw new AppError(`Minimum withdrawal amount is ${minimumWithdrawalAmount}`, 400, "MIN_WITHDRAWAL_NOT_MET");
    }

    const [businessProfile, paymentProfile, payoutAccount, pendingRequest] = await Promise.all([
      InfluencerBusinessProfile.findOne({ influencerId }).sort({ updatedAt: -1 }).lean(),
      InfluencerPaymentProfile.findOne({ influencerId }).sort({ updatedAt: -1 }).lean(),
      payload.bankAccountId && mongoose.isValidObjectId(payload.bankAccountId)
        ? InfluencerPayoutAccount.findOne({ _id: payload.bankAccountId, influencerId, isActive: true }).lean()
        : InfluencerPayoutAccount.findOne({ influencerId, isActive: true, isDefault: true }).lean(),
      InfluencerWithdrawalRequest.findOne({ influencerId, status: { $in: ["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROCESSING"] } }).lean(),
    ]);

    const kycApproved = ["active", "verified"].includes(String(profile.state || "").toLowerCase()) || businessProfile?.status === "verified";
    if (!kycApproved) throw new AppError("KYC must be approved before withdrawal", 400, "KYC_NOT_APPROVED");
    const bankVerified = Boolean(payoutAccount?.isVerified || payoutAccount?.verificationStatus === "VERIFIED" || paymentProfile?.status === "verified");
    if (!bankVerified) throw new AppError("Verified bank account is required before withdrawal", 400, "BANK_ACCOUNT_NOT_VERIFIED");
    if (pendingRequest) throw new AppError("A withdrawal request is already pending review", 409, "PENDING_WITHDRAWAL_EXISTS");

    const result = await executeWithOptionalTransaction(async (session) => {
      const wallet = await getOrCreateWallet(influencerId, session);
      if (wallet.status !== "active") throw new AppError("Influencer wallet is not active", 400, "WALLET_NOT_ACTIVE");
      const ledgerTotals = await this.aggregateInfluencerLedger(influencerId);
      if (roundMoney(ledgerTotals.balance) < amount) {
        throw new AppError("Withdrawal amount exceeds available balance", 400, "INSUFFICIENT_BALANCE");
      }

      const nextAvailable = roundMoney(wallet.availableBalance) >= amount
        ? roundMoney(wallet.availableBalance) - amount
        : roundMoney(ledgerTotals.balance) - amount;
      const idempotencyKey = `withdrawal:${influencerId}:${crypto.randomUUID()}`;
      const [request] = await InfluencerWithdrawalRequest.create([{
        influencerId,
        walletId: wallet._id,
        amount,
        status: "REQUESTED",
        bankAccountId: payoutAccount?._id,
        requestedAt: new Date(),
        idempotencyKey,
        metadata: {
          requestedBy: actor?.sub || actor?._id || userId,
          ipAddress: meta?.ipAddress || "",
        },
      }], { session: session || undefined });

      const updatedWallet = await InfluencerWallet.findByIdAndUpdate(
        wallet._id,
        { $set: { availableBalance: Math.max(0, nextAvailable) } },
        { returnDocument: "after", runValidators: true, session: session || undefined }
      );

      const [ledgerEntry] = await InfluencerLedger.create([{
        influencerId,
        type: "DEBIT",
        amount,
        source: "WITHDRAWAL",
        idempotencyKey,
        balanceAfter: updatedWallet.availableBalance,
        meta: {
          withdrawalRequestId: request._id,
          bankAccountId: payoutAccount?._id || null,
          status: "REQUESTED",
        },
      }], { session: session || undefined });

      await auditService.log({
        actor,
        action: "influencer.withdrawal.requested",
        entityType: "InfluencerWithdrawalRequest",
        entityId: request._id,
        metadata: { influencerId: String(influencerId), amount, ledgerEntryId: String(ledgerEntry._id) },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      }).catch(() => {});

      return { request, wallet: updatedWallet, ledgerEntry };
    });

    if (typeof notificationService.notifyOperations === "function") {
      await notificationService.notifyOperations({
        module: "FINANCE",
        subModule: "INFLUENCER_WITHDRAWALS",
        type: "WITHDRAWAL_REQUESTED",
        title: "New influencer withdrawal request",
        message: `An influencer requested a withdrawal of INR ${amount}.`,
        referenceId: result.request._id,
        meta: { influencerId, amount },
      }, "payouts.read").catch(() => null);
    }

    return result;
  }

  async simulateCommission(payload = {}) {
    const optionalText = (value) => {
      const normalized = String(value ?? "").trim();
      return normalized || undefined;
    };
    const influencerId = optionalText(payload.influencerId);
    const campaignId = optionalText(payload.campaignId);
    const productId = optionalText(payload.productId);
    const categoryId = optionalText(payload.categoryId);
    const vendorId = optionalText(payload.vendorId);
    const trafficSource = optionalText(payload.trafficSource) || "affiliate_link";
    const revenue = Number(payload.revenue || 0);
    const result = await this.calculateCommission({
      influencerId,
      campaignId,
      productId,
      categoryId,
      trafficSource,
      revenue,
      expectedOrders: payload.expectedOrders,
      conversionRate: payload.conversionRate,
      campaignCompletion: payload.campaignCompletion,
      reelEngagement: payload.reelEngagement,
      reelEngagementTarget: payload.reelEngagementTarget,
      order: {
        subtotal: revenue,
        totalAmount: revenue,
        discountAmount: payload.discounts || 0,
        platformFee: payload.platformAdjustments || 0,
        sellerId: vendorId,
        attribution: {
          influencerId,
          campaignId,
          productId,
          surface: trafficSource,
        },
        items: productId ? [{ productId }] : [],
      },
    });
    if (result.skipped) {
      return {
        appliedRule: null,
        reason: result.reason,
        commissionPercent: 0,
        bonusPercent: 0,
        finalEarnings: 0,
        settlementProjection: null,
      };
    }
    return {
      appliedRule: {
        id: result.rule._id,
        ruleName: result.rule.ruleName,
        ruleCode: result.rule.ruleCode,
        ruleType: result.rule.ruleType,
        version: result.rule.version,
      },
      commissionPercent: result.commissionPercent,
      commissionAmount: result.commissionAmount,
      bonusPercent: result.bonusPercent,
      bonusAmount: result.bonusAmount,
      finalEarnings: result.finalEarnings,
      settlementProjection: {
        cycle: payload.cycle || "weekly",
        estimatedApprovalDate: addDays(new Date(), HOLD_DAYS),
      },
    };
  }

  async getAdminDashboard(query = {}) {
    const match = {};
    if (query.from || query.to) {
      match.createdAt = {};
      if (query.from) match.createdAt.$gte = new Date(query.from);
      if (query.to) match.createdAt.$lte = new Date(query.to);
    }
    const [
      snapshotSummary,
      ledgerSummary,
      topInfluencers,
      topCampaigns,
      topProducts,
      topCategories,
      trafficSourcePerformance,
      pendingSettlement,
    ] = await Promise.all([
      CommissionSnapshot.aggregate([{ $match: match }, { $group: { _id: null, totalCommission: { $sum: "$finalEarnings" }, bonus: { $sum: "$bonusAmount" }, count: { $sum: 1 } } }]),
      CommissionLedger.aggregate([{ $match: match }, { $group: { _id: "$state", total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
      CommissionSnapshot.aggregate([{ $match: match }, { $group: { _id: "$influencerId", total: { $sum: "$finalEarnings" }, orders: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 10 }]),
      CommissionSnapshot.aggregate([{ $match: match }, { $group: { _id: "$campaignId", total: { $sum: "$finalEarnings" }, orders: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 10 }]),
      CommissionSnapshot.aggregate([{ $match: match }, { $group: { _id: "$productId", total: { $sum: "$finalEarnings" }, orders: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 10 }]),
      CommissionSnapshot.aggregate([{ $match: match }, { $group: { _id: "$categoryId", total: { $sum: "$finalEarnings" }, orders: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 10 }]),
      CommissionSnapshot.aggregate([{ $match: match }, { $group: { _id: "$trafficSource", total: { $sum: "$finalEarnings" }, revenue: { $sum: "$eligibleRevenue" }, orders: { $sum: 1 } } }, { $sort: { total: -1 } }]),
      CommissionLedger.aggregate([{ $match: { state: "APPROVED" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    ]);
    const byState = ledgerSummary.reduce((acc, row) => {
      acc[row._id] = { amount: roundMoney(row.total), count: row.count };
      return acc;
    }, {});
    return {
      totalCommission: roundMoney(snapshotSummary[0]?.totalCommission || 0),
      pendingCommission: byState.PENDING?.amount || 0,
      approvedCommission: byState.APPROVED?.amount || 0,
      settledCommission: byState.SETTLED?.amount || 0,
      paidCommission: byState.PAID?.amount || 0,
      reversedCommission: byState.REVERSED?.amount || 0,
      bonusCommission: roundMoney(snapshotSummary[0]?.bonus || 0),
      topInfluencers,
      topCampaigns,
      topProducts,
      topCategories,
      trafficSourcePerformance,
      settlementForecast: {
        amount: roundMoney(pendingSettlement[0]?.total || 0),
        entries: Number(pendingSettlement[0]?.count || 0),
      },
    };
  }

  async createSettlement(payload = {}, actor = {}, meta = {}) {
    const cycle = payload.cycle || "weekly";
    const periodStart = payload.periodStart ? new Date(payload.periodStart) : addDays(new Date(), -7);
    const periodEnd = payload.periodEnd ? new Date(payload.periodEnd) : new Date();
    const entries = await CommissionLedger.find({
      state: "APPROVED",
      createdAt: { $gte: periodStart, $lte: periodEnd },
    }).lean();
    const totalAmount = roundMoney(entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0));
    const settlement = await CommissionSettlement.create({
      cycle,
      status: "PENDING_APPROVAL",
      periodStart,
      periodEnd,
      totalAmount,
      entryCount: entries.length,
      metadata: { createdBy: actor?._id || actor?.sub || null },
    });
    await CommissionLedger.updateMany({ _id: { $in: entries.map((entry) => entry._id) } }, { $set: { settlementId: settlement._id, state: "SETTLED" } });
    await this.auditCommission("SETTLEMENT_CREATED", "CommissionSettlement", settlement._id, { actor, newValue: settlement.toObject(), reason: payload.reason, meta });
    return settlement;
  }

  async listSettlements(query = {}) {
    const filter = {};
    if (query.status) filter.status = String(query.status).toUpperCase();
    if (query.startDate || query.from) filter.periodStart = { $gte: new Date(query.startDate || query.from) };
    if (query.endDate || query.to) filter.periodEnd = { ...(filter.periodEnd || {}), $lte: new Date(query.endDate || query.to) };
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const [items, total] = await Promise.all([
      CommissionSettlement.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      CommissionSettlement.countDocuments(filter),
    ]);
    return { items, pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 } };
  }

  async approveSettlement(settlementId, actor = {}, meta = {}) {
    const settlement = await CommissionSettlement.findByIdAndUpdate(
      settlementId,
      { $set: { status: "APPROVED", approvedBy: actor?._id || actor?.sub || undefined, approvedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!settlement) throw new AppError("Settlement not found", 404, "NOT_FOUND");
    await this.auditCommission("SETTLEMENT_APPROVED", "CommissionSettlement", settlement._id, { actor, newValue: settlement.toObject(), meta });
    return settlement;
  }

  async preparePayoutBatch(settlementId, actor = {}, meta = {}) {
    const settlement = await CommissionSettlement.findById(settlementId).lean();
    if (!settlement) throw new AppError("Settlement not found", 404, "NOT_FOUND");
    if (!["APPROVED", "QUEUED_FOR_PAYOUT"].includes(settlement.status)) throw new AppError("Settlement must be approved before payout", 400, "SETTLEMENT_NOT_APPROVED");
    const rows = await CommissionLedger.aggregate([
      { $match: { settlementId: new mongoose.Types.ObjectId(settlementId), state: "SETTLED" } },
      { $group: { _id: "$influencerId", amount: { $sum: "$amount" }, ledgerIds: { $push: "$_id" } } },
    ]);
    const influencerIds = rows.map((row) => row._id);
    const [wallets, accounts, profiles] = await Promise.all([
      InfluencerWallet.find({ influencerId: { $in: influencerIds } }).lean(),
      InfluencerPayoutAccount.find({ influencerId: { $in: influencerIds }, isActive: true, isDefault: true }).lean(),
      InfluencerProfile.find({ _id: { $in: influencerIds } }).lean(),
    ]);
    const walletByInfluencer = new Map(wallets.map((wallet) => [String(wallet.influencerId), wallet]));
    const accountByInfluencer = new Map(accounts.map((account) => [String(account.influencerId), account]));
    const profileById = new Map(profiles.map((profile) => [String(profile._id), profile]));
    const entries = rows.map((row) => {
      const key = String(row._id);
      const wallet = walletByInfluencer.get(key);
      const account = accountByInfluencer.get(key);
      const profile = profileById.get(key);
      const blocked = wallet?.status === "suspended" || profile?.state === "suspended";
      return {
        influencerId: row._id,
        payoutAccountId: account?._id,
        paymentMethod: account?.paymentMethod || "manual",
        kycStatus: account?.verificationStatus || "PENDING",
        availableBalance: roundMoney(wallet?.availableBalance || 0),
        payoutAmount: roundMoney(row.amount || 0),
        ledgerIds: row.ledgerIds,
        status: blocked ? "BLOCKED" : account && account.isVerified ? "READY" : "KYC_PENDING",
      };
    });
    const batch = await CommissionPayoutBatch.create({
      settlementId,
      status: entries.every((entry) => entry.status === "READY") ? "READY" : "DRAFT",
      totalAmount: roundMoney(entries.reduce((sum, entry) => sum + (entry.status === "READY" ? Number(entry.payoutAmount || 0) : 0), 0)),
      influencerCount: entries.length,
      entries,
    });
    await CommissionLedger.updateMany({ settlementId }, { $set: { payoutBatchId: batch._id } });
    await CommissionSettlement.updateOne({ _id: settlementId }, { $set: { status: "QUEUED_FOR_PAYOUT" } });
    await this.auditCommission("PAYOUT_PREPARED", "CommissionPayoutBatch", batch._id, { actor, newValue: batch.toObject(), meta });
    return batch;
  }

  async listAuditLogs(query = {}) {
    const filter = {};
    if (query.action) filter.action = query.action;
    if (query.entityType) filter.entityType = query.entityType;
    if (query.search) {
      const re = new RegExp(String(query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ action: re }, { entityType: re }, { userRole: re }, { reason: re }];
    }
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const [logs, total] = await Promise.all([
      CommissionAuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      CommissionAuditLog.countDocuments(filter),
    ]);
    return { logs, pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 } };
  }

  async getOverview() {
    const [records, ledgers] = await Promise.all([
      CommissionRecord.find({})
        .populate("influencerId", "userId")
        .populate("vendorId", "shopName companyName")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      InfluencerLedger.find({}).sort({ createdAt: -1 }).limit(100).lean(),
    ]);
    return { records, ledgers };
  }

  registerEventHandlers() {
    registerHandler(INFLUENCER_EVENTS.ORDER_DELIVERED, async ({ orderId }) => {
      await this.settleForOrder(orderId);
    });
    registerHandler(INFLUENCER_EVENTS.ORDER_ELIGIBLE_FOR_SETTLEMENT, async ({ orderId }) => {
      await this.settleForOrder(orderId);
    });
  }
}

module.exports = new CommissionService();
