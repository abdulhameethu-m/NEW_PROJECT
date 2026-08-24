require('dotenv').config();
const mongoose = require('mongoose');

async function debugAggregate() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Ledger = mongoose.models.Ledger || mongoose.model('Ledger', new mongoose.Schema({}, { strict: false }));
  
  const vendorIdStr = '6a7410177742e8ed5e3ee516';
  
  console.log("Testing with Object ID casting");
  const refundAgg = await Ledger.aggregate([
    { $match: { vendorId: new mongoose.Types.ObjectId(vendorIdStr), type: "DEBIT", source: "ORDER" } },
    { $group: { _id: null, totalRefunded: { $sum: "$amount" } } }
  ]);
  console.log("ObjectId result:", refundAgg);

  console.log("Testing with string");
  const refundAggStr = await Ledger.aggregate([
    { $match: { vendorId: vendorIdStr, type: "DEBIT", source: "ORDER" } },
    { $group: { _id: null, totalRefunded: { $sum: "$amount" } } }
  ]);
  console.log("String result:", refundAggStr);

  process.exit(0);
}
debugAggregate().catch(console.error);
