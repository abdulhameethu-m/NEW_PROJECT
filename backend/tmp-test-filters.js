const mongoose = require("mongoose");
const productRepo = require("./src/repositories/product.repository");

require("dotenv").config({ path: "./.env" });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  // Test Admin Get Products
  const draftProducts = await productRepo.list({ status: "DRAFT" });
  console.log("DRAFT count:", draftProducts.products.length, "Total:", draftProducts.pagination.total);

  const pendingProducts = await productRepo.list({ status: "PENDING" });
  console.log("PENDING count:", pendingProducts.products.length, "Total:", pendingProducts.pagination.total);

  const approvedProducts = await productRepo.list({ status: "APPROVED" });
  console.log("APPROVED count:", approvedProducts.products.length, "Total:", approvedProducts.pagination.total);
  
  process.exit();
}

run().catch(console.error);
