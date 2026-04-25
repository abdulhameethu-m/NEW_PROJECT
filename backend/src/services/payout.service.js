const Razorpay = require("razorpay");
const { AppError } = require("../utils/AppError");
const payoutRepo = require("../repositories/payout.repository");
const vendorRepo = require("../repositories/vendor.repository");
const orderRepo = require("../repositories/order.repository");
const paymentRepo = require("../repositories/payment.repository");

const PAYOUT_DELAY_DAYS = Number(process.env.PAYOUT_DELAY_DAYS || 7);

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new AppError("Razorpay is not configured", 500, "RAZORPAY_NOT_CONFIGURED");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeRazorpayPayoutError(error, fallbackMessage) {
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
    "RAZORPAY_PAYOUT_REQUEST_FAILED";

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

  return new AppError(gatewayMessage, statusCode, "RAZORPAY_PAYOUT_REQUEST_FAILED", details);
}

class PayoutService {
  async createConnectedAccount(sellerId) {
    const vendor = await vendorRepo.findById(sellerId);
    if (!vendor) throw new AppError("Vendor not found", 404, "NOT_FOUND");

    if (vendor.razorpayFundAccountId) return vendor.razorpayFundAccountId;

    const holderName = vendor.bankDetails?.holderName || vendor.companyName || vendor.shopName;
    const accountNumber = vendor.bankDetails?.accountNumber;
    const ifsc = vendor.bankDetails?.IFSC;
    const contactNumber = vendor.supportPhone || vendor.userId?.phone;
    const email = vendor.supportEmail || vendor.userId?.email;

    if (!holderName || !accountNumber || !ifsc || !contactNumber || !email) {
      throw new AppError("Vendor payout banking details are incomplete", 400, "INCOMPLETE_VENDOR_BANKING", {
        missing: {
          holderName: !holderName,
          accountNumber: !accountNumber,
          ifsc: !ifsc,
          contactNumber: !contactNumber,
          email: !email,
        },
      });
    }

    const razorpay = getRazorpayClient();
    let contact;
    let fundAccount;

    try {
      contact = vendor.razorpayContactId
        ? { id: vendor.razorpayContactId }
        : await razorpay.contacts.create({
            name: holderName,
            email,
            contact: contactNumber,
            type: "vendor",
            reference_id: String(vendor._id),
          });

      fundAccount = await razorpay.fundAccount.create({
        contact_id: contact.id,
        account_type: "bank_account",
        bank_account: {
          name: holderName,
          ifsc,
          account_number: accountNumber,
        },
      });
    } catch (error) {
      throw normalizeRazorpayPayoutError(error, "Failed to create Razorpay payout contact or fund account");
    }

    await vendorRepo.updateById(sellerId, {
      razorpayContactId: contact.id,
      razorpayFundAccountId: fundAccount.id,
    });

    return fundAccount.id;
  }

  async markOrderDelivered(orderId) {
    const order = await orderRepo.findById(orderId);
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");

    if (order.paymentMethod === "COD" && order.paymentStatus !== "Paid") {
      await orderRepo.updatePaymentStatus(orderId, "Paid");
      if (order.paymentRecordId) {
        await paymentRepo.updateById(order.paymentRecordId._id || order.paymentRecordId, {
          $set: {
            status: "PAID",
            paidAt: new Date(),
          },
        });
      }
    }

    const scheduledFor = addDays(order.deliveredAt || new Date(), PAYOUT_DELAY_DAYS);
    const payouts = await payoutRepo.findByOrderId(orderId);
    const updated = [];
    for (const payout of payouts) {
      updated.push(
        await payoutRepo.updateById(payout._id, {
          $set: {
            status: "PENDING",
            scheduledFor,
            notes: `Eligible for payout after ${PAYOUT_DELAY_DAYS} day settlement window.`,
          },
        })
      );
    }

    await orderRepo.updateById(orderId, { payoutEligibleAt: scheduledFor });
    return updated;
  }

  async queueEligiblePayouts() {
    const payouts = await payoutRepo.findEligibleForQueue(new Date());
    const queued = [];
    for (const payout of payouts) {
      queued.push(
        await payoutRepo.updateById(payout._id, {
          $set: {
            status: "QUEUED",
            queuedAt: new Date(),
            notes: "Queued for vendor transfer.",
          },
        })
      );
    }
    return queued;
  }

  async processPayout(orderId) {
    const payouts = await payoutRepo.findByOrderId(orderId);
    if (!payouts.length) throw new AppError("Payout not found", 404, "NOT_FOUND");

    const payout = payouts[0];
    if (!["PENDING", "QUEUED"].includes(payout.status)) {
      throw new AppError("Payout is not ready to process", 400, "INVALID_OPERATION", {
        currentStatus: payout.status,
        scheduledFor: payout.scheduledFor,
        processedAt: payout.processedAt,
      });
    }

    if (!process.env.RAZORPAY_PAYOUT_SOURCE_ACCOUNT) {
      throw new AppError("Razorpay payout source account is missing", 500, "PAYOUT_SOURCE_ACCOUNT_MISSING");
    }

    const fundAccountId = await this.createConnectedAccount(payout.sellerId._id || payout.sellerId);
    const razorpay = getRazorpayClient();

    try {
      const transfer = await razorpay.payouts.create({
        account_number: process.env.RAZORPAY_PAYOUT_SOURCE_ACCOUNT,
        fund_account_id: fundAccountId,
        amount: Math.round(Number(payout.netAmount || payout.amount || 0) * 100),
        currency: "INR",
        mode: "IMPS",
        purpose: "payout",
        queue_if_low_balance: true,
        reference_id: String(payout.orderId?._id || payout.orderId),
        narration: `Vendor payout for ${payout.orderId?.orderNumber || payout._id}`,
      });

      return await payoutRepo.updateById(payout._id, {
        $set: {
          status: "PAID",
          transferId: transfer.id,
          processedAt: new Date(),
          notes: "Payout transferred successfully.",
        },
      });
    } catch (error) {
      const normalizedError = normalizeRazorpayPayoutError(error, "Failed to process Razorpay payout");
      await payoutRepo.updateById(payout._id, {
        $set: {
          status: "FAILED",
          failureReason: normalizedError.message,
          notes: "Payout processing failed.",
        },
      });
      throw normalizedError;
    }
  }
}

module.exports = new PayoutService();
