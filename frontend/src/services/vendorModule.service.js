import { api } from "./api";

const vendorModuleService = {
  // Admin: Get all vendor modules
  getAllModules: async () => {
    const response = await api.get("/api/modules");
    return response.data.data;
  },

  // Vendor: Get accessible modules
  getAccessibleModules: async () => {
    const response = await api.get("/api/modules/vendor/accessible");
    return response.data.data;
  },

  // Vendor: Batch check module access
  checkModuleAccess: async (modules) => {
    const response = await api.post("/api/modules/vendor/check", { modules });
    return response.data.data;
  },

  checkModulePermissions: async (permissions) => {
    const response = await api.post("/api/modules/vendor/check", { permissions });
    return response.data.data;
  },

  // Admin: Get specific module
  getModuleByKey: async (key) => {
    const response = await api.get(`/api/modules/${key}`);
    return response.data.data;
  },

  // 🔥 CRITICAL: Admin update vendor access
  updateVendorAccess: async (moduleKey, vendorEnabled) => {
    const response = await api.patch(`/api/modules/${moduleKey}/vendor-access`, {
      vendorEnabled,
    });
    return response.data.data;
  },

  // Admin: Update global module status
  updateModuleStatus: async (moduleKey, enabled) => {
    const response = await api.patch(`/api/modules/${moduleKey}/status`, {
      enabled,
    });
    return response.data.data;
  },

  updateModuleSettings: async (moduleKey, payload) => {
    const response = await api.patch(`/api/modules/${moduleKey}`, payload);
    return response.data.data;
  },

  // Admin: Get module statistics
  getModuleStats: async () => {
    const response = await api.get("/api/modules/stats/overview");
    return response.data.data;
  },

  // Admin: Initialize modules (run once)
  initializeModules: async () => {
    const response = await api.post("/api/modules/init");
    return response.data.data;
  },
};

export default vendorModuleService;
