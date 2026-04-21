/**
 * Staff Permission Service
 * Handles permission checks, syncing, and caching
 */

class StaffPermissionService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.listeners = new Set();
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permissions, permissionKey) {
    if (!permissions || !permissionKey) return false;
    const [module, action] = permissionKey.split(".");
    return permissions?.[module]?.[action] === true;
  }

  /**
   * Check multiple permissions (OR)
   */
  hasAnyPermission(permissions, permissionKeys) {
    return permissionKeys.some((key) => this.hasPermission(permissions, key));
  }

  /**
   * Check multiple permissions (AND)
   */
  hasAllPermissions(permissions, permissionKeys) {
    return permissionKeys.every((key) => this.hasPermission(permissions, key));
  }

  /**
   * Get all permissions for a module
   */
  getModulePermissions(permissions, moduleName) {
    if (!permissions?.[moduleName]) return {};
    return permissions[moduleName];
  }

  /**
   * Get available actions for a module
   */
  getAvailableActions(permissions, moduleName) {
    const modulePerms = this.getModulePermissions(permissions, moduleName);
    return Object.keys(modulePerms).filter((action) => modulePerms[action]);
  }

  /**
   * Cache permissions
   */
  cachePermissions(userId, permissions) {
    this.cache.set(userId, {
      permissions,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cached permissions
   */
  getCachedPermissions(userId) {
    const cached = this.cache.get(userId);
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(userId);
      return null;
    }

    return cached.permissions;
  }

  /**
   * Clear cache
   */
  clearCache(userId) {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Subscribe to permission changes
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners of permission changes
   */
  notifyChange(userId, permissions) {
    this.listeners.forEach((listener) => {
      listener({ userId, permissions });
    });
  }

  /**
   * Compare permission changes
   */
  detectChanges(oldPermissions, newPermissions) {
    const changes = {
      added: [],
      removed: [],
      modified: [],
    };

    // Find added and modified
    Object.entries(newPermissions || {}).forEach(([module, newPerms]) => {
      const oldPerms = oldPermissions?.[module] || {};
      Object.entries(newPerms).forEach(([action, hasPermission]) => {
        const oldValue = oldPerms[action];
        if (oldValue !== hasPermission) {
          if (hasPermission) {
            changes.added.push(`${module}.${action}`);
          } else {
            changes.removed.push(`${module}.${action}`);
          }
        }
      });
    });

    return changes;
  }
}

// Export singleton instance
export const staffPermissionService = new StaffPermissionService();
