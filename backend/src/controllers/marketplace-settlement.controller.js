const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const settlementService = require("../services/marketplace-settlement.service");
const vendorRepo = require("../repositories/vendor.repository");
const { AppError } = require("../utils/AppError");

exports.getRules = asyncHandler(async (_req, res) => ok(res, await settlementService.getRules(), "Settlement rules loaded"));
exports.updateRules = asyncHandler(async (req, res) => ok(res, await settlementService.updateRules(req.body || {}, req.user?.sub), "Settlement rules updated"));
exports.adminSummary = asyncHandler(async (_req, res) => ok(res, await settlementService.adminSummary(), "Settlement revenue loaded"));
exports.vendorReport = asyncHandler(async (req, res) => {
  const vendor = await vendorRepo.findByUserId(req.user?.sub);
  if (!vendor) throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
  return ok(res, await settlementService.vendorReport(vendor._id, req.query), "Vendor settlements loaded");
});
