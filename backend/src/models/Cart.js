const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }, // snapshot (unit price at time of add)
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    items: { type: [cartItemSchema], default: [] },
    totalAmount: { type: Number, required: true, min: 0, default: 0 },
    currency: { type: String, default: "INR", enum: ["USD", "EUR", "INR", "GBP"] },
  },
  { timestamps: true }
);

cartSchema.index({ userId: 1, updatedAt: -1 });

module.exports = {
  Cart: mongoose.model("Cart", cartSchema),
};

