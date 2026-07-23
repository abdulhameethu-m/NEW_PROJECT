import { logger } from "../services/logger/logger.js";
/**
 * Frontend Permission Logging & Debugging Utility
 * Tracks permission-related events on the client side
 */

const LOG_LEVELS = {
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
};

const isDev = import.meta.env.DEV;

function summarizePermissions(permissions) {
  if (!permissions) return { moduleCount: 0, permissionCount: 0 };
  return Object.entries(permissions).reduce(
    (summary, [, actions]) => ({
      moduleCount: summary.moduleCount + 1,
      permissionCount:
        summary.permissionCount +
        Object.values(actions || {}).filter(Boolean).length,
    }),
    { moduleCount: 0, permissionCount: 0 }
  );
}

function log(level, context, message, data = {}) {
  if (!isDev && level === LOG_LEVELS.DEBUG) return;

  const payload = { context, ...data };

  if (level === LOG_LEVELS.ERROR) {
    logger.error(message, payload);
  } else if (level === LOG_LEVELS.WARN) {
    logger.warn(message, payload);
  } else if (level === LOG_LEVELS.INFO) {
    logger.info(message, payload);
  } else {
    logger.debug(message, payload);
  }
}

export function logPermissionSyncStart() {
  log(LOG_LEVELS.DEBUG, "PERMISSION_SYNC", "Starting permission sync...");
}

export function logPermissionSyncSuccess(email, permissions, syncedAt) {
  log(LOG_LEVELS.INFO, "PERMISSION_SYNC", "Permission sync successful", {
    email,
    permissionSummary: summarizePermissions(permissions),
    syncedAt,
  });
}

export function logPermissionSyncFailed(email, error) {
  log(LOG_LEVELS.WARN, "PERMISSION_SYNC", "Permission sync failed", {
    email,
    error: error?.message || String(error),
  });
}

export function logPeriodicSync(interval) {
  log(LOG_LEVELS.DEBUG, "PERMISSION_SYNC", `Periodic sync scheduled every ${interval}ms`);
}

export function logPermissionCheck(permission, granted, availablePermissions) {
  log(
    granted ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN,
    "PERMISSION_CHECK",
    `Permission check: ${permission} - ${granted ? "GRANTED" : "DENIED"}`,
    {
      permission,
      granted,
      permissionSummary: summarizePermissions(availablePermissions),
    }
  );
}

export function logUnauthorizedAccess(route, permission) {
  log(LOG_LEVELS.WARN, "UNAUTHORIZED_ACCESS", `Attempted access to ${route} without permission`, {
    route,
    permission,
  });
}
