const rateLimit = require("express-rate-limit");
const { logger } = require("../utils/logger");

const isDevelopment = process.env.NODE_ENV !== "production";
const authRateLimit = Number(process.env.AUTH_RATE_LIMIT_MAX || (isDevelopment ? 60 : 20));
const loginRateLimit = Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX || (isDevelopment ? 60 : 5));
const refreshRateLimit = Number(process.env.AUTH_REFRESH_RATE_LIMIT_MAX || (isDevelopment ? 120 : 20));
const passwordResetRateLimit = Number(process.env.PASSWORD_RESET_RATE_LIMIT_MAX || (isDevelopment ? 20 : 5));
const apiRateLimit = Number(process.env.API_RATE_LIMIT_MAX || (isDevelopment ? 5000 : 1000));
const publicApiRateLimit = Number(process.env.PUBLIC_API_RATE_LIMIT_MAX || (isDevelopment ? 10000 : 3000));

function createLimiter({
  windowMs = 15 * 60 * 1000,
  limit,
  message,
  skip,
  skipSuccessfulRequests = false,
}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip,
    skipSuccessfulRequests,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message,
      });
    },
  });
}

const authLimiter = createLimiter({
  limit: authRateLimit,
  message: "Too many login attempts. Please wait a moment and try again.",
  skipSuccessfulRequests: true,
});

const loginLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: loginRateLimit,
  message: "Too many login attempts. Please wait a moment and try again.",
  skipSuccessfulRequests: true,
});

const refreshLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: refreshRateLimit,
  message: "Too many session refresh attempts. Please wait a moment and try again.",
});

const passwordResetLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: passwordResetRateLimit,
  message: "Too many password reset attempts. Please try again later.",
});

const getRequestPath = (req) => String(req.originalUrl || req.url || "").split("?")[0];

const isPublicBootstrapRequest = (req) => {
  const requestPath = getRequestPath(req);
  return req.method === "GET" && (
    requestPath.startsWith("/api/public/") ||
    requestPath === "/api/categories" ||
    requestPath === "/api/homepage-builder/public" ||
    requestPath.startsWith("/api/homepage-builder/public/")
  );
};

const publicApiLimiter = createLimiter({
  limit: publicApiRateLimit,
  message: "Too many public data requests. Please wait briefly and retry.",
});

const apiLimiter = createLimiter({
  limit: apiRateLimit,
  message: "Too many requests. Please slow down and try again shortly.",
  skip: (req) => {
    const requestPath = getRequestPath(req);
    return (
      requestPath === "/health" ||
      requestPath.startsWith("/uploads") ||
      requestPath.startsWith("/api/auth") ||
      requestPath.startsWith("/api/staff/auth") ||
      isPublicBootstrapRequest(req)
    );
  },
});

const apiTimingMiddleware = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const writeHead = res.writeHead;
  res.writeHead = function writeHeadWithServerTiming(...args) {
    if (!res.headersSent) {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      res.setHeader("Server-Timing", `app;dur=${durationMs.toFixed(1)}`);
    }
    return writeHead.apply(this, args);
  };
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const slowApiLogMs = Number(process.env.SLOW_API_LOG_MS || 750);
    if (req.originalUrl?.startsWith("/api/") && durationMs >= slowApiLogMs) {
      logger.warn("Slow API request", {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs),
      });
    }
  });
  next();
};

module.exports = {
  authLimiter,
  loginLimiter,
  refreshLimiter,
  passwordResetLimiter,
  publicApiLimiter,
  apiLimiter,
  isPublicBootstrapRequest,
  apiTimingMiddleware
};
