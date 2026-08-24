const mongoose = require("mongoose");
const { Order } = require("./src/models/Order");
const { Ledger } = require("./src/models/Ledger");
const User = require("./src/models/User");
require("dotenv").config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find the specific order
    const orderNumber = "ORD-1787299763332-VO2GMW";
    const order = await Order.findOne({ orderNumber }).lean();
    
    if (!order) {
      console.log(`Order ${orderNumber} not found.`);
      return;
    }
    
    console.log("=== ORDER DETAILS ===");
    console.log(`Status: ${order.status}`);
    console.log(`Payment Status: ${order.paymentStatus}`);
    console.log(`Settlement Status: ${order.settlementStatus}`);
    console.log(`Vendor Wallet Released At: ${order.vendorWalletReleasedAt}`);
    console.log(`Created At: ${order.createdAt}`);
    console.log(`Delivered At: ${order.deliveredAt}`);
    
    // Vendor ID
    const vendorId = order.vendorId || (order.items && order.items[0] && order.items[0].vendorId);
    console.log(`\nVendor ID: ${vendorId}`);
    
    // Check Ledger for this order
    const ledgers = await Ledger.find({ referenceId: order._id }).lean();
    console.log(`\n=== LEDGER ENTRIES FOR ORDER ${order._id} ===`);
    console.log(ledgers.map(l => ({ type: l.type, source: l.source, amount: l.amount, status: l.status, createdAt: l.createdAt })));
    
    // Check Vendor Wallet
    if (vendorId) {
      const vendor = await User.findById(vendorId).select("wallet").lean();
      console.log(`\n=== VENDOR WALLET ===`);
      console.log(vendor?.wallet);
      
      // All ledgers for vendor
      const vendorLedgers = await Ledger.find({ vendorId }).lean();
      console.log(`\n=== ALL LEDGER ENTRIES FOR VENDOR ===`);
      console.log(vendorLedgers.map(l => ({ type: l.type, source: l.source, amount: l.amount, status: l.status, referenceId: l.referenceId })));
    }
    
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
