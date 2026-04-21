const { ok } = require("../../../utils/apiResponse");
const { asyncHandler } = require("../../../utils/asyncHandler");
const staffService = require("../services/staff.service");

const listStaff = asyncHandler(async (req, res) => {
  const staff = await staffService.listStaff();
  return ok(res, staff, "Staff loaded");
});

const createStaff = asyncHandler(async (req, res) => {
  const staff = await staffService.createStaff(req.body);
  return ok(res, staff, "Staff created");
});

const updateStaff = asyncHandler(async (req, res) => {
  const staff = await staffService.updateStaff(req.params.id, req.body);
  return ok(res, staff, "Staff updated");
});

const deleteStaff = asyncHandler(async (req, res) => {
  const result = await staffService.deleteStaff(req.params.id);
  return ok(res, result, "Staff deleted");
});

const forceLogoutStaff = asyncHandler(async (req, res) => {
  const result = await staffService.forceLogoutStaff(req.params.id);
  return ok(res, result, "Staff sessions revoked");
});

module.exports = {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  forceLogoutStaff,
};
