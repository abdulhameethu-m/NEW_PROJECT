const SettlementConfig = require("../models/SettlementConfig");
const OrderSettlement = require("../models/OrderSettlement");
const { PlatformLedger } = require("../models/PlatformLedger");
const auditService = require("./audit.service");

const DEFAULT_RULES = Object.freeze({
  shippingSettlementTarget: "PLATFORM",
  platformFeeSettlementTarget: "PLATFORM",
  vendorCommissionEnabled: true,
  version: 1,
});

const money = (value) => Math.round(Number(value || 0) * 100) / 100;

class MarketplaceSettlementService {
  async getRules() {
    const existing = await SettlementConfig.findOne({ key: "marketplace" }).lean();
    return existing || DEFAULT_RULES;
  }

  async updateRules(payload = {}, actorId = null) {
    const update = {};
    if (["PLATFORM", "VENDOR"].includes(payload.shippingSettlementTarget)) update.shippingSettlementTarget = payload.shippingSettlementTarget;
    if (["PLATFORM", "VENDOR"].includes(payload.platformFeeSettlementTarget)) update.platformFeeSettlementTarget = payload.platformFeeSettlementTarget;
    if (typeof payload.vendorCommissionEnabled === "boolean") update.vendorCommissionEnabled = payload.vendorCommissionEnabled;
    update.updatedBy = actorId || undefined;
    const current = await SettlementConfig.findOne({ key: "marketplace" }).lean();
    update.version = Number(current?.version || 0) + 1;
    const config = await SettlementConfig.findOneAndUpdate(
      { key: "marketplace" },
      { $set: update, $setOnInsert: { key: "marketplace" } },
      { new: true, upsert: true, runValidators: true }
    );
    await auditService.log({ actor: { _id: actorId, role: "admin" }, action: "settlement.rules.updated", entityType: "SettlementConfig", entityId: config._id, metadata: config.toObject() });
    return config;
  }

  calculate({ itemAmount, shippingAmount, platformFee, commissionAmount, rules = DEFAULT_RULES }) {
    const item = money(itemAmount);
    const shipping = money(shippingAmount);
    const fee = money(platformFee);
    const commission = rules.vendorCommissionEnabled ? money(commissionAmount) : 0;
    const shippingToVendor = rules.shippingSettlementTarget === "VENDOR" ? shipping : 0;
    const feeToVendor = rules.platformFeeSettlementTarget === "VENDOR" ? fee : 0;
    const vendorGross = money(item + shippingToVendor + feeToVendor);
    const vendorNet = Math.max(0, money(vendorGross - commission));
    const platformTotal = money((shipping - shippingToVendor) + (fee - feeToVendor) + commission);
    return { itemAmount: item, shippingAmount: shipping, platformFee: fee, vendorGross, commissionAmount: commission, vendorNet, platformTotal, settlementMode: "DIRECT_PLATFORM_COLLECTION", rulesSnapshot: { ...rules } };
  }

  async applyToOrderPayload(orderPayload) {
    const globalRules = await this.getRules();
    const chargeBreakdown = Array.isArray(orderPayload.settlementChargeBreakdown)
      ? orderPayload.settlementChargeBreakdown.map((charge) => ({
          key: String(charge.key || "charge"),
          displayName: String(charge.displayName || charge.key || "Charge"),
          amount: money(charge.amount),
          recipient: charge.settlementRecipient === "VENDOR" ? "VENDOR" : "ADMIN",
        }))
      : [];
    const adminChargeTotal = money(chargeBreakdown.filter((charge) => charge.recipient === "ADMIN").reduce((sum, charge) => sum + charge.amount, 0));
    const vendorChargeTotal = money(chargeBreakdown.filter((charge) => charge.recipient === "VENDOR").reduce((sum, charge) => sum + charge.amount, 0));
    const shippingAmount = money(
      chargeBreakdown
        .filter((charge) => charge.key === "shipping_cost" || charge.key.startsWith("shipping:"))
        .reduce((sum, charge) => sum + charge.amount, 0)
    );
    const platformFee = money(chargeBreakdown.filter((charge) => charge.key === "platform_fee").reduce((sum, charge) => sum + charge.amount, 0));
    const commissionAmount = globalRules.vendorCommissionEnabled ? money(orderPayload.platformCommissionAmount) : 0;
    const vendorGross = money(orderPayload.subtotal + vendorChargeTotal);
    const settlement = {
      itemAmount: money(orderPayload.subtotal),
      grossOrderAmount: money(orderPayload.subtotal + adminChargeTotal + vendorChargeTotal),
      shippingAmount,
      platformFee,
      vendorGross,
      remainingAmount: vendorGross,
      commissionAmount,
      vendorNet: Math.max(0, money(vendorGross - commissionAmount)),
      platformTotal: money(adminChargeTotal + commissionAmount),
      chargeBreakdown,
      settlementMode: "DIRECT_PLATFORM_COLLECTION",
      rulesSnapshot: { ...globalRules },
    };
    // New orders alone use the new direct-collection calculation.
    orderPayload.vendorEarning = settlement.vendorNet;
    orderPayload.settlementSnapshot = settlement;
    return settlement;
  }

  async createForOrder(order, { session = null } = {}) {
    if (!order?.settlementSnapshot || order?.settlementSnapshot?.settlementMode === "LEGACY") return null;
    const snapshot = order.settlementSnapshot;
    const settlement = await OrderSettlement.findOneAndUpdate(
      { orderId: order._id },
      { $setOnInsert: { orderId: order._id, vendorId: order.sellerId, orderNumber: order.orderNumber, ...snapshot, status: "PENDING" } },
      { new: true, upsert: true, session: session || undefined, setDefaultsOnInsert: true }
    );
    const entries = [
      ["ORDER_SHIPPING_REVENUE", snapshot.shippingAmount, "shipping"],
      ["ORDER_PLATFORM_FEE", snapshot.platformFee, "platform_fee"],
      ["ORDER_COMMISSION", snapshot.commissionAmount, "commission"],
    ];
    for (const [source, amount, component] of entries) {
      if (amount <= 0) continue;
      await PlatformLedger.findOneAndUpdate(
        { source, orderId: order._id, vendorId: order.sellerId },
        { $setOnInsert: { type: "CREDIT", source, amount, referenceId: `${order._id}:${component}`, orderId: order._id, vendorId: order.sellerId, meta: { orderNumber: order.orderNumber, settlementId: settlement._id, component } } },
        { upsert: true, new: true, session: session || undefined, setDefaultsOnInsert: true }
      );
    }
    return settlement;
  }

  async markSettledForOrder(orderId, settledAt = new Date()) {
    return OrderSettlement.findOneAndUpdate({ orderId }, { $set: { status: "SETTLED", settledAt } }, { new: true });
  }

  async vendorReport(vendorId, { page = 1, limit = 50 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * safeLimit;
    const [items, total] = await Promise.all([
      OrderSettlement.find({ vendorId }).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
      OrderSettlement.countDocuments({ vendorId }),
    ]);
    return { items, pagination: { page: Number(page) || 1, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) } };
  }

  async adminSummary() {
    const [summary] = await OrderSettlement.aggregate([{ $group: { _id: null, shippingRevenue: { $sum: "$shippingAmount" }, platformFeeRevenue: { $sum: "$platformFee" }, commissionRevenue: { $sum: "$commissionAmount" }, marketplaceRevenue: { $sum: "$platformTotal" }, vendorSettlements: { $sum: "$vendorNet" }, pendingSettlements: { $sum: { $cond: [{ $ne: ["$status", "SETTLED"] }, 1, 0] } }, completedSettlements: { $sum: { $cond: [{ $eq: ["$status", "SETTLED"] }, 1, 0] } } } }]);
    return summary || { shippingRevenue: 0, platformFeeRevenue: 0, commissionRevenue: 0, marketplaceRevenue: 0, vendorSettlements: 0, pendingSettlements: 0, completedSettlements: 0 };
  }
}

module.exports = new MarketplaceSettlementService();
