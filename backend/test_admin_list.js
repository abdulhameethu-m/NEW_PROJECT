const mongoose = require("mongoose");
require("dotenv").config();
// Import models so mongoose registers them
require("./src/models/User");
require("./src/models/Vendor");
require("./src/models/Product");
require("./src/models/Order");
require("./src/models/Refund");
const returnRequestService = require("./src/services/return-request.service");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB.");

  try {
    const result = await returnRequestService.getAdminList({});
    console.log("getAdminList result returns length:", result.returns.length);
    console.log("getAdminList result total:", result.pagination.total);
    console.log(JSON.stringify(result, null, 2));
  } catch(e) {
    console.error(e);
  }

  process.exit();
}

run();
