const { Payout } = require("../models/Payout");

class PayoutRepository {
  async create(data) {
    const payout = new Payout(data);
    return await payout.save();
  }

  async findByOrderId(orderId) {
    return await Payout.find({ orderId });
  }

  async updateStatus(orderId, status, transferId = null) {
    const update = { status };
    if (transferId) update.transferId = transferId;
    return await Payout.findOneAndUpdate({ orderId }, update, { new: true });
  }

  async findPendingBySeller(sellerId) {
    return await Payout.find({ sellerId, status: "PENDING" });
  }
}

module.exports = new PayoutRepository();