const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const webhookService = require("../services/webhook.service");

const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const rawBody = JSON.stringify(req.body);
  const result = await webhookService.handleRazorpayWebhook(rawBody, signature);
  return ok(res, result);
});

const shiprocketWebhook = asyncHandler(async (req, res) => {
  const result = await webhookService.handleShiprocketWebhook(req.body);
  return ok(res, result);
});

module.exports = { razorpayWebhook, shiprocketWebhook };