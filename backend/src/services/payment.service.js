const Razorpay = require("razorpay");
const crypto = require("crypto");
const { AppError } = require("../utils/AppError");
const orderRepo = require("../repositories/order.repository");
const paymentRepo = require("../repositories/payment.repository");
const payoutRepo = require("../repositories/payout.repository");
const refundRepo = require("../repositories/refund.repository");
const webhookEventRepo = require("../repositories/webhook-event.repository");
const checkoutService = require("./checkout.service");

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new AppError("Razorpay is not configured", 500, "RAZORPAY_NOT_CONFIGURED");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function buildReceipt(userId) {
  return `rcpt_${String(userId).slice(-6)}_${Date.now()}`;
}

function buildIdempotencyKey(userId, amount) {
  return crypto.createHash("sha256").update(`${userId}:${amount}:${new Date().toISOString().slice(0, 16)}`).digest("hex");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function normalizeRazorpayError(error, fallbackMessage) {
  if (error instanceof AppError) return error;

  const gatewayMessage =
    error?.error?.description ||
    error?.description ||
    error?.error?.message ||
    error?.message ||
    fallbackMessage;

  const gatewayCode =
    error?.error?.code ||
    error?.statusCode ||
    "RAZORPAY_REQUEST_FAILED";

  const details = {
    source: "razorpay",
    code: gatewayCode,
  };

  if (error?.error?.reason) details.reason = error.error.reason;
  if (error?.error?.field) details.field = error.error.field;
  if (error?.error?.step) details.step = error.error.step;
  if (error?.error?.metadata) details.metadata = error.error.metadata;

  const statusCode =
    error?.statusCode && Number.isInteger(error.statusCode)
      ? error.statusCode
      : 502;

  return new AppError(gatewayMessage, statusCode, "RAZORPAY_REQUEST_FAILED", details);
}

class PaymentService {
  async createRazorpayOrder({ userId, cartId, shippingAddress }) {
    const summary = await checkoutService.prepare(userId);
    if (!summary?.totalAmount) {
      throw new AppError("Cart is empty", 400, "EMPTY_CART");
    }

    const amount = Math.round(Number(summary.totalAmount || 0) * 100);
    const currency = summary.currency || "INR";
    const receipt = buildReceipt(userId);
    const razorpay = getRazorpayClient();
    let order;

    try {
      order = await razorpay.orders.create({
        amount,
        currency,
        receipt,
        payment_capture: 1,
        notes: {
          userId: String(userId),
          cartId: String(cartId || "current"),
        },
      });
    } catch (error) {
      throw normalizeRazorpayError(error, "Failed to create Razorpay order");
    }

    const paymentRecord = await paymentRepo.create({
      userId,
      amount: summary.totalAmount,
      currency,
      method: "ONLINE",
      status: "CREATED",
      receipt,
      razorpayOrderId: order.id,
      idempotencyKey: buildIdempotencyKey(userId, summary.totalAmount),
      cartSnapshot: summary.sellers.flatMap((seller) => seller.items),
      cartId: cartId && cartId !== "current" ? cartId : undefined,
      shippingAddress,
      amountBreakdown: {
        subtotal: summary.subtotal,
        shippingFee: summary.shippingFee,
        taxAmount: summary.taxAmount,
        totalAmount: summary.totalAmount,
      },
      fraudChecks: {
        priceValidated: true,
        duplicateAttemptCount: 0,
        riskScore: 5,
        flaggedReasons: [],
      },
      gatewayResponse: {
        order,
      },
    });

    return {
      paymentRecordId: paymentRecord._id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      receipt,
      summary,
    };
  }

  async verifyRazorpayPayment({
    userId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    shippingAddress,
  }) {
    const payment = await paymentRepo.findByRazorpayOrderId(razorpay_order_id);
    if (!payment) {
      throw new AppError("Payment record not found", 404, "PAYMENT_NOT_FOUND");
    }

    if (String(payment.userId?._id || payment.userId) !== String(userId)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    if (payment.status === "PAID" && Array.isArray(payment.orderIds) && payment.orderIds.length > 0) {
      const orders = await orderRepo.findByGroupId(payment.orderGroupId);
      return {
        paymentId: payment.razorpayPaymentId,
        orderId: payment.razorpayOrderId,
        status: payment.status,
        orders,
        payment,
      };
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (!safeEqual(expectedSignature, razorpay_signature)) {
      await paymentRepo.updateById(payment._id, {
        $set: {
          status: "FAILED",
          failedAt: new Date(),
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
        },
        $inc: { "fraudChecks.duplicateAttemptCount": 1 },
        $addToSet: { "fraudChecks.flaggedReasons": "INVALID_SIGNATURE" },
      });
      throw new AppError("Payment verification failed", 400, "PAYMENT_VERIFICATION_FAILED");
    }

    const orderResult = await checkoutService.createOrder(userId, {
      shippingAddress,
      paymentMethod: "ONLINE",
      paymentRecordId: payment._id,
      orderGroupId: payment.orderGroupId || `grp_${payment._id}`,
      paymentStatus: "Paid",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    const updatedPayment = await paymentRepo.updateById(payment._id, {
      $set: {
        status: "PAID",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paidAt: new Date(),
        orderIds: orderResult.orders.map((order) => order._id),
        orderGroupId: orderResult.orderGroupId,
        shippingAddress,
      },
    });

    for (const order of orderResult.orders) {
      await orderRepo.updateById(order._id, {
        paymentRecordId: updatedPayment._id,
        orderGroupId: orderResult.orderGroupId,
        paymentStatus: "Paid",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      });
    }

    return {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: "PAID",
      orders: await orderRepo.findByGroupId(orderResult.orderGroupId),
      payment: updatedPayment,
    };
  }

  async listPayments(query = {}) {
    const result = await paymentRepo.list({
      page: Number(query.page || 1),
      limit: Number(query.limit || 20),
      status: query.status,
      method: query.method,
      search: query.search,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    const overview = result.payments.reduce(
      (acc, payment) => {
        const amount = Number(payment.amount || 0);
        acc.totalAmount += amount;
        acc.totalCount += 1;
        if (payment.status === "PAID") acc.paidAmount += amount;
        if (payment.status === "FAILED") acc.failedAmount += amount;
        if (payment.status === "REFUNDED" || payment.status === "PARTIALLY_REFUNDED") {
          acc.refundedAmount += Number(payment.refundedAmount || 0);
        }
        return acc;
      },
      { totalAmount: 0, paidAmount: 0, failedAmount: 0, refundedAmount: 0, totalCount: 0 }
    );

    return { ...result, overview };
  }

  async getPaymentDetails(paymentId) {
    const payment = await paymentRepo.findById(paymentId);
    if (!payment) throw new AppError("Payment not found", 404, "NOT_FOUND");
    const refunds = await refundRepo.list({ limit: 100 });
    const webhookEvents = await webhookEventRepo.list({ provider: "RAZORPAY", limit: 100 });
    return {
      payment,
      refunds: refunds.filter((refund) => String(refund.paymentId?._id || refund.paymentId) === String(paymentId)),
      webhookEvents: webhookEvents.filter(
        (event) =>
          String(event.payload?.payload?.payment?.entity?.order_id || event.payload?.payment?.entity?.order_id || "") ===
            String(payment.razorpayOrderId || "") ||
          String(event.payload?.payload?.payment?.entity?.id || event.payload?.payment?.entity?.id || "") ===
            String(payment.razorpayPaymentId || "")
      ),
    };
  }

  async listRefunds(query = {}) {
    const refunds = await refundRepo.list({
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      limit: Number(query.limit || 100),
    });

    const overview = refunds.reduce(
      (acc, refund) => {
        const amount = Number(refund.amount || 0);
        acc.totalAmount += amount;
        if (refund.status === "PROCESSED") acc.processedAmount += amount;
        if (refund.status === "PENDING") acc.pendingAmount += amount;
        if (refund.status === "FAILED") acc.failedAmount += amount;
        return acc;
      },
      { totalAmount: 0, processedAmount: 0, pendingAmount: 0, failedAmount: 0 }
    );

    return { refunds, overview };
  }

  async processRefund({ orderId, paymentId, amount, reason, actorRole = "system", notes }) {
    const payment = paymentId ? await paymentRepo.findById(paymentId) : null;
    const order = orderId ? await orderRepo.findById(orderId) : null;

    if (!payment && !order) {
      throw new AppError("Payment or order is required", 400, "VALIDATION_ERROR");
    }

    const resolvedOrder = order || (payment?.orderIds?.length ? await orderRepo.findById(payment.orderIds[0]._id || payment.orderIds[0]) : null);
    const resolvedPayment = payment || (resolvedOrder?.paymentRecordId ? await paymentRepo.findById(resolvedOrder.paymentRecordId._id || resolvedOrder.paymentRecordId) : null);

    if (!resolvedOrder || !resolvedPayment) {
      throw new AppError("Linked order/payment not found", 404, "NOT_FOUND");
    }

    const refundAmount = Number(amount || resolvedOrder.totalAmount || 0);
    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      throw new AppError("Invalid refund amount", 400, "VALIDATION_ERROR");
    }

    const remainingRefundable = Number(resolvedPayment.amount || 0) - Number(resolvedPayment.refundedAmount || 0);
    if (refundAmount > remainingRefundable) {
      throw new AppError("Refund amount exceeds captured amount", 400, "INVALID_REFUND_AMOUNT");
    }

    let refundResponse = null;
    let gateway = "MANUAL";
    if (resolvedPayment.method === "ONLINE" && resolvedPayment.razorpayPaymentId) {
      gateway = "RAZORPAY";
      const razorpay = getRazorpayClient();
      try {
        refundResponse = await razorpay.payments.refund(resolvedPayment.razorpayPaymentId, {
          amount: Math.round(refundAmount * 100),
          notes: {
            reason: String(reason || "Refund requested"),
            orderId: String(resolvedOrder._id),
          },
        });
      } catch (error) {
        throw normalizeRazorpayError(error, "Failed to create Razorpay refund");
      }
    } else {
      refundResponse = {
        id: `manual_refund_${Date.now()}`,
        amount: Math.round(refundAmount * 100),
        status: "processed",
      };
    }

    const refund = await refundRepo.create({
      orderId: resolvedOrder._id,
      paymentId: resolvedPayment._id,
      refundId: refundResponse.id,
      amount: refundAmount,
      status: gateway === "MANUAL" ? "PROCESSED" : "PENDING",
      reason: reason || "Refund requested",
      gateway,
      requestedByRole: actorRole,
      gatewayResponse: refundResponse,
      notes,
      processedAt: gateway === "MANUAL" ? new Date() : undefined,
    });

    const nextRefundedAmount = Number(resolvedPayment.refundedAmount || 0) + refundAmount;
    const isFullRefund = nextRefundedAmount >= Number(resolvedPayment.amount || 0);
    const nextPaymentStatus = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";
    const nextOrderPaymentStatus = isFullRefund ? "Refunded" : "Partially Refunded";

    await paymentRepo.updateById(resolvedPayment._id, {
      $set: {
        refundedAmount: nextRefundedAmount,
        refundStatus: isFullRefund ? "FULL" : "PARTIAL",
        status: nextPaymentStatus,
      },
    });

    await orderRepo.updateById(resolvedOrder._id, {
      paymentStatus: nextOrderPaymentStatus,
      fraudFlags: resolvedOrder.fraudFlags,
    });

    const payouts = await payoutRepo.findByOrderId(resolvedOrder._id);
    await Promise.all(
      payouts
        .filter((payout) => ["ON_HOLD", "PENDING", "QUEUED"].includes(payout.status))
        .map((payout) =>
          payoutRepo.updateById(payout._id, {
            $set: {
              status: "CANCELLED",
              notes: "Cancelled because the order payment was refunded.",
            },
          })
        )
    );

    return {
      refund,
      payment: await paymentRepo.findById(resolvedPayment._id),
      order: await orderRepo.findById(resolvedOrder._id),
    };
  }

  async updateRefundStatus(refundId, { action, notes }) {
    const refund = await refundRepo.findById(refundId);
    if (!refund) throw new AppError("Refund not found", 404, "NOT_FOUND");

    if (action === "approve") {
      return await refundRepo.updateById(refundId, {
        $set: {
          status: "PROCESSED",
          processedAt: new Date(),
          notes: notes || refund.notes,
        },
      });
    }

    if (action === "reject") {
      return await refundRepo.updateById(refundId, {
        $set: {
          status: "REJECTED",
          notes: notes || refund.notes,
          failedAt: new Date(),
        },
      });
    }

    throw new AppError("Unsupported refund action", 400, "VALIDATION_ERROR");
  }
}

module.exports = new PaymentService();
