require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const CampaignEscrowWallet = require("./src/models/CampaignEscrowWallet");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const campaignId = new mongoose.Types.ObjectId("6a798237723995f75108f1db");
  const escrows = await CampaignEscrowWallet.find({ campaignId }).lean();
  console.log(JSON.stringify(escrows, null, 2));
  process.exit();
}
run();
