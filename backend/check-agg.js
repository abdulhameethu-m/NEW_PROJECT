const mongoose = require("mongoose");
const { Ledger } = require("./src/models/Ledger");
const User = require("./src/models/User");
require("dotenv").config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    const vendorId = "6a7410177742e8ed5e3ee516";

    const refundAgg = await Ledger.aggregate([
      { $match: { vendorId: new mongoose.Types.ObjectId(String(vendorId)), type: "DEBIT", source: { $in: ["REFUND", "REFUND_REVERSAL", "ORDER"] } } },
      { $group: { _id: null, totalRefunded: { $sum: "$amount" } } }
    ]);
    console.log("refundAgg =", JSON.stringify(refundAgg));

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

check();
