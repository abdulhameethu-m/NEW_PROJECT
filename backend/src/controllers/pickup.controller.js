const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const pickupService = require("../services/pickup.service");

const getVendorPickupQueue = asyncHandler(async (req, res) => {
  return ok(res, await pickupService.listReadyQueueForVendor(req.user.sub, req.query), "Ready pickup queue retrieved");
});

const getVendorPickupBatches = asyncHandler(async (req, res) => {
  return ok(res, await pickupService.listVendorBatches(req.user.sub, req.query), "Pickup batches retrieved");
});

const scheduleVendorPickup = asyncHandler(async (req, res) => {
  const result = await pickupService.scheduleVendorPickup(req.user.sub, req.body);
  return ok(res, result, result.idempotentReplay ? "Pickup batch already scheduled" : "Pickup scheduled successfully");
});

const getAdminPickups = asyncHandler(async (req, res) => {
  return ok(res, await pickupService.listAdminBatches(req.query), "Pickup batches retrieved");
});

const scheduleAdminPickup = asyncHandler(async (req, res) => {
  const result = await pickupService.scheduleAdminPickup(req.body, req.user);
  return ok(res, result, result.idempotentReplay ? "Pickup batch already scheduled" : "Pickup scheduled successfully");
});

module.exports = {
  getVendorPickupQueue,
  getVendorPickupBatches,
  scheduleVendorPickup,
  getAdminPickups,
  scheduleAdminPickup,
};
