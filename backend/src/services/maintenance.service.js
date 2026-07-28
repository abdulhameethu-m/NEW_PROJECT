const PlatformConfig = require("../models/PlatformConfig");

const CONFIG_KEY = "maintenance_mode";
let cachedConfig = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 10000; // 10 seconds

/**
 * Gets the current maintenance mode configuration.
 * Uses an in-memory cache with a TTL to avoid querying the DB on every request.
 */
async function getMaintenanceConfig() {
  const now = Date.now();
  if (cachedConfig && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const configDoc = await PlatformConfig.findOne({ key: CONFIG_KEY }).lean();
    
    if (configDoc && configDoc.value) {
      cachedConfig = configDoc.value;
    } else {
      // Default fallback
      cachedConfig = {
        enabled: false,
      };
    }
    
    lastFetchTime = Date.now();
    return cachedConfig;
  } catch (error) {
    // If DB fails, fallback to active platform to avoid accidental lockdown
    return { enabled: false };
  }
}

/**
 * Forces a cache invalidation (useful after config updates).
 */
function invalidateMaintenanceCache() {
  lastFetchTime = 0;
  cachedConfig = null;
}

module.exports = {
  getMaintenanceConfig,
  invalidateMaintenanceCache,
};
