const crypto = require("crypto");
const { AppError } = require("../utils/AppError");
const SecurityAuditLog = require("../models/SecurityAuditLog");

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function getSecret() {
  const secret = process.env.CSRF_SECRET || process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("Missing CSRF secret");
  }
  return secret || "development-csrf-secret";
}

function signToken(rawToken) {
  return crypto.createHmac("sha256", getSecret()).update(rawToken).digest("hex");
}

function createCsrfToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  return `${raw}.${signToken(raw)}`;
}

function isValidCsrfToken(token) {
  const [raw, signature] = String(token || "").split(".");
  if (!raw || !signature) return false;
  const expected = signToken(raw);
  if (Buffer.byteLength(expected) !== Buffer.byteLength(signature)) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function cookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: false,
    secure,
    sameSite: process.env.AUTH_COOKIE_SAMESITE || (secure ? "none" : "lax"),
    path: "/",
    maxAge: Number(process.env.CSRF_COOKIE_MAX_AGE_MS || 2 * 60 * 60 * 1000),
  };
}

function issueCsrfToken(req, res) {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  const token = isValidCsrfToken(existing) ? existing : createCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, cookieOptions());
  return token;
}

async function logCsrfFailure(req, reason) {
  await SecurityAuditLog.create({
    actorId: req.user?.sub || req.staff?._id || "",
    actorRole: req.user?.role || req.staff?.authType || "",
    action: "CSRF_FAILURE",
    module: "auth",
    route: req.originalUrl,
    status: "BLOCKED",
    reason,
    environment: process.env.NODE_ENV || "development",
    ipAddress: req.ip,
    userAgent: req.get("user-agent") || "",
    metadata: { method: req.method },
  }).catch(() => {});
}

function csrfProtection(req, res, next) {
  const currentPath = (req.originalUrl ? req.originalUrl.split("?")[0] : req.path) || "";

  if (currentPath.startsWith("/api/webhooks/") || currentPath === "/api/shipping/webhooks/shiprocket") {
    return next();
  }

  if (currentPath === "/api/config/initialize-defaults") {
    return next();
  }

  if (SAFE_METHODS.has(req.method)) {
    issueCsrfToken(req, res);
    return next();
  }

  if (currentPath === "/api/auth/csrf" || currentPath === "/api/staff/auth/csrf") {
    issueCsrfToken(req, res);
    return next();
  }

  // Stateless guest validation endpoints (do not mutate user state or databases)
  const isGuestValidation =
    currentPath === "/api/cart/validate-item" ||
    currentPath === "/api/cart/validate" ||
    currentPath === "/api/cart/summary" ||
    currentPath === "/api/wishlist/validate-items" ||
    (currentPath.startsWith("/api/wishlist/") && currentPath.endsWith("/validate")) ||
    (currentPath.startsWith("/api/wishlist/") && currentPath.endsWith("/check"));

  if (isGuestValidation) {
    issueCsrfToken(req, res);
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME);

  // If header token is provided and cryptographically valid, accept it (resilient for mobile apps)
  if (headerToken && isValidCsrfToken(headerToken)) {
    if (!cookieToken || cookieToken !== headerToken) {
      res.cookie(CSRF_COOKIE_NAME, headerToken, cookieOptions());
    }
    issueCsrfToken(req, res);
    return next();
  }

  if (!cookieToken || !headerToken) {
    logCsrfFailure(req, "Missing CSRF token");
    return next(new AppError("CSRF token is required", 403, "CSRF_REQUIRED"));
  }

  if (cookieToken !== headerToken || !isValidCsrfToken(cookieToken)) {
    logCsrfFailure(req, "Invalid CSRF token");
    return next(new AppError("Invalid CSRF token", 403, "CSRF_INVALID"));
  }

  issueCsrfToken(req, res);
  return next();
}

module.exports = {

  issueCsrfToken,
  csrfProtection,
};
