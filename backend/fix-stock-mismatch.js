const mongoose = require("mongoose");
const { Product } = require("./src/models/Product");
require("dotenv").config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const products = await Product.find({ "variants.0": { $exists: true } });
    let fixed = 0;
    
    for (const p of products) {
      if (!Array.isArray(p.variants) || !p.variants.length) continue;
      
      const aggregateStock = p.variants.reduce((acc, v) => acc + (v.isActive !== false ? Number(v.stock || 0) : 0), 0);
      
      // If product stock is LESS than the aggregate of its variants, it means orders were placed but variants didn't decrement.
      if (p.stock < aggregateStock) {
        // Adjust the default variant or first active variant by the difference
        const diff = aggregateStock - p.stock;
        
        let targetVariant = p.variants.find(v => v.isDefault && v.isActive !== false && v.stock >= diff);
        if (!targetVariant) {
          targetVariant = p.variants.find(v => v.stock >= diff);
        }
        
        if (targetVariant) {
          targetVariant.stock -= diff;
          p.markModified("variants");
          await p.save();
          fixed++;
          console.log(`Fixed product ${p.name} (SKU: ${p.SKU})`);
        }
      }
    }
    console.log(`Done. Fixed ${fixed} products.`);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
