const { Payment } = require("../models/Payment");

class PaymentRepository {
  async create(data) {
    const payment = new Payment(data);
    return await payment.save();
  }

  async findByRazorpayOrderId(orderId) {
    return await Payment.findOne({ razorpayOrderId: orderId });
  }

  async updateStatus(orderId, status, paymentId = null) {
    const update = { status };
    if (paymentId) update.razorpayPaymentId = paymentId;
    return await Payment.findOneAndUpdate({ razorpayOrderId: orderId }, update, { new: true });
  }
}

module.exports = new PaymentRepository();