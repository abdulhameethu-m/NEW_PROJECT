const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const deliveryService = require("../services/delivery.service");

const createShipment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const result = await deliveryService.createShipment(orderId);
  return ok(res, result, "Shipment created");
});

module.exports = { createShipment };