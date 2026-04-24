import React, { useMemo } from "react";
import { useAccessibleVendorModules } from "../hooks/useVendorModules";
import {
  ShoppingCart,
  Package,
  CreditCard,
  BarChart3,
  Package2,
  SlidersHorizontal,
  RotateCcw,
  Star,
  Loader,
  AlertCircle,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

// Map module keys to their routes
const MODULE_ROUTES = {
  orders: "/vendor/orders",
  products: "/vendor/products",
  payments: "/vendor/payments",
  analytics: "/vendor/analytics",
  inventory: "/vendor/inventory",
  filters: "/vendor/filters",
  returns: "/vendor/returns",
  reviews: "/vendor/reviews",
};

// Map module keys to icons
const MODULE_ICONS = {
  orders: ShoppingCart,
  products: Package,
  payments: CreditCard,
  analytics: BarChart3,
  inventory: Package2,
  filters: SlidersHorizontal,
  returns: RotateCcw,
  reviews: Star,
};

/**
 * Vendor Sidebar: Dynamic Module Navigation
 * Only shows modules that are:
 * 1. Globally enabled
 * 2. Enabled for vendors (admin control)
 * 3. User has permission for
 */
export default function VendorModuleSidebar() {
  const { modules, loading, error } = useAccessibleVendorModules();
  const location = useLocation();

  // Sort modules by order
  const sortedModules = useMemo(() => {
    return [...modules].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [modules]);

  if (loading) {
    return (
      <aside className="w-64 bg-white border-r border-gray-200 h-screen flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-gray-400" />
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="w-64 bg-white border-r border-gray-200 h-screen p-4 flex flex-col items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
        <p className="text-sm text-gray-600 text-center">{error}</p>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Vendor Dashboard</h2>

        <nav className="space-y-1">
          {sortedModules.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500">No modules available</p>
              <p className="text-xs text-gray-400 mt-2">
                Contact admin to enable modules
              </p>
            </div>
          ) : (
            sortedModules.map((module) => {
              const IconComponent = MODULE_ICONS[module.key] || Package;
              const routePath = MODULE_ROUTES[module.key];
              const isActive = location.pathname === routePath;

              return (
                <Link
                  key={module.key}
                  to={routePath}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  title={module.description}
                >
                  <IconComponent className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-sm">{module.name}</span>
                  {module.metadata?.beta && (
                    <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                      Beta
                    </span>
                  )}
                </Link>
              );
            })
          )}
        </nav>

        {/* Module Count */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {sortedModules.length} module{sortedModules.length !== 1 ? "s" : ""} available
          </p>
        </div>
      </div>
    </aside>
  );
}

/**
 * Module Guard: Protects routes if vendor doesn't have access
 */
export function VendorModuleGuard({ moduleKey, children }) {
  const { modules, loading } = useAccessibleVendorModules();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const hasAccess = modules.some((m) => m.key === moduleKey);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          The '{moduleKey}' module is not available to you. Contact your admin to request access.
        </p>
        <Link
          to="/vendor/overview"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return children;
}
