const { AppError } = require("../../../utils/AppError");
const { verifyStaffAccessToken } = require("../../../utils/jwt");
const { Staff } = require("../models/Staff");
const { StaffSession } = require("../models/StaffSession");



function getTokenFromReq(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return { legacyBearer: true };
  if (req.cookies && req.cookies.staffAccessToken) return req.cookies.staffAccessToken;
  return null;
}

async function staffAuthRequired(req, res, next) {
  const token = getTokenFromReq(req);
  if (token?.legacyBearer) {
    return next(new AppError("Legacy bearer authentication has been removed", 410, "LEGACY_AUTH_REMOVED"));
  }
  if (!token) return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
  try {
    const payload = verifyStaffAccessToken(token);
    const session = await StaffSession.findById(payload.sid);
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return next(new AppError("Session expired", 401, "UNAUTHORIZED"));
    }
    const staff = await Staff.findById(payload.sub).populate("roleId");
    if (!staff || staff.status !== "active") {
      return next(new AppError("Staff account unavailable", 401, "UNAUTHORIZED"));
    }
    const tokenIssuedAt = payload.iat ? new Date(payload.iat * 1000) : null;
    if (
      tokenIssuedAt &&
      ((staff.forceLogoutAt && tokenIssuedAt < staff.forceLogoutAt) ||
        (staff.passwordChangedAt && tokenIssuedAt < staff.passwordChangedAt))
    ) {
      return next(new AppError("Session expired", 401, "UNAUTHORIZED"));
    }
    req.staff = {
      _id: staff._id,
      name: staff.name,
      email: staff.email,
      roleId: staff.roleId?._id,
      roleName: staff.roleId?.name,
      permissions: staff.roleId?.permissions || {},
      status: staff.status,
      sessionId: session._id,
      authType: "staff",
    };
    req.user = {
      sub: String(staff._id),
      role: "staff",
      permissions: req.staff.permissions,
      roleId: req.staff.roleId,
      authType: "staff",
    };
    return next();
  } catch {
    return next(new AppError("Invalid or expired token", 401, "UNAUTHORIZED"));
  }
}

module.exports = {
  staffAuthRequired,
};