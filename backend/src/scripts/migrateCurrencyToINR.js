require("dotenv").config();

const mongoose = require("mongoose");
const { connectDb } = require("../config/db");
const { Product } = require("../models/Product");
const { Cart } = require("../models/Cart");
const { Order } = require("../models/Order");

async function run() {
  await connectDb();

  const updates = [];

  // Backfill currency only; do not modify numeric price fields.
  updates.push(
    Product.updateMany(
      { $or: [{ currency: { $exists: false } }, { currency: "USD" }] },
      { $set: { currency: "INR" } }
    )
  );

  updates.push(
    Cart.updateMany(
      { $or: [{ currency: { $exists: false } }, { currency: "USD" }] },
      { $set: { currency: "INR" } }
    )
  );

  updates.push(
    Order.updateMany(
      { $or: [{ currency: { $exists: false } }, { currency: "USD" }] },
      { $set: { currency: "INR" } }
    )
  );

  const [productsRes, cartsRes, ordersRes] = await Promise.all(updates);

  // eslint-disable-next-line no-console
  console.log("Currency migration complete");
  // eslint-disable-next-line no-console
  console.log("Products matched:", productsRes.matchedCount, "modified:", productsRes.modifiedCount);
  // eslint-disable-next-line no-console
  console.log("Carts matched:", cartsRes.matchedCount, "modified:", cartsRes.modifiedCount);
  // eslint-disable-next-line no-console
  console.log("Orders matched:", ordersRes.matchedCount, "modified:", ordersRes.modifiedCount);

  await mongoose.disconnect();
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Migration failed", err);
  process.exit(1);
});

