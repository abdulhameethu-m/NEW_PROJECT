const crypto = require("crypto");
const { AppError } = require("../utils/AppError");
const paymentRepo = require("../repositories/payment.repository");
const orderRepo = require("../repositories/order.repository");
const payoutService = require("../services/payout.service");

class WebhookService {
  async handleRazorpayWebhook(rawBody, signature) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const expectedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    if (expectedSignature !== signature) {
      throw new AppError("Invalid signature", 400, "INVALID_SIGNATURE");
    }

    const event = JSON.parse(rawBody);
    const { event: eventType, payload } = event;

    if (eventType === "payment.captured") {
      const paymentEntity = payload.payment.entity;
      const orderId = paymentEntity.order_id;

      // Update payment
      await paymentRepo.updateStatus(orderId, "PAID", paymentEntity.id);

      // Find orders and update
      // Assuming orderId is razorpay order id, but we have multiple orders
      // Need to link properly
    }

    return { status: "ok" };
  }

  async handleShiprocketWebhook(data) {
    // Update order status based on webhook
    const { awb, current_status } = data;
    const order = await orderRepo.findByTrackingId(awb);
    if (order) {
      let status;
      if (current_status === "Delivered") {
        status = "Delivered";
        // Process payout
        await payoutService.processPayout(order._id);
      } else if (current_status === "Out for Delivery") {
        status = "Out for Delivery";
      }
      await orderRepo.updateStatus(order._id, status);
    }
    return { status: "ok" };
  }
}

module.exports = new WebhookService();