import React, { createContext, useContext, useMemo } from "react";
import { useAccessibleVendorModules } from "../hooks/useVendorModules";

// Create context
const VendorModuleContext = createContext(null);

/**
 * Provider component for vendor module access
 */
export function VendorModuleProvider({ children }) {
  const { modules, loading, error, refreshModules } = useAccessibleVendorModules();
  const moduleMap = useMemo(
    () => Object.fromEntries(modules.map((module) => [module.key, module])),
    [modules]
  );
  const canAccessAction = useMemo(
    () => (moduleKey, action = "read") => {
      const module = moduleMap[moduleKey];
      if (!module) {
        return false;
      }
      return module.enabled && module.vendorEnabled;
    },
    [moduleMap]
  );
  const value = useMemo(
    () => ({
      modules,
      moduleMap,
      loading,
      error,
      isReady: !loading,
      hasAccess: (moduleKey) => canAccessAction(moduleKey, "read"),
      canAccessAction,
      can: (permission) => {
        const [moduleKey, action = "read"] = String(permission || "").split(".");
        return canAccessAction(moduleKey, action);
      },
      refreshModules,
    }),
    [canAccessAction, error, loading, moduleMap, modules, refreshModules]
  );

  return (
    <VendorModuleContext.Provider value={value}>{children}</VendorModuleContext.Provider>
  );
}

/**
 * Hook to use vendor module context
 */
export function useModuleAccess() {
  const context = useContext(VendorModuleContext);

  if (!context) {
    throw new Error("useModuleAccess must be used within VendorModuleProvider");
  }

  return context;
}
