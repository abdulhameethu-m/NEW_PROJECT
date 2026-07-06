const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const codService = require("../services/cod.service");
const checkoutService = require("../services/checkout.service");

const checkAvailability = asyncHandler(async (req, res) => {
  const shippingAddress = await codService.resolveShippingAddress(req.user.sub, req.body);
  const prepared = await checkoutService.prepare(req.user.sub, {
    shippingAddress,
    paymentMethod: "COD",
  });
  const result = prepared?.codAvailability || { codAvailable: false, reasons: ["ADDRESS_REQUIRED"] };
  return ok(res, result, "COD availability checked");
});

const collect = asyncHandler(async (req, res) => {
  const result = await codService.collectPayment({
    orderId: req.body?.orderId || null,
    orderGroupId: req.body?.orderGroupId || null,
    collectedAmount: req.body?.amount,
    reference: req.body?.reference || "",
    actor: req.user?.role || "ADMIN",
    actorId: req.user?.sub || null,
  });
  return ok(res, result, "COD payment collected");
});

const getSettings = asyncHandler(async (req, res) => {
  const config = await codService.getConfig();
  return ok(res, config, "COD settings retrieved");
});

const updateSettings = asyncHandler(async (req, res) => {
  const config = await codService.updateConfig(req.body || {}, req.user?.sub || null);
  return ok(res, config, "COD settings updated");
});

const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await codService.getAnalytics({ days: req.query?.days || 30 });
  return ok(res, analytics, "COD analytics retrieved");
});

const listAdvanceRules = asyncHandler(async (req, res) => {
  const rules = await codService.listAdvanceRules(req.query || {});
  return ok(res, rules, "COD advance rules loaded");
});

const createAdvanceRule = asyncHandler(async (req, res) => {
  const rule = await codService.createAdvanceRule(req.body || {}, req.user?.sub || null);
  return ok(res, rule, "COD advance rule created");
});

const updateAdvanceRule = asyncHandler(async (req, res) => {
  const rule = await codService.updateAdvanceRule(req.params.id, req.body || {}, req.user?.sub || null);
  return ok(res, rule, "COD advance rule updated");
});

const deleteAdvanceRule = asyncHandler(async (req, res) => {
  const rule = await codService.deleteAdvanceRule(req.params.id, req.user?.sub || null);
  return ok(res, rule, "COD advance rule disabled");
});

module.exports = {
  checkAvailability,
  collect,
  getSettings,
  updateSettings,
  getAnalytics,
  listAdvanceRules,
  createAdvanceRule,
  updateAdvanceRule,
  deleteAdvanceRule,
};
