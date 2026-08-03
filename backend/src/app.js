require("./config/env");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const path = require("path");
const compression = require("compression");

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
  app.set("trust proxy", 1);

  app.disable("x-powered-by");
  app.use(helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
  app.use(compression());
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
  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads", "public"), {
    setHeaders(res) {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Accept-Ranges", "bytes");
    },
  }));
  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads"), {
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

  app.get("/api/debug-path", (req, res) => {
    const fs = require("fs");
    const targetPath = path.join(__dirname, "..", "public", "index.html");
    const exists = fs.existsSync(targetPath);
    let filesInPublic = "no public dir";
    try {
      if (fs.existsSync(path.join(__dirname, "..", "public"))) {
        filesInPublic = fs.readdirSync(path.join(__dirname, "..", "public"));
      }
    } catch (e) { filesInPublic = e.message; }
    res.json({
      dirname: __dirname,
      cwd: process.cwd(),
      targetPath,
      exists,
      filesInPublic,
      filesInParent: fs.readdirSync(path.join(__dirname, ".."))
    });
  });

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

  const { maintenanceModeMiddleware } = require("./middleware/maintenanceMode");

  // Mount API Routes
  app.use("/api", maintenanceModeMiddleware);
  app.use("/api", apiRoutes);

  // Serve static frontend files
  app.use(express.static(path.join(__dirname, "..", "public"), {
    setHeaders: (res, resourcePath) => {
      if (resourcePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else if (resourcePath.includes('/assets/') || /\.[0-9a-f]{8}\.(js|css)$/i.test(resourcePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    }
  }));

  // Handle SPA routing - send all non-API and non-upload requests to index.html
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
      return next();
    }
    const indexPath = path.join(__dirname, "..", "public", "index.html");
    res.sendFile(indexPath, (err) => {
      if (err) {
        // Fallback: manually read and send to bypass res.sendFile quirks
        try {
          const fs = require('fs');
          const content = fs.readFileSync(indexPath, 'utf-8');
          res.setHeader('Content-Type', 'text/html');
          return res.status(200).send(content);
        } catch (readErr) {
          if (!res.headersSent) {
            res.status(404).send(`Frontend not built or index.html missing.\nSendFile Error: ${err.message}\nRead Error: ${readErr.message}`);
          }
        }
      }
    });
  });

  // Error Handling
  app.use(notFound);
  app.use(errorHandler);

  logger.info("App initialized");
  return app;
}

module.exports = { createApp };