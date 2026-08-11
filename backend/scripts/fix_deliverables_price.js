require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const { CampaignDeliverable } = require("../src/modules/campaign/executionModel");

async function fixDeliverables() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const campaignId = "6a797c7107f9778520fb0e7f";
  const deliverables = await CampaignDeliverable.find({ campaignId });
  console.log(`Found ${deliverables.length} deliverables for campaign ${campaignId}`);

  for (const row of deliverables) {
    row.unitPrice = 375;
    row.totalPrice = 375;
    await row.save();
    console.log(`Updated deliverable ${row._id} price to 375`);
  }
  
  console.log("Done");
  process.exit(0);
}

fixDeliverables().catch(console.error);
