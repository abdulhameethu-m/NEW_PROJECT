const mongoose = require("mongoose");
const { Order } = require("./src/models/Order");
require("dotenv").config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const orderNumber = "ORD-1787299763332-VO2GMW";
    const order = await Order.findOne({ orderNumber }).lean();
    if (order) {
      console.log(`payoutEligibleAt: ${order.payoutEligibleAt}`);
      console.log(`isActive: ${order.isActive}`);
      console.log(`sellerId: ${order.sellerId}`);
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
