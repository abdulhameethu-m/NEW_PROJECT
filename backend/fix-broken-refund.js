// fix-broken-refund.js
require('dotenv').config();
const mongoose = require('mongoose');

async function fix() {
  console.log("Connecting to", process.env.MONGODB_URI);
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shop');
  
  const ReturnRequest = mongoose.model('ReturnRequest', new mongoose.Schema({
    status: String,
    refundId: mongoose.Schema.Types.ObjectId,
    refundAmount: Number
  }, { strict: false }));
  
  const Refund = mongoose.model('Refund', new mongoose.Schema({
    status: String,
    returnId: mongoose.Schema.Types.ObjectId
  }, { strict: false }));

  // Find all returns that have a refundId
  const returns = await ReturnRequest.find({ refundId: { $exists: true } });
  console.log(`Found ${returns.length} return requests with a refundId attached.`);
  
  let fixedCount = 0;
  for (const ret of returns) {
    const refund = await Refund.findById(ret.refundId);
    if (!refund) {
       console.log(`Warning: ReturnRequest ${ret._id} points to missing Refund ${ret.refundId}`);
       continue;
    }
    
    if (!refund.returnId || String(refund.returnId) !== String(ret._id)) {
      console.log(`Fixing Refund ${refund._id}, linking ReturnRequest ${ret._id}`);
      await Refund.updateOne({ _id: refund._id }, { $set: { returnId: ret._id } });
    }
    
    // If the refund was already processed, update the return request too
    if (refund.status === 'PROCESSED' && ret.status !== 'REFUNDED') {
      await ReturnRequest.updateOne(
        { _id: ret._id }, 
        { $set: { status: 'REFUNDED' } }
      );
      console.log(`Synced ReturnRequest ${ret._id} to REFUNDED`);
      fixedCount++;
    }
  }
  
  console.log(`Done. Synced ${fixedCount} returns to REFUNDED.`);
  process.exit(0);
}

fix();
