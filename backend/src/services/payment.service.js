const Razorpay = require("razorpay");
const crypto = require("crypto");
const { AppError } = require("../utils/AppError");
const orderRepo = require("../repositories/order.repository");
const cartRepo = require("../repositories/cart.repository");
const paymentRepo = require("../repositories/payment.repository");
const checkoutService = require("../services/checkout.service");

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new AppError("Razorpay is not configured", 500, "RAZORPAY_NOT_CONFIGURED");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

class PaymentService {
  async createRazorpayOrder({ userId, cartId }) {
    // Fetch cart
    const cart = await cartRepo.findByUserId(userId);
    if (!cart || cart.items.length === 0) {
      throw new AppError("Cart is empty", 400, "VALIDATION_ERROR");
    }

    // Recalculate total securely
    let total = 0;
    for (const item of cart.items) {
      total += item.price * item.quantity;
    }

    const amount = Math.round(total * 100); // Paise
    const currency = "INR";
    const receipt = `receipt_${userId}_${Date.now()}`;

    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
    });

    // Save payment record
    const paymentRecord = await paymentRepo.create({
      userId,
      amount: total,
      currency,
      status: "PENDING",
      razorpayOrderId: order.id,
      cartId,
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    };
  }

  async verifyRazorpayPayment({ userId, razorpay_order_id, razorpay_payment_id, razorpay_signature, shippingAddress }) {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw new AppError("Payment verification failed", 400, "PAYMENT_VERIFICATION_FAILED");
    }

    // Update payment status
    await paymentRepo.updateStatus(razorpay_order_id, "PAID", razorpay_payment_id);

    // Create orders
    const result = await checkoutService.createOrder(userId, { shippingAddress, paymentMethod: "ONLINE" });

    // Update order payment status to Paid
    for (const order of result.orders) {
      await orderRepo.updatePaymentStatus(order._id, "Paid");
    }

    return { paymentId: razorpay_payment_id, orderId: razorpay_order_id, status: "PAID", orders: result.orders };
  }
}

module.exports = new PaymentService();

