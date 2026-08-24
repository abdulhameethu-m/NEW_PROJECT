const mongoose = require("mongoose");
const { Product } = require("./src/models/Product");
require("dotenv").config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const p = await Product.findOne({ name: /apple/i }).lean();
    console.log(JSON.stringify(p, null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
