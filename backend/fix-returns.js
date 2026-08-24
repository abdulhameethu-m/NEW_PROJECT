const mongoose = require("mongoose");
const Order = require("./src/models/Order");
require("dotenv").config();

async function fix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    const result = await Order.updateMany(
      { returnId: { $ne: null }, status: "Delivered" },
      { $set: { status: "Return Requested" } }
    );
    
    console.log(`Updated ${result.modifiedCount} orders!`);
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

fix();
