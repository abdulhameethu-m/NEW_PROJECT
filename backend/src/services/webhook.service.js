const crypto = require("crypto");
const { AppError } = require("../utils/AppError");
const paymentRepo = require("../repositories/payment.repository");
const refundRepo = require("../repositories/refund.repository");
const webhookEventRepo = require("../repositories/webhook-event.repository");
const orderRepo = require("../repositories/order.repository");
const payoutService = require("./payout.service");

function buildEventId(provider, eventType, rawBody) {
  return `${provider}:${eventType}:${crypto.createHash("sha1").update(String(rawBody || "")).digest("hex")}`;
}

class WebhookService {
  async handleRazorpayWebhook(rawBody, signature) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const expectedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    if (expectedSignature !== signature) {
      throw new AppError("Invalid signature", 400, "INVALID_SIGNATURE");
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    const eventId = buildEventId("RAZORPAY", eventType, rawBody);
    const existing = await webhookEventRepo.findByEventId(eventId);
    if (existing) {
      return { status: "duplicate_ignored", eventId };
    }

    const webhookRecord = await webhookEventRepo.create({
      provider: "RAZORPAY",
      eventType,
      eventId,
      signatureVerified: true,
      status: "RECEIVED",
      payload: event,
    });

    try {
      if (eventType === "payment.captured") {
        const paymentEntity = event.payload?.payment?.entity;
        const payment = await paymentRepo.findByRazorpayOrderId(paymentEntity?.order_id);
        if (payment) {
          await paymentRepo.updateById(payment._id, {
            $set: {
              status: "PAID",
              razorpayPaymentId: paymentEntity.id,
              paidAt: new Date(),
              lastWebhookAt: new Date(),
            },
            $addToSet: { webhookEvents: eventId },
          });

          if (Array.isArray(payment.orderIds) && payment.orderIds.length) {
            for (const orderRef of payment.orderIds) {
              await orderRepo.updateById(orderRef._id || orderRef, {
                paymentStatus: "Paid",
                razorpayPaymentId: paymentEntity.id,
                paymentCapturedAt: new Date(),
              });
            }
          }
        }
      }

      if (eventType === "payment.failed") {
        const paymentEntity = event.payload?.payment?.entity;
        const payment = await paymentRepo.findByRazorpayOrderId(paymentEntity?.order_id);
        if (payment) {
          await paymentRepo.updateById(payment._id, {
            $set: {
              status: "FAILED",
              failedAt: new Date(),
              gatewayResponse: { ...payment.gatewayResponse, failedWebhook: paymentEntity },
              lastWebhookAt: new Date(),
            },
            $addToSet: { webhookEvents: eventId },
          });
        }
      }

      if (eventType === "refund.processed") {
        const refundEntity = event.payload?.refund?.entity;
        const refund = await refundRepo.findByRefundId(refundEntity?.id);
        if (refund) {
          await refundRepo.updateById(refund._id, {
            $set: {
              status: "PROCESSED",
              processedAt: new Date(),
              gatewayResponse: refundEntity,
            },
          });
        }
      }

      await webhookEventRepo.updateById(webhookRecord._id, {
        $set: {
          status: "PROCESSED",
          processedAt: new Date(),
        },
      });

      return { status: "ok", eventId };
    } catch (error) {
      await webhookEventRepo.updateById(webhookRecord._id, {
        $set: {
          status: "FAILED",
          errorMessage: error.message,
        },
      });
      throw error;
    }
  }

  async handleShiprocketWebhook(data) {
    const eventId = buildEventId("SHIPROCKET", String(data?.current_status || "status"), JSON.stringify(data || {}));
    const existing = await webhookEventRepo.findByEventId(eventId);
    if (existing) {
      return { status: "duplicate_ignored", eventId };
    }

    const webhookRecord = await webhookEventRepo.create({
      provider: "SHIPROCKET",
      eventType: String(data?.current_status || "unknown"),
      eventId,
      signatureVerified: true,
      status: "RECEIVED",
      payload: data,
    });

    try {
      const { awb, current_status } = data;
      const order = await orderRepo.findByTrackingId(awb);
      if (order) {
        let status = null;
        if (current_status === "Delivered") {
          status = "Delivered";
        } else if (current_status === "Out for Delivery") {
          status = "Out for Delivery";
        } else if (current_status === "Shipped") {
          status = "Shipped";
        }

        if (status) {
          const updatedOrder = await orderRepo.updateStatus(order._id, status);
          if (status === "Delivered") {
            await payoutService.markOrderDelivered(updatedOrder._id);
          }
        }
      }

      await webhookEventRepo.updateById(webhookRecord._id, {
        $set: {
          status: "PROCESSED",
          processedAt: new Date(),
        },
      });
      return { status: "ok", eventId };
    } catch (error) {
      await webhookEventRepo.updateById(webhookRecord._id, {
        $set: {
          status: "FAILED",
          errorMessage: error.message,
        },
      });
      throw error;
    }
  }
}

module.exports = new WebhookService();
