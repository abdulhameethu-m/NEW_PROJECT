const { VendorModule, VENDOR_PERMISSION_ACTIONS } = require("../models/VendorModule");
const { getDefaultVendorModules } = require("../config/vendorModules.config");
const { AppError } = require("../utils/AppError");
const { AuditLog } = require("../models/AuditLog");

class VendorModuleService {
  constructor() {
    // In-memory cache for frequently accessed data
    this.accessCache = new Map(); // moduleKey -> { accessible, timestamp }
    this.cacheTTL = 30000; // 30 seconds cache TTL
  }

  /**
   * Get cached accessible modules
   * Returns from cache if available and not expired
   */
  _getFromCache(cacheKey) {
    const cached = this.accessCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    this.accessCache.delete(cacheKey);
    return null;
  }

  /**
   * Set cache entry
   */
  _setCache(cacheKey, data) {
    this.accessCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all caches (called on module update)
   */
  _clearCache() {
    this.accessCache.clear();
  }

  _normalizePermissionKey(permission) {
    return String(permission || "").trim().replace(/:/g, ".");
  }

  _normalizeVendorPermissions(vendorPermissions = {}) {
    return {
      create: Boolean(vendorPermissions.create),
      read: vendorPermissions.read !== false,
      update: Boolean(vendorPermissions.update),
      delete: Boolean(vendorPermissions.delete),
    };
  }

  _hasRequiredPermission(user, requiredPermission) {
    if (!requiredPermission) {
      return true;
    }

    const normalizedPermission = this._normalizePermissionKey(requiredPermission);
    const rawPermissions = user?.permissions;

    // Backward-compatible path for legacy vendors without explicit permission payloads.
    if (!rawPermissions) {
      return true;
    }

    if (Array.isArray(rawPermissions)) {
      return rawPermissions.some((permission) => this._normalizePermissionKey(permission) === normalizedPermission);
    }

    if (typeof rawPermissions === "object") {
      const [moduleName, action] = normalizedPermission.split(".");
      if (moduleName && action && rawPermissions[moduleName]?.[action] === true) {
        return true;
      }

      return Object.entries(rawPermissions).some(([permission, value]) => {
        if (value !== true) {
          return false;
        }
        return this._normalizePermissionKey(permission) === normalizedPermission;
      });
    }

    return false;
  }

  _canUserAccessModule(module, user) {
    if (!module) {
      return false;
    }

    const featureEnabled = module.enabled === true;
    const vendorModuleEnabled = module.vendorEnabled === true;
    const permissionAllowed = this._hasRequiredPermission(user, module.requiredPermission);

    return featureEnabled && vendorModuleEnabled && permissionAllowed && module.vendorPermissions?.read === true;
  }

  _canUserPerformAction(module, action, user) {
    if (!module || !VENDOR_PERMISSION_ACTIONS.includes(action)) {
      return false;
    }

    const featureEnabled = module.enabled === true;
    const vendorModuleEnabled = module.vendorEnabled === true;
    const permissionAllowed = this._hasRequiredPermission(user, module.requiredPermission);
    const actionAllowed = module.vendorPermissions?.[action] === true;

    return featureEnabled && vendorModuleEnabled && permissionAllowed && actionAllowed;
  }

  /**
   * Initialize vendor modules (run once during setup)
   */
  async initializeModules() {
    const defaultModules = getDefaultVendorModules();

    for (const module of defaultModules) {
      await VendorModule.updateOne({ key: module.key }, { $set: module }, { upsert: true });
    }
  }

  /**
   * Get all vendor modules
   */
  async getAllModules() {
    return await VendorModule.find().sort({ order: 1 });
  }

  /**
   * Get modules accessible to vendors (enabled both globally and for vendors)
   */
  async getVendorAccessibleModules(user) {
    const modules = await VendorModule.find({
      enabled: true,
      vendorEnabled: true,
    }).sort({ order: 1 });

    return modules.filter((module) => this._canUserPerformAction(module, "read", user));
  }

  /**
   * Get a specific module by key
   */
  async getModuleByKey(key) {
    const module = await VendorModule.findOne({ key });
    if (!module) {
      throw new AppError(`Module '${key}' not found`, 404, "MODULE_NOT_FOUND");
    }
    return module;
  }

  /**
   * Update module's vendor access (admin only)
   * 🔥 CRITICAL: This controls vendor access globally
   * ✅ Clears cache to ensure immediate effect
   */
  async updateModuleVendorAccess(moduleKey, vendorEnabled, adminUser) {
    const module = await this.getModuleByKey(moduleKey);

    const oldValue = module.vendorEnabled;
    module.vendorEnabled = vendorEnabled;
    module.updatedBy = adminUser._id;
    await module.save();

    // Clear cache to ensure immediate effect
    this._clearCache();

    // Audit log
    if (typeof AuditLog !== "undefined") {
      try {
        await AuditLog.create({
          action: "UPDATE_VENDOR_MODULE_ACCESS",
          entity: "VendorModule",
          entityId: module._id,
          changedFields: {
            vendorEnabled: { oldValue, newValue: vendorEnabled },
          },
          userId: adminUser._id,
          ipAddress: adminUser.ipAddress,
          userAgent: adminUser.userAgent,
        });
      } catch (err) {
        console.error("Failed to create audit log:", err);
      }
    }

    return module;
  }

  async updateVendorModuleSettings(moduleKey, updates, adminUser) {
    const module = await this.getModuleByKey(moduleKey);
    const changedFields = {};

    if (typeof updates.enabled === "boolean" && updates.enabled !== module.enabled) {
      changedFields.enabled = {
        oldValue: module.enabled,
        newValue: updates.enabled,
      };
      module.enabled = updates.enabled;
    }

    if (typeof updates.vendorEnabled === "boolean" && updates.vendorEnabled !== module.vendorEnabled) {
      changedFields.vendorEnabled = {
        oldValue: module.vendorEnabled,
        newValue: updates.vendorEnabled,
      };
      module.vendorEnabled = updates.vendorEnabled;
    }

    if (updates.vendorPermissions && typeof updates.vendorPermissions === "object") {
      const nextPermissions = this._normalizeVendorPermissions({
        ...module.vendorPermissions?.toObject?.(),
        ...updates.vendorPermissions,
      });

      changedFields.vendorPermissions = {
        oldValue: this._normalizeVendorPermissions(module.vendorPermissions?.toObject?.()),
        newValue: nextPermissions,
      };
      module.vendorPermissions = nextPermissions;
    }

    module.updatedBy = adminUser._id;
    await module.save();
    this._clearCache();

    if (typeof AuditLog !== "undefined") {
      try {
        await AuditLog.create({
          action: "UPDATE_VENDOR_MODULE_SETTINGS",
          entity: "VendorModule",
          entityId: module._id,
          changedFields,
          userId: adminUser._id,
          ipAddress: adminUser.ipAddress,
          userAgent: adminUser.userAgent,
        });
      } catch (err) {
        console.error("Failed to create audit log:", err);
      }
    }

    return module;
  }

  /**
   * Update global feature flag
   * ✅ Clears cache to ensure immediate effect
   */
  async updateModuleGlobalStatus(moduleKey, enabled, adminUser) {
    const module = await this.getModuleByKey(moduleKey);

    const oldValue = module.enabled;
    module.enabled = enabled;
    module.updatedBy = adminUser._id;
    await module.save();

    // Clear cache to ensure immediate effect
    this._clearCache();

    // Audit log
    if (typeof AuditLog !== "undefined") {
      try {
        await AuditLog.create({
          action: "UPDATE_VENDOR_MODULE_STATUS",
          entity: "VendorModule",
          entityId: module._id,
          changedFields: {
            enabled: { oldValue, newValue: enabled },
          },
          userId: adminUser._id,
          ipAddress: adminUser.ipAddress,
          userAgent: adminUser.userAgent,
        });
      } catch (err) {
        console.error("Failed to create audit log:", err);
      }
    }

    return module;
  }

  /**
   * 🔥 CRITICAL ACCESS LOGIC
   * Check if vendor can access a module
   * ✅ Uses cache for performance (30s TTL)
   */
  async canVendorAccessModule(moduleKey, user) {
    const normalizedPermissionFingerprint = JSON.stringify(user?.permissions || null);
    const cacheKey = `module:${moduleKey}:${normalizedPermissionFingerprint}`;

    // Try cache first
    const cached = this._getFromCache(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const module = await VendorModule.findOne({ key: moduleKey });

    if (!module) {
      this._setCache(cacheKey, false);
      return false;
    }

    const accessible = this._canUserAccessModule(module, user);
    this._setCache(cacheKey, accessible);
    return accessible;
  }

  async canVendorPerformAction(moduleKey, action, user) {
    const normalizedPermissionFingerprint = JSON.stringify(user?.permissions || null);
    const cacheKey = `module-action:${moduleKey}:${action}:${normalizedPermissionFingerprint}`;
    const cached = this._getFromCache(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const module = await VendorModule.findOne({ key: moduleKey });
    const accessible = this._canUserPerformAction(module, action, user);
    this._setCache(cacheKey, accessible);
    return accessible;
  }

  /**
   * Batch check multiple modules
   */
  async canVendorAccessModules(moduleKeys, user) {
    const modules = await VendorModule.find({ key: { $in: moduleKeys } });

    const result = {};
    moduleKeys.forEach((key) => {
      const module = modules.find((m) => m.key === key);
      result[key] = this._canUserAccessModule(module, user);
    });

    return result;
  }

  async canVendorPerformActions(requestedPermissions, user) {
    const results = {};
    const moduleKeys = [...new Set(requestedPermissions.map((permission) => permission.split(".")[0]))];
    const modules = await VendorModule.find({ key: { $in: moduleKeys } });

    requestedPermissions.forEach((permission) => {
      const [moduleKey, action] = String(permission || "").split(".");
      const module = modules.find((entry) => entry.key === moduleKey);
      results[permission] = this._canUserPerformAction(module, action, user);
    });

    return results;
  }

  /**
   * Get module stats for admin dashboard
   */
  async getModuleStats() {
    const totalModules = await VendorModule.countDocuments();
    const enabledGlobally = await VendorModule.countDocuments({ enabled: true });
    const enabledForVendors = await VendorModule.countDocuments({ enabled: true, vendorEnabled: true });
    const disabledForVendors = totalModules - enabledForVendors;
    const readableForVendors = await VendorModule.countDocuments({
      enabled: true,
      vendorEnabled: true,
      "vendorPermissions.read": true,
    });

    return {
      total: totalModules,
      enabledGlobally,
      enabledForVendors,
      disabledForVendors,
      readableForVendors,
    };
  }
}

module.exports = new VendorModuleService();
