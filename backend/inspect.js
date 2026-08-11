require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const { CampaignDeliverable } = require("./src/modules/campaign/executionModel");
const CampaignDeliverableFunding = require("./src/models/CampaignDeliverableFunding");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const campaignId = new mongoose.Types.ObjectId("6a798237723995f75108f1db"); // From the screenshot
  
  const deliverables = await CampaignDeliverable.find({ campaignId }).lean();
  console.log("Deliverables:", deliverables.map(d => ({ id: d._id, title: d.title, quantity: d.quantity })));
  
  const fundings = await CampaignDeliverableFunding.find({ campaignId }).lean();
  console.log("Fundings:", fundings);
  
  process.exit();
}
run();
