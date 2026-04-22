import React, { useState } from "react";
import { useVendorModules } from "../hooks/useVendorModules";
import {
  Activity,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Loader,
  Package,
  CreditCard,
  BarChart3,
  Package2,
  RotateCcw,
  Star,
  ShoppingCart,
} from "lucide-react";

// Map module keys to icons
const MODULE_ICONS = {
  orders: ShoppingCart,
  products: Package,
  payments: CreditCard,
  analytics: BarChart3,
  inventory: Package2,
  returns: RotateCcw,
  reviews: Star,
};

/**
 * Admin Panel: Vendor Module Access Control
 * Allows admin to enable/disable modules for vendors globally
 */
export default function AdminVendorAccessPage() {
  const { modules, loading, error, stats, updateVendorAccess, updateModuleStatus, initModules } =
    useVendorModules();
  const [togglingModule, setTogglingModule] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [initializingModules, setInitializingModules] = useState(false);

  const handleInitializeModules = async () => {
    try {
      setInitializingModules(true);
      await initModules();
      setSuccessMessage("Modules initialized successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error initializing modules:", err);
    } finally {
      setInitializingModules(false);
    }
  };

  const handleToggleVendorAccess = async (moduleKey, currentValue) => {
    try {
      setTogglingModule(moduleKey);
      setActionType("vendor");
      await updateVendorAccess(moduleKey, !currentValue);
      setSuccessMessage(
        `Module '${moduleKey}' ${!currentValue ? "enabled" : "disabled"} for vendors`
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error updating vendor access:", err);
    } finally {
      setTogglingModule(null);
      setActionType(null);
    }
  };

  const handleToggleGlobalStatus = async (moduleKey, currentValue) => {
    try {
      setTogglingModule(moduleKey);
      setActionType("global");
      await updateModuleStatus(moduleKey, !currentValue);
      setSuccessMessage(`Module '${moduleKey}' globally ${!currentValue ? "enabled" : "disabled"}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error updating module status:", err);
    } finally {
      setTogglingModule(null);
      setActionType(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading vendor modules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Module Access Control</h1>
          <p className="text-gray-600">
            Control which modules are accessible to vendors. Disabling a module will immediately
            revoke vendor access.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-700">{successMessage}</p>
            </div>
          </div>
        )}

        {/* No Modules - Initialize */}
        {modules.length === 0 && !error && (
          <div className="mb-8 p-8 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">Initialize Vendor Modules</h2>
            <p className="text-blue-700 mb-4">
              No modules found. Click the button below to initialize default vendor modules.
            </p>
            <button
              onClick={handleInitializeModules}
              disabled={initializingModules}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            >
              {initializingModules && <Loader className="w-4 h-4 animate-spin" />}
              {initializingModules ? "Initializing..." : "Initialize Modules"}
            </button>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Modules</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                </div>
                <Activity className="w-12 h-12 text-blue-100" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Enabled Globally</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.enabledGlobally}</p>
                </div>
                <Check className="w-12 h-12 text-green-100" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Enabled for Vendors</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.enabledForVendors}</p>
                </div>
                <Eye className="w-12 h-12 text-purple-100" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Disabled for Vendors</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.disabledForVendors}</p>
                </div>
                <EyeOff className="w-12 h-12 text-red-100" />
              </div>
            </div>
          </div>
        )}

        {/* Modules Table */}
        {modules.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Module</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Description</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    Global Status
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    Vendor Access
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {modules.map((module) => {
                  const IconComponent = MODULE_ICONS[module.key] || Package;
                  const isToggling = togglingModule === module.key;

                  return (
                    <tr key={module.key} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <IconComponent className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="font-semibold text-gray-900">{module.name}</p>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">{module.key}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{module.description}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleToggleGlobalStatus(module.key, module.enabled)}
                            disabled={isToggling}
                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                              module.enabled
                                ? "bg-green-500 hover:bg-green-600"
                                : "bg-gray-300 hover:bg-gray-400"
                            } ${isToggling ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <span
                              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                module.enabled ? "translate-x-7" : "translate-x-1"
                              }`}
                            >
                              {isToggling && actionType === "global" && (
                                <Loader className="w-4 h-4 animate-spin absolute inset-1 text-blue-500" />
                              )}
                            </span>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {/* 🔥 VENDOR ACCESS TOGGLE */}
                          <button
                            onClick={() =>
                              handleToggleVendorAccess(module.key, module.vendorEnabled)
                            }
                            disabled={isToggling || !module.enabled}
                            title={
                              !module.enabled
                                ? "Enable globally first to allow vendor access"
                                : ""
                            }
                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                              module.vendorEnabled
                                ? "bg-blue-500 hover:bg-blue-600"
                                : "bg-gray-300 hover:bg-gray-400"
                            } ${
                              isToggling || !module.enabled ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                          >
                            <span
                              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                module.vendorEnabled ? "translate-x-7" : "translate-x-1"
                              }`}
                            >
                              {isToggling && actionType === "vendor" && (
                                <Loader className="w-4 h-4 animate-spin absolute inset-1 text-blue-500" />
                              )}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Info Box */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>
              <strong>Global Status:</strong> Controls whether the module is available system-wide
            </li>
            <li>
              <strong>Vendor Access:</strong> 🔥 Controls whether vendors can access this module (requires
              global status to be enabled)
            </li>
            <li>
              <strong>Real-time:</strong> Changes take effect immediately. Vendors lose access
              instantly when disabled.
            </li>
            <li>
              <strong>Security:</strong> Backend enforces access control - UI restrictions alone are
              insufficient
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
