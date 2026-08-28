require("dotenv").config({ path: "./.env" });
const mongoose = require("mongoose");
const codService = require("./src/services/cod.service");
const PaymentGatewayConfig = require("./src/models/PaymentGatewayConfig");

async function testSettings() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  const codConfig = await codService.getConfig();
  console.log("COD Config:");
  console.dir(codConfig, { depth: null });

  let gatewayConfig = await PaymentGatewayConfig.findOne({ provider: "RAZORPAY" });
  console.log("\nRazorpay Settings:");
  console.dir(gatewayConfig, { depth: null });

  mongoose.connection.close();
}

testSettings().catch(console.error);
