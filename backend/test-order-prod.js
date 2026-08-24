const mongoose = require("mongoose");
const { Order } = require("./src/models/Order");
require("dotenv").config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const orders = await Order.find({ "items.productName": /apple/i }).select("orderNumber items status").lean();
    console.log(JSON.stringify(orders, null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
