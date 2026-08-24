const mongoose = require("mongoose");
require("dotenv").config();
const inventoryService = require("./src/services/inventory.service");
const { Product } = require("./src/models/Product");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const p = await Product.findOne({ slug: "apple" });
    const variantId = p.variants[0].variantId;
    
    console.log("Current stock:", p.stock);
    
    // Reduce stock by 1
    const res = await inventoryService.adjustStock(
      p._id, 
      variantId, 
      -1, 
      "Testing decrease", 
      "Test", 
      p.sellerId,
      { expectedSellerId: p.sellerId }
    );
    console.log("Success:", res);
    
    const p2 = await Product.findOne({ slug: "apple" });
    console.log("New stock:", p2.stock);
  } catch(e) {
    console.error("Error from adjustStock:", e);
  } finally {
    process.exit();
  }
}
run();
