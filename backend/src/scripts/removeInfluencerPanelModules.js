const mongoose = require("mongoose");
require("../config/env");

const { connectDb } = require("../config/db");

const WITHDRAWAL_COLLECTION = "influencer_withdrawal_requests";

async function main() {
  await connectDb();

  const collections = await mongoose.connection.db.listCollections(
    { name: WITHDRAWAL_COLLECTION },
    { nameOnly: true }
  ).toArray();

  if (collections.length) {
    await mongoose.connection.db.dropCollection(WITHDRAWAL_COLLECTION);
  }

  await mongoose.connection.collection("influencer_commerce_fraud_alerts").deleteMany({
    alertType: "DUPLICATE_WITHDRAWAL",
  });
  await mongoose.connection.collection("influencer_commerce_report_schedules").deleteMany({
    reportType: "withdrawals",
  });

  console.log("Removed influencer withdrawal module persistence.");
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
