require('dotenv').config();
const mongoose = require('mongoose');

async function fixLedger() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const VendorWallet = mongoose.models.VendorWallet || mongoose.model('VendorWallet', new mongoose.Schema({}, { strict: false }));
  const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
  const Ledger = mongoose.models.Ledger || mongoose.model('Ledger', new mongoose.Schema({
    vendorId: mongoose.Schema.Types.ObjectId,
    type: String,
    amount: Number,
    source: String,
    referenceId: String,
    balanceAfter: Number,
    walletSnapshot: Object,
    meta: Object,
    codFee: Number,
    gatewayFee: Number,
    refundRef: String,
    settlementRef: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }, { strict: false, timestamps: true, collection: 'ledgers' }));
  
  const order = await Order.findOne({ orderNumber: 'ORD-1787201509517-Q2TFZ1' });
  if (!order) {
    console.log("Order not found");
    return process.exit(1);
  }
  
  const wallet = await VendorWallet.findOne({ vendorId: order.sellerId });
  if (!wallet) {
    console.log("Wallet not found");
    return process.exit(1);
  }
  
  const debitAmount = 4900;
  
  const alreadyInLedger = await Ledger.findOne({ type: 'DEBIT', referenceId: String(order._id) });
  if (alreadyInLedger) {
    console.log("Already exists in Ledger collection.");
    return process.exit(0);
  }
  
  console.log("Inserting DEBIT reversal into the official Ledger collection...");
  await Ledger.create([{
    vendorId: order.sellerId,
    type: 'DEBIT', // "DEBIT" represents a reduction
    amount: debitAmount,
    source: 'ORDER', // as per other entries
    referenceId: String(order._id),
    balanceAfter: 4446, // The manual updated snapshot from the previous run
    walletSnapshot: {
      totalEarnings: wallet._doc.totalEarnings,
      availableBalance: 4446, // Correct updated balance
      pendingBalance: wallet._doc.pendingBalance,
      withdrawnBalance: wallet._doc.withdrawnBalance
    },
    meta: { notes: "Legacy fallback refund reversal" },
    codFee: 0,
    gatewayFee: 0,
    refundRef: "",
    settlementRef: "",
  }]);
  
  console.log("Ledger entry inserted successfully to render on dashboard.");
  process.exit(0);
}

fixLedger().catch((err) => {
  console.error(err);
  process.exit(1);
});
