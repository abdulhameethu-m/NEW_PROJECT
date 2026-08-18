const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "backend", ".env") });

const productSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.models.Product || mongoose.model("Product", productSchema, "products");

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shop");
    console.log("Connected to DB");

    const agg = await Product.aggregate([
      { $match: { category: "Dress" } },
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
