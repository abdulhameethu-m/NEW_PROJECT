const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const vendorService = require("../services/vendor.service");

const step1 = asyncHandler(async (req, res) => {
  const vendor = await vendorService.saveStep1(req.user.sub, req.body);
  return ok(res, vendor, "Saved step 1");
});

const step2 = asyncHandler(async (req, res) => {
  const files = (req.files || []).map((f) => ({
    buffer: f.buffer,
    originalname: f.originalname,
    mimetype: f.mimetype,
    size: f.size,
  }));
  const vendor = await vendorService.saveStep2(req.user.sub, req.body, files);
  return ok(res, vendor, "Saved step 2");
});

const step3 = asyncHandler(async (req, res) => {
  const vendor = await vendorService.saveStep3(req.user.sub, req.body);
  return ok(res, vendor, "Saved step 3");
});

const step4 = asyncHandler(async (req, res) => {
  const files = (req.files || []).map((f) => ({
    buffer: f.buffer,
    originalname: f.originalname,
    mimetype: f.mimetype,
    size: f.size,
  }));
  const vendor = await vendorService.saveStep4AndSubmit(req.user.sub, req.body, files);
  return ok(res, vendor, "Submitted for approval");
});

const me = asyncHandler(async (req, res) => {
  const vendor = await vendorService.getMe(req.user.sub);
  return ok(res, vendor, "OK");
});

module.exports = { step1, step2, step3, step4, me };

