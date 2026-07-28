const { getMaintenanceConfig } = require("../services/maintenance.service");
const { verifyAccessToken, verifyStaffAccessToken } = require("../utils/jwt");

// Routes that should never be blocked by maintenance mode
const EXCLUDED_ROUTES = [
  "/health",
  "/api/public/platform-status",
  "/api/auth/login",
  "/api/staff/auth/login",
  "/api/auth/refresh",
  "/api/staff/auth/refresh",
  "/api/webhooks/",
];

const maintenanceModeMiddleware = async (req, res, next) => {
  // 1. Always allow excluded routes
  if (EXCLUDED_ROUTES.some((route) => req.originalUrl.startsWith(route))) {
    return next();
  }

  // 2. Check if maintenance mode is enabled
  const config = await getMaintenanceConfig();
  if (!config?.enabled) {
    return next();
  }

  // 3. Maintenance is enabled. Determine if the current user is allowed to bypass.
  let user = null;
  const token = req.cookies?.accessToken;
  const staffToken = req.cookies?.staffAccessToken;

  if (token) {
    try {
      user = verifyAccessToken(token);
    } catch (e) {
      // Invalid or expired token — treat as unauthenticated
    }
  } else if (staffToken) {
    try {
      user = verifyStaffAccessToken(staffToken);
    } catch (e) {
      // Invalid or expired staff token
    }
  }

  // 4. Check roles against maintenance configuration
  let isAllowed = false;

  if (user) {
    const role = user.role;
    if (role === "super_admin") {
      isAllowed = true;
    } else if (
      (role === "admin" || role === "support_admin" || role === "finance_admin") &&
      config.allowAdmins
    ) {
      isAllowed = true;
    } else if (role === "staff" && config.allowStaff) {
      isAllowed = true;
    } else if (role === "vendor" && config.allowVendors) {
      isAllowed = true;
    } else if (role === "influencer" && config.allowInfluencers) {
      isAllowed = true;
    }
  }

  // 5. Check IP allowlist
  if (!isAllowed && config.allowedIPs && Array.isArray(config.allowedIPs) && config.allowedIPs.length > 0) {
    const requestIP = req.ip || req.connection.remoteAddress;
    if (config.allowedIPs.includes(requestIP)) {
      isAllowed = true;
    }
  }

  if (isAllowed) {
    return next();
  }

  // 6. Block request with 503 Service Unavailable
  res.status(503).json({
    success: false,
    message: "The platform is currently undergoing scheduled maintenance.",
    maintenance: true,
  });
};

module.exports = {
  maintenanceModeMiddleware,
};
