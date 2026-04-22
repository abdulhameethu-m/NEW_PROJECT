import api from "./api";

const vendorModuleService = {
  // Admin: Get all vendor modules
  getAllModules: async () => {
    const response = await api.get("/modules");
    return response.data.data;
  },

  // Vendor: Get accessible modules
  getAccessibleModules: async () => {
    const response = await api.get("/modules/vendor/accessible");
    return response.data.data;
  },

  // Vendor: Batch check module access
  checkModuleAccess: async (modules) => {
    const response = await api.post("/modules/vendor/check", { modules });
    return response.data.data;
  },

  // Admin: Get specific module
  getModuleByKey: async (key) => {
    const response = await api.get(`/modules/${key}`);
    return response.data.data;
  },

  // 🔥 CRITICAL: Admin update vendor access
  updateVendorAccess: async (moduleKey, vendorEnabled) => {
    const response = await api.patch(`/modules/${moduleKey}/vendor-access`, {
      vendorEnabled,
    });
    return response.data.data;
  },

  // Admin: Update global module status
  updateModuleStatus: async (moduleKey, enabled) => {
    const response = await api.patch(`/modules/${moduleKey}/status`, {
      enabled,
    });
    return response.data.data;
  },

  // Admin: Get module statistics
  getModuleStats: async () => {
    const response = await api.get("/modules/stats/overview");
    return response.data.data;
  },

  // Admin: Initialize modules (run once)
  initializeModules: async () => {
    const response = await api.post("/modules/init");
    return response.data.data;
  },
};

export default vendorModuleService;
