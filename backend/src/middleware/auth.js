const { AppError } = require("../utils/AppError");
const { verifyAccessToken } = require("../utils/jwt");


function getTokenFromReq(req) {
  if (req.cookies && req.cookies.accessToken) return req.cookies.accessToken;
  return null;
}

function rejectLegacyBearer(req, _res, next) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    next(new AppError("Bearer token authentication has been removed", 410, "LEGACY_AUTH_REMOVED"));
    return true;
  }
  return false;
}

function authRequired(req, res, next) {
  if (rejectLegacyBearer(req, res, next)) return;
  const token = getTokenFromReq(req);
  if (!token) return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    return next(new AppError("Invalid or expired token", 401, "UNAUTHORIZED"));
  }
}
// Optional auth - doesn't throw error if token is missing
function authOptional(req, res, next) {
  if (rejectLegacyBearer(req, res, next)) return;
  const token = getTokenFromReq(req);
  if (!token) {
    // No token, but continue anyway
    req.user = null;
    return next();
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    // Invalid token, but continue anyway
    req.user = null;
    next();
  }
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    const userRoles = Array.from(new Set([req.user.role, ...(req.user.roles || [])].filter(Boolean)));
    if (!userRoles.some((role) => roles.includes(role))) {
      return next(new AppError("Forbidden", 403, "FORBIDDEN"));
    }
    next();
  };
}

module.exports = { authRequired, authOptional, requireRole,  };