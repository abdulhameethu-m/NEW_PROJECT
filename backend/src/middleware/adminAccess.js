const { AppError } = require("../utils/AppError");
const { ADMIN_ROLES, hasPermission } = require("../utils/adminPermissions");
const { verifyAccessToken, verifyStaffAccessToken } = require("../utils/jwt");
const { Staff } = require("../modules/staff/models/Staff");
const { StaffSession } = require("../modules/staff/models/StaffSession");
const { hasStaffPermission } = require("../modules/staff/permissions");
const vendorModuleService = require("../services/vendorModule.service");

function getTokenFromReq(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice("Bearer ".length);
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  if (req.cookies?.staffAccessToken) return req.cookies.staffAccessToken;
  return null;
}

async function adminWorkspaceAuthRequired(req, res, next) {
  const token = getTokenFromReq(req);
  if (!token) return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));

  try {
    const payload = verifyAccessToken(token);
    if (ADMIN_ROLES.includes(payload.role)) {
      req.user = payload;
      req.authContext = { type: "legacy_admin" };
      return next();
    }
  } catch (error) {
    // Staff tokens are validated below.
  }

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

    const issuedAt = payload.iat ? new Date(payload.iat * 1000) : null;
    if (
      issuedAt &&
      ((staff.forceLogoutAt && issuedAt < staff.forceLogoutAt) ||
        (staff.passwordChangedAt && issuedAt < staff.passwordChangedAt))
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
      authType: "staff",
    };
    req.user = {
      sub: String(staff._id),
      role: "staff",
      roleId: req.staff.roleId,
      permissions: req.staff.permissions,
      authType: "staff",
    };
    req.authContext = { type: "staff" };
    return next();
  } catch (error) {
    return next(new AppError("Invalid or expired token", 401, "UNAUTHORIZED"));
  }
}

function requireWorkspacePermission(permission, options = {}) {
  const legacyPermission = options.legacyPermission || permission;

  return async (req, res, next) => {
    try {
      if (!req.user || !req.authContext) {
        return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
      }

      if (req.authContext.type === "legacy_admin") {
        if (!hasPermission(req.user.role, legacyPermission)) {
          return next(new AppError("Forbidden", 403, "FORBIDDEN"));
        }
        return next();
      }

      if (!hasStaffPermission(req.user.permissions, permission)) {
        return next(new AppError("Access denied", 403, "FORBIDDEN"));
      }

      const [moduleName] = String(permission || "").split(".");
      const isGloballyEnabled = await vendorModuleService.isModuleGloballyEnabled(moduleName);
      if (!isGloballyEnabled) {
        return next(new AppError("Module is disabled globally", 403, "MODULE_DISABLED"));
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

function requireLegacyAdminPermission(permission) {
  return (req, res, next) => {
    if (!req.user || req.authContext?.type !== "legacy_admin") {
      return next(new AppError("Forbidden", 403, "FORBIDDEN"));
    }

    if (!hasPermission(req.user.role, permission)) {
      return next(new AppError("Forbidden", 403, "FORBIDDEN"));
    }

    return next();
  };
}

module.exports = {
  adminWorkspaceAuthRequired,
  requireWorkspacePermission,
  requireLegacyAdminPermission,
};
