const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const paymentService = require("../services/payment.service");

const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { cartId } = req.body;
  const result = await paymentService.createRazorpayOrder({
    userId: req.user.sub,
    cartId,
  });
  return ok(res, result, "Razorpay order created");
});

const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, shippingAddress } = req.body;
  const result = await paymentService.verifyRazorpayPayment({
    userId: req.user.sub,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    shippingAddress,
  });
  return ok(res, result, "Payment verified and orders created");
});

module.exports = { createRazorpayOrder, verifyRazorpayPayment };

