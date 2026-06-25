require("./config/env");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const path = require("path");

const { requestLoggerStream, logger } = require("./utils/logger");
const { notFound } = require("./middleware/notFound");
const { errorHandler } = require("./middleware/errorHandler");
const { csrfProtection } = require("./middleware/csrf");

const authRoutes = require("./routes/auth.routes");
const vendorRoutes = require("./routes/vendor.routes");
const vendorStorefrontRoutes = require("./routes/vendor-storefront.routes");
const vendorPublicRoutes = require("./routes/vendor-public.routes");
const adminRoutes = require("./routes/admin.routes");
const productRoutes = require("./routes/product.routes");
const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/order.routes");
const checkoutRoutes = require("./routes/checkout.routes");
const paymentRoutes = require("./routes/payment.routes");
const payoutRoutes = require("./routes/payout.routes");
const deliveryRoutes = require("./routes/delivery.routes");
const shippingRoutes = require("./routes/shipping.routes");
const pickupRoutes = require("./routes/pickup.routes");
const webhookRoutes = require("./routes/webhook.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const compareRoutes = require("./routes/compare.routes");
const userRoutes = require("./routes/user.routes");
const categoryRoutes = require("./routes/category.routes");
const subcategoryRoutes = require("./routes/subcategory.routes");
const attributeRoutes = require("./routes/attribute.routes");
const productModuleRoutes = require("./routes/product-module.routes");
const exportRoutes = require("./routes/export.routes");
const vendorModuleRoutes = require("./routes/vendorModule.routes");
const homepageContainerRoutes = require("./routes/homepage-container.routes");
const homepageLayoutRoutes = require("./routes/homepage-layout.routes");
const pricingRoutes = require("./routes/pricing.routes");
const staffRoutes = require("./modules/staff/routes");
const settlementRoutes = require("./routes/settlement.routes");
const marketplaceSettlementRoutes = require("./routes/marketplace-settlement.routes");
const notificationRoutes = require("./routes/notification.routes");
const reviewRoutes = require("./routes/review.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const publicFeatureRoutes = require("./routes/public.routes");
const configRoutes = require("./routes/config.routes");
const systemRoutes = require("./routes/system.routes");
const privateDocumentRoutes = require("./routes/private-document.routes");
const invoiceRoutes = require("./routes/invoice.routes");
const influencerRoutes = require("./modules/influencer/routes");
const campaignRoutes = require("./modules/campaign/routes");
const escrowRoutes = require("./modules/campaign/escrow.routes");
const reelRoutes = require("./modules/reel/routes");
const trackingRoutes = require("./modules/tracking/routes");
const commissionRoutes = require("./modules/commission/routes");
const campaignFinanceRoutes = require("./modules/campaignFinance/routes");
const campaignFinanceController = require("./modules/campaignFinance/controller");
const recommendationRoutes = require("./modules/recommendation/routes");
const analyticsRoutes = require("./modules/analytics/routes");
const { authOptional, authRequired, requireRole } = require("./middleware/auth");
const { influencerCommerceGate } = require("./middleware/influencerCommerceGate");
const { assertNoProductionBootstrapRoutes } = require("./utils/bootstrapRouteScanner");

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

function createApp() {
  assertNoProductionBootstrapRoutes();

  const app = express();
  const isDevelopment = process.env.NODE_ENV !== "production";
  const authRateLimit = Number(process.env.AUTH_RATE_LIMIT_MAX || (isDevelopment ? 60 : 20));
  const loginRateLimit = Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX || (isDevelopment ? 60 : 5));
  const refreshRateLimit = Number(process.env.AUTH_REFRESH_RATE_LIMIT_MAX || (isDevelopment ? 120 : 20));
  const passwordResetRateLimit = Number(process.env.PASSWORD_RESET_RATE_LIMIT_MAX || (isDevelopment ? 20 : 5));
  const apiRateLimit = Number(process.env.API_RATE_LIMIT_MAX || (isDevelopment ? 5000 : 1000));
  const publicApiRateLimit = Number(process.env.PUBLIC_API_RATE_LIMIT_MAX || (isDevelopment ? 10000 : 3000));

  app.disable("x-powered-by");

  app.use(helmet());

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
  ]);
  const allowedOrigins = new Set(origins);

  if (!isDevelopment && !allowedOrigins.size) {
    throw new Error("CORS_ORIGINS or explicit frontend/admin/vendor/influencer origins must be configured in production");
  }

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.has(origin) ||
          (isDevelopment && (developmentOrigins.has(origin) || isDevelopmentLanOrigin(origin)))
        ) {
          logger.debug("CORS origin allowed", { origin });
          return callback(null, true);
        }
        logger.warn("CORS origin blocked", { origin });
        return callback(new Error("CORS origin is not allowed"));
      },
      credentials: true,
    })
  );

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
    )
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
  app.use(cookieParser());
  app.use(csrfProtection);

  // Local upload fallback (Cloudinary preferred). The frontend dev server runs on
  // a different origin, so uploaded media must be embeddable by video/img tags.
  app.use(
    "/uploads/private",
    (_req, res) => res.status(404).json({ success: false, message: "Not found" })
  );

  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "uploads", "public"), {
      setHeaders(res) {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Accept-Ranges", "bytes");
      },
    })
  );
  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "uploads"), {
      setHeaders(res) {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Accept-Ranges", "bytes");
      },
    })
  );

  app.use(
    morgan("combined", {
      stream: requestLoggerStream,
      skip: (req) => req.path === "/health",
    })
  );

  app.get("/health", (req, res) => res.json({ ok: true }));

  app.use("/api/auth/login", loginLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/influencer/register", authLimiter);
  app.use("/api/influencer/social/verify", authLimiter);
  app.use("/api/auth/refresh", refreshLimiter);
  app.use("/api/auth/password-reset/request", passwordResetLimiter);
  app.use("/api/staff/auth/login", authLimiter);
  app.use("/api/staff/auth/refresh", authLimiter);
  app.use("/api/staff/auth/password-reset/request", authLimiter);
  app.use("/api/staff/auth/password-reset/reset", authLimiter);
  app.use((req, res, next) => (
    isPublicBootstrapRequest(req) ? publicApiLimiter(req, res, next) : next()
  ));
  app.use("/api", apiLimiter);

  app.use("/api/auth", authRoutes);
  app.use("/api/vendor", vendorRoutes);
  app.use("/api/vendor-store", vendorStorefrontRoutes);
  app.use("/api/vendor-stores", vendorStorefrontRoutes);
  app.use("/api/vendors", vendorPublicRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/checkout", checkoutRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/payment", paymentRoutes);
  app.use("/api/payouts", payoutRoutes);
  app.use("/api/delivery", deliveryRoutes);
  app.use("/api/shipping", shippingRoutes);
  app.use("/api", pickupRoutes);
  app.use("/api/webhooks", webhookRoutes);
  app.use("/api/wishlist", wishlistRoutes);
  app.use("/api/compare", compareRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/subcategories", subcategoryRoutes);
  app.use("/api/attributes", attributeRoutes);
  app.use("/api/product-modules", productModuleRoutes);
  app.use("/api/export", exportRoutes);
  app.use("/api/modules", vendorModuleRoutes);
  app.use("/api/homepage-containers", homepageContainerRoutes);
  app.use("/api/homepage-builder", homepageLayoutRoutes);
  app.use("/api/pricing", pricingRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/staff", staffRoutes);
  app.use("/api/admin", settlementRoutes);
  app.use("/api", marketplaceSettlementRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/public", publicFeatureRoutes);
  app.use("/api/config/initialize-defaults", (req, res) => {
    logger.warn("Blocked platform bootstrap HTTP attempt", {
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      environment: process.env.NODE_ENV || "development",
    });
    return res.status(404).json({ success: false, message: "Not found" });
  });
  app.use("/api/config", configRoutes);
  app.use("/api/system", systemRoutes);
  app.use("/api/private-documents", privateDocumentRoutes);
  app.use("/api/invoices", invoiceRoutes);
  app.use("/api/influencer", authOptional, influencerCommerceGate, influencerRoutes);
  app.use("/api/campaign", authOptional, influencerCommerceGate, campaignRoutes);
  app.use("/api/campaigns/escrow", authOptional, influencerCommerceGate, escrowRoutes);
  app.use("/api/reel", authOptional, influencerCommerceGate, reelRoutes);
  app.use("/api/tracking", authOptional, influencerCommerceGate, trackingRoutes);
  app.use("/api/commission", authOptional, influencerCommerceGate, commissionRoutes);
  app.use("/api/campaign-finance", authOptional, influencerCommerceGate, campaignFinanceRoutes);
  app.get(
    "/api/campaigns/:campaignId/finance",
    authRequired,
    requireRole("vendor", "influencer", "admin", "super_admin", "support_admin", "finance_admin"),
    influencerCommerceGate,
    campaignFinanceController.campaign
  );
  app.use("/api/recommendations", recommendationRoutes);
  app.use("/api", analyticsRoutes);

  app.use(notFound);
  app.use(errorHandler);

  // Ensure logger is initialized
  logger.info("App initialized");
  return app;
}

module.exports = { createApp };

