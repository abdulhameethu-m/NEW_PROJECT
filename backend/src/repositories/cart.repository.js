const { Cart } = require("../models/Cart");

class CartRepository {
  async findByUserId(userId) {
    return await Cart.findOne({ userId })
      .populate("items.productId", "name slug images price discountPrice stock isActive status sellerId")
      .populate("items.sellerId", "companyName")
      .exec();
  }

  async upsertEmpty(userId) {
    return await Cart.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId, items: [], totalAmount: 0 } },
      { new: true, upsert: true }
    ).exec();
  }

  async save(cart) {
    return await cart.save();
  }

  async clear(userId) {
    return await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [], totalAmount: 0 } },
      { new: true }
    ).exec();
  }
}

module.exports = new CartRepository();

