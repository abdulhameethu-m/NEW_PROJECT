require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const { CampaignDeliverable } = require("./src/modules/campaign/executionModel");
const CampaignDeliverableFunding = require("./src/models/CampaignDeliverableFunding");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const campaignId = new mongoose.Types.ObjectId("6a798237723995f75108f1db");
  
  const deliverables = await CampaignDeliverable.find({ campaignId }).lean();
  console.log("ALL DELIVERABLES:");
  for (const d of deliverables) {
    console.log(`- ${d._id} | ${d.title} | Qty: ${d.quantity} | TotalPrice: ${d.totalPrice}`);
  }
  
  const fundings = await CampaignDeliverableFunding.find({ campaignId }).lean();
  console.log("\nALL FUNDINGS:");
  for (const f of fundings) {
    console.log(`- ${f._id} | DelivID: ${f.deliverableId} | Name: ${f.deliverableName} | Alloc: ${f.allocatedAmount} | Rem: ${f.remainingAmount}`);
  }
  
  process.exit();
}
run();
