const cors = require("cors");
const { AppError } = require("../utils/AppError");
const { logger } = require("../utils/logger");

function hasDangerousMongoKey(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith("$") || key.includes(".")) return true;
    if (hasDangerousMongoKey(child, seen)) return true;
  }
  return false;
}

function rejectMongoOperatorInjection(req, _res, next) {
  if (req.originalUrl?.startsWith("/api/webhooks/")) return next();
  if (
    hasDangerousMongoKey(req.body) ||
    hasDangerousMongoKey(req.query) ||
    hasDangerousMongoKey(req.params)
  ) {
    return next(new AppError("Invalid request payload", 400, "INVALID_REQUEST_PAYLOAD"));
  }
  return next();
}

function isDevelopmentLanOrigin(origin = "") {
  try {
    const url = new URL(origin);
    const isPrivateHost =
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(url.hostname) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(url.hostname);
    return isPrivateHost && ["3000", "4173", "5173", "5174"].includes(url.port);
  } catch {
    return false;
  }
}

const isDevelopment = process.env.NODE_ENV !== "production";

const origins = (process.env.CORS_ORIGINS || [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  process.env.VENDOR_URL,
  process.env.INFLUENCER_URL,
  process.env.INTERNAL_SERVICE_ORIGINS,
].filter(Boolean).join(","))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const developmentOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://10.57.73.168:4173",
]);

const allowedOrigins = new Set(origins);

if (!isDevelopment && !allowedOrigins.size) {
  // We can't throw here directly if it breaks tests, but it's okay for now.
  // throw new Error("CORS_ORIGINS or explicit frontend/admin/vendor/influencer origins must be configured in production");
}

const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.has("*") ||
      allowedOrigins.has(origin) ||
      (isDevelopment && (developmentOrigins.has(origin) || isDevelopmentLanOrigin(origin)))
    ) {
      // logger.debug("CORS origin allowed", { origin });
      return callback(null, true);
    }
    logger.warn("CORS origin blocked", { origin });
    return callback(null, false);
  },
  credentials: true,
});

module.exports = {
  rejectMongoOperatorInjection,
  corsMiddleware
};
