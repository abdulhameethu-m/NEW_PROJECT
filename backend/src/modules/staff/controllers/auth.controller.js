const { ok } = require("../../../utils/apiResponse");
const { asyncHandler } = require("../../../utils/asyncHandler");
const staffAuthService = require("../services/staff-auth.service");

const login = asyncHandler(async (req, res) => {
  const result = await staffAuthService.login(req.body, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  return ok(res, result, "Staff logged in successfully");
});

const refresh = asyncHandler(async (req, res) => {
  const result = await staffAuthService.refreshSession(req.body.refreshToken, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  return ok(res, result, "Staff session refreshed");
});

const logout = asyncHandler(async (req, res) => {
  const result = await staffAuthService.logout(req.body?.refreshToken);
  return ok(res, result, "Staff logged out successfully");
});

const me = asyncHandler(async (req, res) => {
  const result = await staffAuthService.me(req.staff._id);
  return ok(res, result, "OK");
});

const requestPasswordReset = asyncHandler(async (req, res) => {
  const result = await staffAuthService.requestPasswordReset(req.body.email);
  return ok(res, result, "Password reset requested");
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await staffAuthService.resetPassword(req.body.token, req.body.password);
  return ok(res, result, "Password updated successfully");
});

module.exports = {
  login,
  refresh,
  logout,
  me,
  requestPasswordReset,
  resetPassword,
};
