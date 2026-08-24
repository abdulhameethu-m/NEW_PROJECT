const mongoose = require("mongoose");
require("dotenv").config();
const { ReturnRequest } = require("./src/models/ReturnRequest");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB.");

  const returns = await ReturnRequest.find({}).lean();
  console.log("Total ReturnRequests:", returns.length);
  if (returns.length > 0) {
    console.log("First return:", JSON.stringify(returns[0], null, 2));
  }

  process.exit();
}

run();
