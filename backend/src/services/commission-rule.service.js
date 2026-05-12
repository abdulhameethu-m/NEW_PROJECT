const mongoose = require("mongoose");
const { AppError } = require("../utils/AppError");
const { CommissionRule } = require("../models/CommissionRule");
const { PlatformLedger } = require("../models/PlatformLedger");
const { Product } = require("../models/Product");

const APPLIES_TO_RANK = {
  product: 4,
  vendor: 3,
  category: 2,
  global: 1,
};

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildRuleMatchTarget(rule = {}) {
  if (rule.appliesTo === "product") return String(rule.productId || "");
  if (rule.appliesTo === "vendor") return String(rule.vendorId || "");
  if (rule.appliesTo === "category") return String(rule.categoryId || "");
  return "global";
}

class CommissionRuleService {
  validateRulePayload(payload = {}, { partial = false } = {}) {
    const draft = payload || {};
    if (!partial || draft.type != null) {
      if (!["percentage", "fixed"].includes(String(draft.type || ""))) {
        throw new AppError("Invalid commission type", 400, "VALIDATION_ERROR");
      }
    }
    if (!partial || draft.appliesTo != null) {
      if (!["global", "category", "vendor", "product"].includes(String(draft.appliesTo || ""))) {
        throw new AppError("Invalid commission scope", 400, "VALIDATION_ERROR");
      }
    }
    if (!partial || draft.value != null) {
      const value = Number(draft.value);
      if (!Number.isFinite(value) || value < 0) {
        throw new AppError("Commission value must be a positive number", 400, "VALIDATION_ERROR");
      }
      if (String(draft.type) === "percentage" && value > 100) {
        throw new AppError("Percentage commission cannot exceed 100", 400, "VALIDATION_ERROR");
      }
    }
    const scope = String(draft.appliesTo || "");
    if ((!partial || draft.appliesTo != null) && scope === "category" && !draft.categoryId) {
      throw new AppError("categoryId is required for category rules", 400, "VALIDATION_ERROR");
    }
    if ((!partial || draft.appliesTo != null) && scope === "vendor" && !draft.vendorId) {
      throw new AppError("vendorId is required for vendor rules", 400, "VALIDATION_ERROR");
    }
    if ((!partial || draft.appliesTo != null) && scope === "product" && !draft.productId) {
      throw new AppError("productId is required for product rules", 400, "VALIDATION_ERROR");
    }
  }

  async assertNoOverlappingRule(ruleData, excludeRuleId = null) {
    const startDate = normalizeDate(ruleData.startDate);
    const endDate = normalizeDate(ruleData.endDate);
    if (startDate && endDate && startDate > endDate) {
      throw new AppError("startDate cannot be after endDate", 400, "VALIDATION_ERROR");
    }

    const query = {
      _id: excludeRuleId ? { $ne: excludeRuleId } : { $exists: true },
      appliesTo: ruleData.appliesTo,
      active: true,
    };
    if (ruleData.appliesTo === "product") query.productId = ruleData.productId;
    if (ruleData.appliesTo === "vendor") query.vendorId = ruleData.vendorId;
    if (ruleData.appliesTo === "category") query.categoryId = ruleData.categoryId;

    const existing = await CommissionRule.find(query).lean();
    const hasOverlap = existing.some((rule) => {
      const leftStart = normalizeDate(rule.startDate) || new Date("1970-01-01T00:00:00.000Z");
      const leftEnd = normalizeDate(rule.endDate) || new Date("2999-12-31T23:59:59.999Z");
      const rightStart = startDate || new Date("1970-01-01T00:00:00.000Z");
      const rightEnd = endDate || new Date("2999-12-31T23:59:59.999Z");
      return leftStart <= rightEnd && rightStart <= leftEnd;
    });

    if (hasOverlap) {
      throw new AppError("Overlapping active commission rule exists for the same target", 409, "COMMISSION_RULE_CONFLICT");
    }
  }

  async createRule(payload = {}, actorId = null) {
    this.validateRulePayload(payload);
    await this.assertNoOverlappingRule(payload);
    const created = await CommissionRule.create({
      ...payload,
      createdBy: actorId || undefined,
      updatedBy: actorId || undefined,
    });
    return created;
  }

  async updateRule(ruleId, payload = {}, actorId = null) {
    if (!mongoose.isValidObjectId(ruleId)) throw new AppError("Invalid rule id", 400, "VALIDATION_ERROR");
    this.validateRulePayload(payload, { partial: true });
    const current = await CommissionRule.findById(ruleId);
    if (!current) throw new AppError("Commission rule not found", 404, "NOT_FOUND");
    const merged = {
      ...current.toObject(),
      ...payload,
      updatedBy: actorId || current.updatedBy,
    };
    await this.assertNoOverlappingRule(merged, ruleId);
    Object.assign(current, payload, { updatedBy: actorId || current.updatedBy });
    await current.save();
    return current;
  }

  async listRules(query = {}) {
    const filter = {};
    if (query.active != null) filter.active = String(query.active) === "true";
    if (query.appliesTo) filter.appliesTo = query.appliesTo;
    if (query.vendorId && mongoose.isValidObjectId(query.vendorId)) filter.vendorId = query.vendorId;
    if (query.categoryId && mongoose.isValidObjectId(query.categoryId)) filter.categoryId = query.categoryId;
    if (query.productId && mongoose.isValidObjectId(query.productId)) filter.productId = query.productId;
    const rules = await CommissionRule.find(filter).sort({ priority: -1, createdAt: -1 }).lean();
    return { rules };
  }

  async resolveApplicableRule({ productId = null, vendorId = null, categoryId = null, at = new Date() } = {}) {
    const now = normalizeDate(at) || new Date();
    const baseFilter = {
      active: true,
      $and: [{ $or: [{ startDate: null }, { startDate: { $lte: now } }] }, { $or: [{ endDate: null }, { endDate: { $gte: now } }] }],
    };

    const candidates = await CommissionRule.find({
      ...baseFilter,
      $or: [
        ...(productId ? [{ appliesTo: "product", productId }] : []),
        ...(vendorId ? [{ appliesTo: "vendor", vendorId }] : []),
        ...(categoryId ? [{ appliesTo: "category", categoryId }] : []),
        { appliesTo: "global" },
      ],
    })
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    if (!candidates.length) return null;
    const scored = candidates.map((rule) => ({
      ...rule,
      _rank: APPLIES_TO_RANK[rule.appliesTo] || 0,
    }));
    scored.sort((a, b) => (b._rank - a._rank) || (Number(b.priority || 0) - Number(a.priority || 0)) || (new Date(b.createdAt) - new Date(a.createdAt)));
    return scored[0];
  }

  calculateFromRule({ subtotal, rule }) {
    const amountBase = roundMoney(subtotal || 0);
    if (!rule || amountBase <= 0) {
      return {
        commissionType: "percentage",
        commissionValue: 0,
        commissionAmount: 0,
        vendorNetAmount: amountBase,
        appliedRule: null,
      };
    }

    const type = String(rule.type || "percentage");
    const value = Number(rule.value || 0);
    let commissionAmount = 0;
    if (type === "percentage") {
      commissionAmount = roundMoney((amountBase * value) / 100);
    } else {
      commissionAmount = roundMoney(value);
    }
    if (commissionAmount > amountBase) {
      throw new AppError("Commission cannot exceed item subtotal", 409, "COMMISSION_EXCEEDS_SUBTOTAL");
    }
    return {
      commissionType: type,
      commissionValue: value,
      commissionAmount,
      vendorNetAmount: roundMoney(amountBase - commissionAmount),
      appliedRule: {
        ruleId: rule._id,
        name: rule.name,
        appliesTo: rule.appliesTo,
        priority: Number(rule.priority || 0),
        target: buildRuleMatchTarget(rule),
      },
    };
  }

  async calculateForOrderItem({ productId, vendorId, subtotal, at = new Date(), categoryId = null }) {
    let resolvedCategoryId = categoryId || null;
    if (!resolvedCategoryId && productId && mongoose.isValidObjectId(productId)) {
      const product = await Product.findById(productId).select("_id categoryId").lean();
      resolvedCategoryId = product?.categoryId || null;
    }
    const rule = await this.resolveApplicableRule({ productId, vendorId, categoryId: resolvedCategoryId, at });
    return this.calculateFromRule({ subtotal, rule });
  }

  async getAdminAnalytics({ days = 30 } = {}) {
    const since = new Date(Date.now() - Math.max(Number(days) || 30, 1) * 24 * 60 * 60 * 1000);
    const [summaryAgg, byVendor, byCategory, byProduct] = await Promise.all([
      PlatformLedger.aggregate([
        { $match: { source: "ORDER_COMMISSION", createdAt: { $gte: since } } },
        { $group: { _id: null, totalCommission: { $sum: "$amount" }, orders: { $sum: 1 } } },
      ]),
      PlatformLedger.aggregate([
        { $match: { source: "ORDER_COMMISSION", createdAt: { $gte: since } } },
        { $group: { _id: "$vendorId", totalCommission: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { totalCommission: -1 } },
        { $limit: 20 },
      ]),
      PlatformLedger.aggregate([
        { $match: { source: "ORDER_COMMISSION", createdAt: { $gte: since } } },
        { $group: { _id: "$meta.categoryId", totalCommission: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { totalCommission: -1 } },
        { $limit: 20 },
      ]),
      PlatformLedger.aggregate([
        { $match: { source: "ORDER_COMMISSION", createdAt: { $gte: since } } },
        { $group: { _id: "$meta.productId", totalCommission: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { totalCommission: -1 } },
        { $limit: 20 },
      ]),
    ]);

    return {
      totalPlatformCommission: roundMoney(summaryAgg[0]?.totalCommission || 0),
      totalCommissionOrders: Number(summaryAgg[0]?.orders || 0),
      byVendor,
      byCategory,
      topCommissionProducts: byProduct,
    };
  }
}

module.exports = new CommissionRuleService();

