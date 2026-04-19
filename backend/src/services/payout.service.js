const Razorpay = require("razorpay");
const { AppError } = require("../utils/AppError");
const payoutRepo = require("../repositories/payout.repository");
const vendorRepo = require("../repositories/vendor.repository");

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new AppError("Razorpay is not configured", 500, "RAZORPAY_NOT_CONFIGURED");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

class PayoutService {
  async createConnectedAccount(sellerId) {
    // Assuming we store Razorpay account ID in Vendor model
    const vendor = await vendorRepo.findById(sellerId);
    if (!vendor) throw new AppError("Vendor not found", 404, "NOT_FOUND");

    if (vendor.razorpayAccountId) return vendor.razorpayAccountId;

    const razorpay = getRazorpayClient();
    // Create contact and fund account
    // This is simplified; in real, collect bank details
    const contact = await razorpay.contacts.create({
      name: vendor.name,
      email: vendor.email,
      contact: vendor.phone,
      type: "vendor",
    });

    const fundAccount = await razorpay.fundAccount.create({
      contact_id: contact.id,
      account_type: "bank_account",
      bank_account: {
        name: vendor.name,
        ifsc: "HDFC0000001", // Placeholder
        account_number: "1234567890", // Placeholder
      },
    });

    // Update vendor
    await vendorRepo.updateById(sellerId, { razorpayAccountId: fundAccount.id });

    return fundAccount.id;
  }

  async processPayout(orderId) {
    const payouts = await payoutRepo.findByOrderId(orderId);
    if (!payouts.length) throw new AppError("Payout not found", 404, "NOT_FOUND");

    const payout = payouts[0]; // Assuming one per order
    if (payout.status !== "PENDING") throw new AppError("Payout already processed", 400, "INVALID_OPERATION");

    const razorpay = getRazorpayClient();
    const transfer = await razorpay.transfers.create({
      account: payout.sellerId, // Razorpay account ID
      amount: Math.round(payout.amount * 100),
      currency: "INR",
    });

    await payoutRepo.updateStatus(orderId, "PAID", transfer.id);

    return { transferId: transfer.id, status: "PAID" };
  }
}

module.exports = new PayoutService();