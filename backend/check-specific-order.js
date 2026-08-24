const mongoose = require("mongoose");
require("dotenv").config();
const { Order } = require("./src/models/Order");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const order = await Order.findOne({ orderNumber: "ORD-1787548293756-GMF9M2" });
    if (!order) {
      console.log("Order not found");
      return;
    }
    console.log("Order status:", order.status);
    console.log("Delivered at:", order.deliveredAt);
    console.log("Payout eligible at:", order.payoutEligibleAt);
    console.log("Settlement Status:", order.settlementStatus);
  } finally {
    process.exit();
  }
}
run();
