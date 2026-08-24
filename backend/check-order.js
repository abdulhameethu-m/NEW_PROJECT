const mongoose = require("mongoose");
const { Order } = require("./src/models/Order");
const { Ledger } = require("./src/models/Ledger");
require("dotenv").config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const order = await Order.findOne({ orderNumber: "ORD-1787297072857-12IQI9" }).lean();
    console.log("Order:", order ? {
      createdAt: order.createdAt,
      status: order.status,
      vendorWalletReleasedAt: order.vendorWalletReleasedAt,
      settlementStatus: order.settlementStatus,
      refundSummary: order.refundSummary
    } : "Not found");

    if (order) {
      const ledgers = await Ledger.find({ referenceId: order._id }).lean();
      console.log("Ledgers related to this order:", ledgers.map(l => ({
        type: l.type,
        source: l.source,
        amount: l.amount,
        createdAt: l.createdAt
      })));
    }
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

check();
