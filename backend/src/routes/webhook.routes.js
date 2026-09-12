const express = require("express");
const webhookController = require("../controllers/webhook.controller");
const router = express.Router();
// No auth for webhooks
router.post("/razorpay", webhookController.razorpayWebhook);
router.post("/shiprocket", webhookController.shiprocketWebhook);
router.post("/logistics", webhookController.shiprocketWebhook);
router.post("/shadowfax", webhookController.shadowfaxWebhook);
router.post("/delhivery", webhookController.delhiveryWebhook);
module.exports = router;