/**
 * Permission Logging & Debugging Utility
 * Centralizes permission-related logging for easy troubleshooting
 */

const LOG_LEVELS = {
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
};

function formatPermissions(permissions) {
  if (!permissions) return "{}";
  return Object.entries(permissions)
    .map(([module, actions]) => {
      const granted = Object.entries(actions || {})
        .filter(([, granted]) => granted)
        .map(([action]) => action)
        .join(",");
      return `${module}:[${granted}]`;
    })
    .join("|");
}

function log(level, context, message, data = {}) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [${context}]`;
  
  if (level === LOG_LEVELS.ERROR) {
    console.error(`${prefix} ${message}`, data);
  } else if (level === LOG_LEVELS.WARN) {
    console.warn(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`, data);
  }
}

// ========== AUTHENTICATION LOGS ==========

function logLogin(staffId, email, roleId, permissions) {
  log(LOG_LEVELS.INFO, "AUTH_LOGIN", `Staff logged in`, {
    staffId,
    email,
    roleId,
    permissions: formatPermissions(permissions),
  });
}

function logLogout(staffId, email) {
  log(LOG_LEVELS.INFO, "AUTH_LOGOUT", `Staff logged out`, {
    staffId,
    email,
  });
}

function logSessionRefresh(staffId, oldPermissions, newPermissions) {
  const permissionsChanged = JSON.stringify(oldPermissions) !== JSON.stringify(newPermissions);
  log(
    permissionsChanged ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG,
    "AUTH_SESSION_REFRESH",
    `Session refreshed${permissionsChanged ? " - PERMISSIONS CHANGED" : ""}`,
    {
      staffId,
      oldPermissions: formatPermissions(oldPermissions),
      newPermissions: formatPermissions(newPermissions),
    }
  );
}

// ========== PERMISSION CHECK LOGS ==========

function logPermissionCheck(staffId, email, permission, granted, availablePermissions) {
  const [module, action] = permission.split(".");
  log(
    granted ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN,
    "PERMISSION_CHECK",
    `${staffId} requested ${permission}: ${granted ? "✓ GRANTED" : "✗ DENIED"}`,
    {
      staffId,
      email,
      permission,
      granted,
      module,
      action,
      availablePermissions: formatPermissions(availablePermissions),
    }
  );
}

function logPermissionDenied(staffId, email, permission, reason) {
  log(LOG_LEVELS.WARN, "PERMISSION_DENIED", `Access denied for ${permission}`, {
    staffId,
    email,
    permission,
    reason,
  });
}

// ========== ROLE & PERMISSION MANAGEMENT LOGS ==========

function logRoleUpdate(roleId, roleName, oldPermissions, newPermissions) {
  const changed = JSON.stringify(oldPermissions) !== JSON.stringify(newPermissions);
  if (changed) {
    log(LOG_LEVELS.WARN, "ROLE_UPDATE", `Role updated - PERMISSIONS CHANGED`, {
      roleId,
      roleName,
      oldPermissions: formatPermissions(oldPermissions),
      newPermissions: formatPermissions(newPermissions),
    });
  } else {
    log(LOG_LEVELS.INFO, "ROLE_UPDATE", `Role updated`, {
      roleId,
      roleName,
    });
  }
}

function logPermissionAssignment(staffId, email, oldRoleId, newRoleId, permissions) {
  log(LOG_LEVELS.INFO, "PERMISSION_ASSIGNMENT", `Staff role changed`, {
    staffId,
    email,
    oldRoleId,
    newRoleId,
    newPermissions: formatPermissions(permissions),
  });
}

// ========== SYNC & CACHE LOGS ==========

function logPermissionSync(staffId, email, source, permissions) {
  log(LOG_LEVELS.DEBUG, "PERMISSION_SYNC", `Permissions synced from ${source}`, {
    staffId,
    email,
    source,
    permissions: formatPermissions(permissions),
  });
}

function logCacheHit(staffId, permission) {
  log(LOG_LEVELS.DEBUG, "CACHE_HIT", `Permission check from cache`, {
    staffId,
    permission,
  });
}

function logCacheMiss(staffId, permission) {
  log(LOG_LEVELS.DEBUG, "CACHE_MISS", `Permission check required server call`, {
    staffId,
    permission,
  });
}

// ========== ERROR LOGS ==========

function logAuthError(staffId, email, reason) {
  log(LOG_LEVELS.ERROR, "AUTH_ERROR", `Authentication failed`, {
    staffId,
    email,
    reason,
  });
}

function logRoleError(roleId, reason) {
  log(LOG_LEVELS.ERROR, "ROLE_ERROR", `Role operation failed`, {
    roleId,
    reason,
  });
}

function logPermissionError(staffId, permission, reason) {
  log(LOG_LEVELS.ERROR, "PERMISSION_ERROR", `Permission operation failed`, {
    staffId,
    permission,
    reason,
  });
}

// ========== VERIFICATION & AUDIT LOGS ==========

function logPermissionVerification(staffId, email, roleId, roleName, result) {
  log(
    result.valid ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN,
    "PERMISSION_VERIFICATION",
    `Permission verification - ${result.valid ? "VALID" : "INVALID"}`,
    {
      staffId,
      email,
      roleId,
      roleName,
      valid: result.valid,
      discrepancies: result.discrepancies,
      permissions: formatPermissions(result.rolePermissions),
    }
  );
}

module.exports = {
  LOG_LEVELS,
  formatPermissions,
  log,
  logLogin,
  logLogout,
  logSessionRefresh,
  logPermissionCheck,
  logPermissionDenied,
  logRoleUpdate,
  logPermissionAssignment,
  logPermissionSync,
  logCacheHit,
  logCacheMiss,
  logAuthError,
  logRoleError,
  logPermissionError,
  logPermissionVerification,
};
