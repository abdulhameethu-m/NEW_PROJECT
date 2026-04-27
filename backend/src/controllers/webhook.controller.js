const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const webhookService = require("../services/webhook.service");

const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const rawBody = req.rawBody || (Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body));
  const result = await webhookService.handleRazorpayWebhook(rawBody, signature);
  return ok(res, result);
});

const shiprocketWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-shiprocket-signature"] || req.headers["x-logistics-signature"];
  const result = await webhookService.handleShiprocketWebhook(req.body, {
    rawBody: req.rawBody || JSON.stringify(req.body || {}),
    signature,
  });
  return ok(res, result);
});

module.exports = { razorpayWebhook, shiprocketWebhook };
