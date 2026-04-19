const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const authService = require("../services/auth.service");

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  return ok(res, result, "Registered successfully");
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  return ok(res, result, "Logged in successfully");
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.body?.refreshToken;
  const result = await authService.refreshSession(refreshToken, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  return ok(res, result, "Session refreshed");
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.body?.refreshToken;
  // req.user might be null if authOptional didn't find a token
  // That's OK - logout service handles it gracefully
  const result = await authService.logout(refreshToken, req.user, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  return ok(res, result, "Logged out successfully");
});

const logoutAll = asyncHandler(async (req, res) => {
  const result = await authService.logoutAll(req.user.sub, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  return ok(res, result, "Logged out from all sessions");
});

const me = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const user = await authService.me(userId);
  return ok(res, user, "OK");
});

module.exports = { register, login, refresh, logout, logoutAll, me };
