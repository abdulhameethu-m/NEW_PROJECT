require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const { CampaignDeliverable } = require("./src/modules/campaign/executionModel");
const CampaignEscrowWallet = require("./src/models/CampaignEscrowWallet");
const CampaignDeliverableFunding = require("./src/models/CampaignDeliverableFunding");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Find all deliverables that don't have a funding record
  const deliverables = await CampaignDeliverable.find().lean();
  let fixedCount = 0;
  
  for (const d of deliverables) {
    const fundingCount = await CampaignDeliverableFunding.countDocuments({ deliverableId: d._id });
    if (fundingCount === 0) {
      console.log(`Missing funding for deliverable ${d._id} (${d.title}) - amount: ${d.unitPrice}`);
      
      // Find the escrow wallet for this campaign
      const wallet = await CampaignEscrowWallet.findOne({ campaignId: d.campaignId });
      if (!wallet) {
        console.log(`  -> No escrow wallet found for campaign ${d.campaignId}, skipping.`);
        continue;
      }
      
      const funding = new CampaignDeliverableFunding({
        campaignId: d.campaignId,
        escrowWalletId: wallet._id,
        deliverableId: d._id,
        allocationKey: d._id.toString(), // Unique allocation key
        deliverableType: d.deliverableType || "reel",
        deliverableName: d.title,
        allocatedAmount: d.totalPrice || d.unitPrice,
        releasedAmount: 0,
        refundedAmount: 0,
        remainingAmount: d.totalPrice || d.unitPrice,
        status: "funded",
        currency: wallet.currency || "INR",
        snapshot: d.snapshot || {},
      });
      
      await funding.save();
      console.log(`  -> Created funding record ${funding._id} for amount ${funding.allocatedAmount}`);
      fixedCount++;
    }
  }
  
  console.log(`Fixed ${fixedCount} missing fundings.`);
  process.exit();
}
run();
