const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const payoutService = require("../services/payout.service");

const createAccount = asyncHandler(async (req, res) => {
  const { sellerId } = req.body;
  const result = await payoutService.createConnectedAccount(sellerId);
  return ok(res, { accountId: result }, "Connected account created");
});

const processPayout = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const result = await payoutService.processPayout(orderId);
  return ok(res, result, "Payout processed");
});

module.exports = { createAccount, processPayout };