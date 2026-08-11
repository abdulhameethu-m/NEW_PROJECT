require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const { CampaignDeliverable } = require("../src/modules/campaign/executionModel");

async function fixDeliverables() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const badDeliverables = await CampaignDeliverable.find({ quantity: { $gt: 1 } });
  console.log(`Found ${badDeliverables.length} deliverables with quantity > 1`);

  for (const row of badDeliverables) {
    const qty = row.quantity;
    console.log(`Fixing deliverable ${row._id} (quantity: ${qty})`);
    
    const unitPrice = row.totalPrice / qty;
    
    // Create new deliverables
    for (let i = 0; i < qty; i++) {
      const newRow = new CampaignDeliverable({
        ...row.toObject(),
        _id: new mongoose.Types.ObjectId(),
        title: `${row.title.replace(/ \(Part \d+\)$/, "")} (Part ${i + 1})`,
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await newRow.save();
    }
    
    // Delete the old one
    await CampaignDeliverable.deleteOne({ _id: row._id });
    console.log(`Deleted old deliverable ${row._id}`);
  }
  
  console.log("Done");
  process.exit(0);
}

fixDeliverables().catch(console.error);
