const mongoose = require("mongoose");
const { Ledger } = require("./src/models/Ledger");
require("dotenv").config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const vendorId = new mongoose.Types.ObjectId("6a7410177742e8ed5e3ee516");
    console.log("Searching for:", { vendorId, type: "DEBIT", source: { $in: ["REFUND", "REFUND_REVERSAL", "ORDER"] } });
    const docs = await Ledger.find({ vendorId, type: "DEBIT", source: { $in: ["REFUND", "REFUND_REVERSAL", "ORDER"] } }).lean();
    console.log("Docs found:", docs);

    const agg = await Ledger.aggregate([
      { $match: { vendorId: vendorId, type: "DEBIT", source: { $in: ["REFUND", "REFUND_REVERSAL", "ORDER"] } } },
      { $group: { _id: null, totalRefunded: { $sum: "$amount" } } }
    ]);
    console.log("Agg:", agg);
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

check();
