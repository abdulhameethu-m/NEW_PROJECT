const mongoose = require("mongoose");
const { Product } = require("./src/models/Product");
require("dotenv").config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find the apple product
    const product = await Product.findOne({ name: "apple" });
    if (product) {
      // Set top level stock
      product.stock = 7;
      
      // Target the variant if it exists
      if (product.variants && product.variants.length > 0) {
        product.variants[0].stock = 7;
        product.markModified("variants");
      }
      
      await product.save();
      console.log(`Successfully updated stock for ${product.name} to 7.`);
    } else {
      console.log("Apple product not found.");
    }

  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
