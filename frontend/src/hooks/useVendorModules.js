import { useState, useEffect, useCallback } from "react";
import vendorModuleService from "../services/vendorModule.service";

/**
 * Hook to manage vendor modules in admin panel
 */
export const useVendorModules = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Fetch all modules
  const fetchModules = useCallback(async () => {
    try {
      setLoading(true);
      const data = await vendorModuleService.getAllModules();
      setModules(data);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to fetch modules");
      console.error("Error fetching modules:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch module statistics
  const fetchStats = useCallback(async () => {
    try {
      const data = await vendorModuleService.getModuleStats();
      setStats(data);
    } catch (err) {
      console.error("Error fetching module stats:", err);
    }
  }, []);

  // Update vendor access for a module
  const updateVendorAccess = useCallback(async (moduleKey, vendorEnabled) => {
    try {
      const updatedModule = await vendorModuleService.updateVendorAccess(
        moduleKey,
        vendorEnabled
      );

      // Update local state
      setModules((prevModules) =>
        prevModules.map((m) =>
          m.key === moduleKey ? { ...m, vendorEnabled } : m
        )
      );

      return updatedModule;
    } catch (err) {
      setError(err.message || "Failed to update module access");
      throw err;
    }
  }, []);

  // Update global module status
  const updateModuleStatus = useCallback(async (moduleKey, enabled) => {
    try {
      const updatedModule = await vendorModuleService.updateModuleStatus(
        moduleKey,
        enabled
      );

      // Update local state
      setModules((prevModules) =>
        prevModules.map((m) =>
          m.key === moduleKey ? { ...m, enabled } : m
        )
      );

      return updatedModule;
    } catch (err) {
      setError(err.message || "Failed to update module status");
      throw err;
    }
  }, []);

  // Initialize modules
  const initModules = useCallback(async () => {
    try {
      const data = await vendorModuleService.initializeModules();
      setModules(data);
      return data;
    } catch (err) {
      setError(err.message || "Failed to initialize modules");
      throw err;
    }
  }, []);

  // Load initial data
  useEffect(() => {
    fetchModules();
    fetchStats();
  }, [fetchModules, fetchStats]);

  return {
    modules,
    loading,
    error,
    stats,
    fetchModules,
    fetchStats,
    updateVendorAccess,
    updateModuleStatus,
    initModules,
  };
};

/**
 * Hook to check vendor module access
 */
export const useVendorModuleAccess = () => {
  const [accessMap, setAccessMap] = useState({});
  const [loading, setLoading] = useState(false);

  const checkAccess = useCallback(async (moduleKeys) => {
    try {
      setLoading(true);
      const data = await vendorModuleService.checkModuleAccess(moduleKeys);
      setAccessMap(data);
      return data;
    } catch (err) {
      console.error("Error checking module access:", err);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  const hasAccess = useCallback((moduleKey) => {
    return accessMap[moduleKey] === true;
  }, [accessMap]);

  return {
    accessMap,
    loading,
    checkAccess,
    hasAccess,
  };
};

/**
 * Hook to get vendor-accessible modules
 */
export const useAccessibleVendorModules = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAccessibleModules = async () => {
      try {
        setLoading(true);
        const data = await vendorModuleService.getAccessibleModules();
        setModules(data);
        setError(null);
      } catch (err) {
        setError(err.message || "Failed to fetch accessible modules");
        console.error("Error fetching accessible modules:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccessibleModules();
  }, []);

  return { modules, loading, error };
};
