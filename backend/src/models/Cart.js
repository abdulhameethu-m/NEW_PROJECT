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
    image: { type: String, default: "" },
    variantId: { type: String, trim: true, default: "" },
    variantSku: { type: String, trim: true, default: "" },
    variantTitle: { type: String, trim: true, default: "" },
    variantAttributes: {
      type: Map,
      of: String,
      default: {},
    },
    attribution: {
      campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", index: true },
      influencerId: { type: mongoose.Schema.Types.ObjectId, ref: "InfluencerProfile", index: true },
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", index: true },
      trackingSessionId: { type: mongoose.Schema.Types.ObjectId, ref: "TrackingSession", index: true },
      trackingToken: { type: String, trim: true, default: "" },
      trackingTokenId: { type: String, trim: true, default: "", index: true },
      reelId: { type: mongoose.Schema.Types.ObjectId, ref: "Reel" },
      postId: { type: mongoose.Schema.Types.ObjectId, ref: "InfluencerPost" },
      storefrontId: { type: mongoose.Schema.Types.ObjectId, ref: "InfluencerStorefront" },
      collectionId: { type: mongoose.Schema.Types.ObjectId, ref: "InfluencerCollection" },
      source: { type: String, trim: true, default: "" },
      addedAt: { type: Date },
    },
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

