const mongoose = require("mongoose");
const { Ledger } = require("./src/models/Ledger");
require("dotenv").config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    const entries = await Ledger.find({ type: "DEBIT" }).lean();
    console.log(`Found ${entries.length} DEBIT ledger entries total in DB.`);
    if (entries.length > 0) {
      console.log(entries.map(e => ({ type: e.type, source: e.source, amount: e.amount, vendorId: e.vendorId })));
    }

    const allVendorEntries = await Ledger.find({}).lean();
    console.log(`Found ${allVendorEntries.length} Total ledger entries in DB.`);
    
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

check();
