const { VendorModule, VENDOR_MODULES } = require("../models/VendorModule");
const { AppError } = require("../utils/AppError");
const { AuditLog } = require("../models/AuditLog");

class VendorModuleService {
  /**
   * Initialize vendor modules (run once during setup)
   */
  async initializeModules() {
    const defaultModules = [
      {
        key: "orders",
        name: "Orders",
        description: "View and manage vendor orders",
        icon: "ShoppingCart",
        enabled: true,
        vendorEnabled: true,
        order: 1,
        requiredPermission: "orders:read",
        metadata: { category: "operations" },
      },
      {
        key: "products",
        name: "Products",
        description: "Create and manage vendor products",
        icon: "Package",
        enabled: true,
        vendorEnabled: true,
        order: 2,
        requiredPermission: "products:read",
        metadata: { category: "operations" },
      },
      {
        key: "payments",
        name: "Payments",
        description: "View payment history and details",
        icon: "CreditCard",
        enabled: true,
        vendorEnabled: true,
        order: 3,
        requiredPermission: "payments:read",
        metadata: { category: "finance" },
      },
      {
        key: "analytics",
        name: "Analytics",
        description: "View sales analytics and reports",
        icon: "BarChart3",
        enabled: true,
        vendorEnabled: true,
        order: 4,
        requiredPermission: "analytics:read",
        metadata: { category: "analytics" },
      },
      {
        key: "inventory",
        name: "Inventory",
        description: "Manage product inventory and stock",
        icon: "Package2",
        enabled: true,
        vendorEnabled: true,
        order: 5,
        requiredPermission: "inventory:read",
        metadata: { category: "operations" },
      },
      {
        key: "returns",
        name: "Returns",
        description: "Handle return requests",
        icon: "RotateCcw",
        enabled: true,
        vendorEnabled: true,
        order: 6,
        requiredPermission: "returns:read",
        metadata: { category: "operations" },
      },
      {
        key: "reviews",
        name: "Reviews",
        description: "Manage product reviews and ratings",
        icon: "Star",
        enabled: true,
        vendorEnabled: true,
        order: 7,
        requiredPermission: "reviews:read",
        metadata: { category: "sales" },
      },
    ];

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
  async getVendorAccessibleModules() {
    return await VendorModule.find({
      enabled: true,
      vendorEnabled: true,
    }).sort({ order: 1 });
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
   */
  async updateModuleVendorAccess(moduleKey, vendorEnabled, adminUser) {
    const module = await this.getModuleByKey(moduleKey);

    const oldValue = module.vendorEnabled;
    module.vendorEnabled = vendorEnabled;
    module.updatedBy = adminUser._id;
    await module.save();

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

  /**
   * Update global feature flag
   */
  async updateModuleGlobalStatus(moduleKey, enabled, adminUser) {
    const module = await this.getModuleByKey(moduleKey);

    const oldValue = module.enabled;
    module.enabled = enabled;
    module.updatedBy = adminUser._id;
    await module.save();

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
   */
  async canVendorAccessModule(moduleKey) {
    const module = await VendorModule.findOne({ key: moduleKey });

    if (!module) return false;

    // Both conditions must be true
    return module.enabled && module.vendorEnabled;
  }

  /**
   * Batch check multiple modules
   */
  async canVendorAccessModules(moduleKeys) {
    const modules = await VendorModule.find({ key: { $in: moduleKeys } });

    const result = {};
    moduleKeys.forEach((key) => {
      const module = modules.find((m) => m.key === key);
      result[key] = module ? module.enabled && module.vendorEnabled : false;
    });

    return result;
  }

  /**
   * Get module stats for admin dashboard
   */
  async getModuleStats() {
    const totalModules = await VendorModule.countDocuments();
    const enabledGlobally = await VendorModule.countDocuments({ enabled: true });
    const enabledForVendors = await VendorModule.countDocuments({ vendorEnabled: true });
    const disabledForVendors = await VendorModule.countDocuments({ vendorEnabled: false });

    return {
      total: totalModules,
      enabledGlobally,
      enabledForVendors,
      disabledForVendors,
    };
  }
}

module.exports = new VendorModuleService();
