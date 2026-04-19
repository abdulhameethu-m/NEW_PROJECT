const express = require("express");
const webhookController = require("../controllers/webhook.controller");

const router = express.Router();

// No auth for webhooks
router.post("/razorpay", express.raw({ type: "application/json" }), webhookController.razorpayWebhook);
router.post("/shiprocket", webhookController.shiprocketWebhook);

module.exports = router;