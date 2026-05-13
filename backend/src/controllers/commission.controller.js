const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const commissionRuleService = require("../services/commission-rule.service");
const walletService = require("../services/wallet.service");
const { Order } = require("../models/Order");

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
  const orders = await Order.find({ sellerId: vendor._id })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(req.query.limit) || 50, 1), 200))
    .select("orderNumber subtotal totalAmount vendorEarning platformCommissionAmount status paymentStatus createdAt items")
    .lean();

  const totalCommission = orders.reduce((sum, order) => sum + Number(order.platformCommissionAmount || 0), 0);
  const totalGross = orders.reduce((sum, order) => sum + Number(order.totalAmount || order.subtotal || 0), 0);
  const totalVendorNet = orders.reduce((sum, order) => sum + Number(order.vendorEarning || 0), 0);

  return ok(
    res,
    {
      overview: {
        totalCommission,
        totalGross,
        totalVendorNet,
        orders: orders.length,
      },
      orders,
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

