const { AppError } = require("../utils/AppError");
const { Wishlist } = require("../models/Wishlist");
const { Product } = require("../models/Product");

async function ensureProductExists(productId) {
  const product = await Product.findById(productId).select("_id name status isActive stock");
  if (!product) {
    throw new AppError("Product not found", 404, "NOT_FOUND");
  }
  return product;
}

async function listWishlist(userId) {
  const items = await Wishlist.find({ userId })
    .sort({ createdAt: -1 })
    .populate({
      path: "productId",
      select: "name category price discountPrice images stock status isActive slug",
    });

  return items
    .filter((item) => item.productId)
    .map((item) => ({
      _id: item._id,
      product: item.productId,
      addedAt: item.createdAt,
    }));
}

async function addToWishlist(userId, productId) {
  const product = await ensureProductExists(productId);

  const existing = await Wishlist.findOne({ userId, productId });
  if (existing) {
    return {
      saved: true,
      productId: product._id,
    };
  }

  await Wishlist.create({ userId, productId });
  return {
    saved: true,
    productId: product._id,
  };
}

async function removeFromWishlist(userId, productId) {
  await Wishlist.findOneAndDelete({ userId, productId });
  return {
    saved: false,
    productId,
  };
}

async function getWishlistStatus(userId, productId) {
  const item = await Wishlist.findOne({ userId, productId }).select("_id");
  return {
    saved: Boolean(item),
    productId,
  };
}

module.exports = {
  listWishlist,
  addToWishlist,
  removeFromWishlist,
  getWishlistStatus,
};
