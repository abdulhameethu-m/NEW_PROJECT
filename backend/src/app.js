require("./config/env");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const path = require("path");

const { requestLoggerStream, logger } = require("./utils/logger");
const { notFound } = require("./middleware/notFound");
const { errorHandler } = require("./middleware/errorHandler");
const { csrfProtection } = require("./middleware/csrf");
const { rejectMongoOperatorInjection, corsMiddleware } = require("./middleware/security");
const { 
  authLimiter, 
  loginLimiter, 
  refreshLimiter, 
  passwordResetLimiter, 
  publicApiLimiter, 
  apiLimiter, 
  isPublicBootstrapRequest, 
  apiTimingMiddleware 
} = require("./middleware/rateLimiters");

const apiRoutes = require("./routes");
const { assertNoProductionBootstrapRoutes } = require("./utils/bootstrapRouteScanner");

function createApp() {
  assertNoProductionBootstrapRoutes();
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(apiTimingMiddleware);
  
  app.use(corsMiddleware);

  app.use(
    express.json({
      limit: "25mb",
      verify: (req, res, buffer) => {
        if (req.originalUrl.startsWith("/api/webhooks/")) {
          req.rawBody = buffer.toString("utf8");
        }
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));
  app.use(rejectMongoOperatorInjection);
  app.use(cookieParser());
  app.use(csrfProtection);

  // Local upload fallback (Cloudinary preferred)
  app.use("/uploads/private", (_req, res) => res.status(404).json({ success: false, message: "Not found" }));
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads", "public"), {
    setHeaders(res) {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Accept-Ranges", "bytes");
    },
  }));
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), {
    setHeaders(res) {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Accept-Ranges", "bytes");
    },
  }));

  app.use(
    morgan("combined", {
      stream: requestLoggerStream,
      skip: (req) => req.path === "/health",
    })
  );

  app.get("/health", (req, res) => res.json({ ok: true, status: 'healthy', timestamp: new Date().toISOString() }));

  // Rate Limiting specific routes
  app.use("/api/auth/login", loginLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/influencer/register", authLimiter);
  app.use("/api/influencer/social/verify", authLimiter);
  app.use("/api/auth/refresh", refreshLimiter);
  app.use("/api/auth/password-reset/request", passwordResetLimiter);
  app.use("/api/auth/password-reset/confirm", passwordResetLimiter);
  app.use("/api/auth/password-reset-otp/request", passwordResetLimiter);
  app.use("/api/auth/password-reset-otp/verify", passwordResetLimiter);
  app.use("/api/auth/forgot-username", passwordResetLimiter);
  app.use("/api/staff/auth/login", authLimiter);
  app.use("/api/staff/auth/refresh", authLimiter);
  app.use("/api/staff/auth/password-reset/request", authLimiter);
  app.use("/api/staff/auth/password-reset/reset", authLimiter);
  
  app.use((req, res, next) => (
    isPublicBootstrapRequest(req) ? publicApiLimiter(req, res, next) : next()
  ));
  
  app.use("/api", apiLimiter);

  // Mount API Routes
  app.use("/api", apiRoutes);

  // Serve static frontend files
  app.use(express.static(path.join(process.cwd(), "public")));

  // Handle SPA routing - send all non-API and non-upload requests to index.html
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
      return next();
    }
    res.sendFile(path.join(process.cwd(), "public", "index.html"));
  });

  // Error Handling
  app.use(notFound);
  app.use(errorHandler);

  logger.info("App initialized");
  return app;
}

module.exports = { createApp };