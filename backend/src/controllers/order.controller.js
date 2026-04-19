const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const orderService = require("../services/order.service");

const create = asyncHandler(async (req, res) => {
  const orders = await orderService.createFromCart(req.user.sub, req.body || {});
  return ok(res, orders, "Orders created");
});

const listUser = asyncHandler(async (req, res) => {
  const result = await orderService.listForUser(req.user.sub, {
    page: req.query.page,
    limit: req.query.limit,
    status: req.query.status,
  });
  return ok(res, result, "Orders loaded");
});

const getById = asyncHandler(async (req, res) => {
  const order = await orderService.getForUser(req.user.sub, req.params.id);
  return ok(res, order, "Order loaded");
});

const track = asyncHandler(async (req, res) => {
  const order = await orderService.getForUser(req.user.sub, req.params.id);
  const tracking = {
    orderId: order._id,
    status: order.status,
    deliveryStatus: order.deliveryStatus,
    trackingId: order.trackingId,
    trackingUrl: order.trackingUrl,
    timeline: order.timeline,
  };
  return ok(res, tracking, "Tracking info loaded");
});

const cancel = asyncHandler(async (req, res) => {
  const order = await orderService.cancelForUser(req.user.sub, req.params.id);
  return ok(res, order, "Order cancelled");
});

const requestReturn = asyncHandler(async (req, res) => {
  const order = await orderService.requestReturnForUser(req.user.sub, req.params.id);
  return ok(res, order, "Return requested");
});

const listSeller = asyncHandler(async (req, res) => {
  const result = await orderService.listForSeller(req.user.sub, {
    page: req.query.page,
    limit: req.query.limit,
    status: req.query.status,
  });
  return ok(res, result, "Seller orders loaded");
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body || {};
  const order = await orderService.updateStatusAsSellerOrAdmin({
    actor: req.user,
    orderId: req.params.id,
    status,
  });
  return ok(res, order, "Order updated");
});

const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body || {};
  const order = await orderService.updatePaymentStatus({
    userId: req.user.sub,
    orderId: req.params.id,
    paymentStatus,
  });
  return ok(res, order, "Payment updated");
});

module.exports = {
  create,
  listUser,
  getById,
  track,
  cancel,
  requestReturn,
  listSeller,
  updateStatus,
  updatePaymentStatus,
};

