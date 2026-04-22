import React from "react";
import { Navigate } from "react-router-dom";
import { useModuleAccess } from "../context/VendorModuleContext";
import { Loader, AlertCircle } from "lucide-react";

/**
 * Protected Route Component
 * Ensures vendor can access a module before rendering
 */
export default function VendorModuleRoute({ moduleKey, children }) {
  const { hasAccess, isReady } = useModuleAccess();

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Checking module access...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess(moduleKey)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6 max-w-md">
          The "{moduleKey}" module is not available. The admin has disabled this module for vendors.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Go Back
          </button>
          <a
            href="/vendor/overview"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * HOC for protecting vendor pages
 */
export function withVendorModule(Component, moduleKey) {
  return function ProtectedComponent(props) {
    return (
      <VendorModuleRoute moduleKey={moduleKey}>
        <Component {...props} />
      </VendorModuleRoute>
    );
  };
}
