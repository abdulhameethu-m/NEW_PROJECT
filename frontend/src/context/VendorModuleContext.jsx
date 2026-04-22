import React, { createContext, useContext, useEffect, useState } from "react";
import { useVendorModuleAccess } from "../hooks/useVendorModules";

// Create context
const VendorModuleContext = createContext(null);

/**
 * Provider component for vendor module access
 */
export function VendorModuleProvider({ children }) {
  const { accessMap, checkAccess, hasAccess } = useVendorModuleAccess();
  const [isReady, setIsReady] = useState(false);

  // Initialize by checking all modules
  useEffect(() => {
    const initializeAccess = async () => {
      const commonModules = ["orders", "products", "payments", "analytics", "inventory", "returns", "reviews"];
      await checkAccess(commonModules);
      setIsReady(true);
    };

    initializeAccess();
  }, [checkAccess]);

  return (
    <VendorModuleContext.Provider
      value={{
        accessMap,
        hasAccess,
        checkAccess,
        isReady,
      }}
    >
      {children}
    </VendorModuleContext.Provider>
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
