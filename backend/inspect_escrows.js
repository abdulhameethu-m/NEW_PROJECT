require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const { CampaignEscrowWallet } = require("./src/modules/campaign/escrowModel");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const campaignId = new mongoose.Types.ObjectId("6a798237723995f75108f1db");
  const escrows = await CampaignEscrowWallet.find({ campaignId }).lean();
  console.log("ESCROWS:", escrows);
  process.exit();
}
run();
