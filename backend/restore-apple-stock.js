const mongoose = require("mongoose");
require("dotenv").config();
const { Product } = require("./src/models/Product");
const { Order } = require("./src/models/Order");

async function fixAppleStock() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const product = await Product.findOne({ slug: "apple" });
    if (!product) {
      console.log("Product not found");
      return;
    }
    
    // We expect reservedStock to be 1 since 1 order is active
    let modified = false;
    for (const variant of product.variants) {
      if (variant.reservedStock < 1) {
        variant.reservedStock = 1;
        modified = true;
      }
    }
    
    if (modified) {
      product.markModified("variants");
      await product.save();
      console.log("Successfully restored reservedStock to 1 for apple variant.");
    } else {
      console.log("No modifications needed, reservedStock is already 1.");
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

fixAppleStock();
