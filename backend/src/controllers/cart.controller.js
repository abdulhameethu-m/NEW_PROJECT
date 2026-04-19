const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const cartService = require("../services/cart.service");

const getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getCart(req.user.sub);
  return ok(res, cart, "Cart loaded");
});

const add = asyncHandler(async (req, res) => {
  const cart = await cartService.addItem(req.user.sub, req.body || {});
  return ok(res, cart, "Added to cart");
});

const update = asyncHandler(async (req, res) => {
  const cart = await cartService.updateItem(req.user.sub, req.body || {});
  return ok(res, cart, "Cart updated");
});

const remove = asyncHandler(async (req, res) => {
  const productId = req.body?.productId || req.query?.productId;
  const cart = await cartService.removeItem(req.user.sub, { productId });
  return ok(res, cart, "Removed from cart");
});

const clear = asyncHandler(async (req, res) => {
  const cart = await cartService.clearCart(req.user.sub);
  return ok(res, cart, "Cart cleared");
});

module.exports = { getCart, add, update, remove, clear };

