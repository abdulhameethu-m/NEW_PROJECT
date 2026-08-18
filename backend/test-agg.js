const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const { Product } = require("./src/models/Product");

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shop");
    console.log("Connected to DB");

    let categoryId = "6a76fe1640346f8e6f12d17e"; // ID from URL
    categoryId = new mongoose.Types.ObjectId(categoryId);
    const query = { categoryId };

    console.log("Count with query:", await Product.countDocuments(query));

    const agg = await Product.aggregate([
      { $match: query },
      { $addFields: { _computedPrice: { $ifNull: ["$discountPrice", "$price"] } } },
      {
        $group: {
          _id: null,
          min: { $min: "$_computedPrice" },
          max: { $max: "$_computedPrice" },
        },
      }
    ]);
    console.log("Aggregation Result:", JSON.stringify(agg, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

test();
