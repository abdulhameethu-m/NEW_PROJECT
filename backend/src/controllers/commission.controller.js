const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const commissionRuleService = require("../services/commission-rule.service");
const walletService = require("../services/wallet.service");
const { Order } = require("../models/Order");
const PricingRule = require("../models/PricingRule");
const ShippingWeightSlab = require("../models/ShippingWeightSlab");

const listRules = asyncHandler(async (req, res) => {
  const data = await commissionRuleService.listRules(req.query);
  return ok(res, data, "Commission rules loaded");
});

const createRule = asyncHandler(async (req, res) => {
  const rule = await commissionRuleService.createRule(req.body, req.user?.sub);
  return ok(res, rule, "Commission rule created");
});

const updateRule = asyncHandler(async (req, res) => {
  const rule = await commissionRuleService.updateRule(req.params.id, req.body, req.user?.sub);
  return ok(res, rule, "Commission rule updated");
});

const toggleRule = asyncHandler(async (req, res) => {
  const rule = await commissionRuleService.updateRule(req.params.id, { active: Boolean(req.body?.active) }, req.user?.sub);
  return ok(res, rule, "Commission rule status updated");
});

const deleteRule = asyncHandler(async (req, res) => {
  const result = await commissionRuleService.deleteRule(req.params.id);
  return ok(res, result, "Commission rule deleted");
});

const getAdminAnalytics = asyncHandler(async (req, res) => {
  const data = await commissionRuleService.getAdminAnalytics(req.query);
  return ok(res, data, "Commission analytics loaded");
});

const getVendorSummary = asyncHandler(async (req, res) => {
  const vendor = await walletService.getVendorContext(req.user.sub);
  const [orders, pricingRules, shippingRules] = await Promise.all([
    Order.find({ sellerId: vendor._id })
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(Number(req.query.limit) || 50, 1), 200))
      .select("orderNumber subtotal totalAmount vendorEarning platformCommissionAmount status paymentStatus refundSummary createdAt items settlementSnapshot vendorWalletReleasedAt settlementStatus")
      .lean(),
    PricingRule.find({ isActive: true, isArchived: { $ne: true } })
      .sort({ sortOrder: 1, displayName: 1 })
      .select("key displayName settlementRecipient")
      .lean(),
    ShippingWeightSlab.find({ status: "active" })
      .sort({ priority: 1, state: 1, district: 1, zone: 1 })
      .select("state zone settlementRecipient")
      .lean(),
  ]);

  const columnByKey = new Map();
  const addColumn = ({ key, label, recipient }) => {
    if (!key) return;
    const previous = columnByKey.get(key);
    if (previous) return;
    columnByKey.set(key, {
      key,
      label: label || key,
      recipient: recipient === "VENDOR" ? "VENDOR" : "ADMIN",
    });
  };

  // Current rules make the report layout update immediately; order snapshots
  // then provide the immutable amount per rule when a checkout is completed.
  pricingRules.forEach((rule) => addColumn({
    key: rule.key,
    label: rule.displayName,
    recipient: rule.settlementRecipient,
  }));
  shippingRules.forEach((rule) => addColumn({
    key: `shipping:${rule._id}`,
    label: `Shipping Fee - ${rule.state} ${rule.zone}`,
    recipient: rule.settlementRecipient,
  }));

  const settlementOrders = orders.map((order) => {
    const snapshot = order.settlementSnapshot || {};
    const charges = Array.isArray(snapshot.chargeBreakdown) ? snapshot.chargeBreakdown : [];
    const chargeAmounts = {};
    charges.forEach((charge) => {
      const key = String(charge?.key || "");
      if (!key) return;
      const recipient = charge.recipient === "VENDOR" ? "VENDOR" : "ADMIN";
      const amount = Number(charge.amount || 0);
      chargeAmounts[key] = Number(chargeAmounts[key] || 0) + amount;
      addColumn({ key, label: charge.displayName, recipient });
    });
    const remainingAmount = Number(snapshot.vendorGross ?? order.subtotal ?? 0);
    const commissionToAdmin = Number(snapshot.commissionAmount ?? order.platformCommissionAmount ?? 0);
    const vendorNet = Number(snapshot.vendorNet ?? order.vendorEarning ?? 0);
    return {
      ...order,
      settlement: {
        grossOrderAmount: Number(snapshot.grossOrderAmount ?? order.totalAmount ?? order.subtotal ?? 0),
        charges: chargeAmounts,
        remainingAmount,
        commissionToAdmin,
        vendorNet,
        isLegacy: !order.settlementSnapshot,
      },
    };
  });

  const totals = settlementOrders.reduce(
    (sum, order) => {
      const isRefunded = order.refundSummary?.status === "REFUNDED" || order.paymentStatus === "REFUNDED";
      const settlement = order.settlement;
      sum.totalGross += isRefunded ? 0 : settlement.grossOrderAmount;
      sum.totalRemaining += isRefunded ? 0 : settlement.remainingAmount;
      sum.totalCommission += isRefunded ? 0 : settlement.commissionToAdmin;
      sum.totalVendorNet += isRefunded ? 0 : settlement.vendorNet;
      Object.entries(settlement.charges).forEach(([key, amount]) => {
        sum.chargeTotals[key] = Number(sum.chargeTotals[key] || 0) + (isRefunded ? 0 : Number(amount || 0));
      });
      return sum;
    },
    { totalGross: 0, totalRemaining: 0, totalCommission: 0, totalVendorNet: 0, chargeTotals: {} }
  );
  const chargeColumns = Array.from(columnByKey.values());
  const dynamicCharges = chargeColumns.map((column) => ({
    ...column,
    total: Number(totals.chargeTotals[column.key] || 0),
  }));

  return ok(
    res,
    {
      overview: {
        ...totals,
        dynamicCharges,
        orders: settlementOrders.length,
      },
      chargeColumns,
      orders: settlementOrders,
    },
    "Vendor commission summary loaded"
  );
});

module.exports = {
  listRules,
  createRule,
  updateRule,
  toggleRule,
  deleteRule,
  getAdminAnalytics,
  getVendorSummary,
};

