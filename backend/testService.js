require('dotenv').config();
const mongoose = require('mongoose');
const cartService = require('./src/services/cart.service');
const { Cart } = require('./src/models/Cart');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");
  
  try {
    // Find a random user who has a cart or just any user
    const cart = await Cart.findOne({});
    if (!cart) {
      console.log("No cart found in DB");
      process.exit(1);
    }
    
    // Find a product that has variants
    const Product = require('./src/models/Product').Product;
    const product = await Product.findOne({ isActive: true, status: "APPROVED", "variants.0": { $exists: true } });
    
    console.log("Testing with User:", cart.userId, "Product:", product._id);
    
    const result = await cartService.addItem(cart.userId, {
      productId: product._id,
      quantity: 1
    });
    
    console.log("Success:", result);
    
    // Try adding again to trigger QUANTITY_UPDATED
    const result2 = await cartService.addItem(cart.userId, {
      productId: product._id,
      quantity: 1
    });
    
    console.log("Second Add Success:", result2);
    
  } catch (error) {
    console.error("ERROR CAUGHT:");
    console.error(error);
  } finally {
    mongoose.disconnect();
  }
}
run();
