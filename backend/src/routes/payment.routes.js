const express = require("express");
const { authRequired } = require("../middleware/auth");
const paymentController = require("../controllers/payment.controller");

const router = express.Router();

router.use(authRequired);

router.post("/create-order", paymentController.createRazorpayOrder);
router.post("/verify", paymentController.verifyRazorpayPayment);

module.exports = router;

