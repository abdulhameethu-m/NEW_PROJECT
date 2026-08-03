import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "../context/authStore";
import { useStaffAuthStore } from "../context/staffAuthStore";
import { api as publicHttp } from "../services/api";
import MaintenancePage from "../pages/MaintenancePage";

export function MaintenanceGuard({ children }) {
  const location = useLocation();
  const { user, isRefreshing: isInitializing } = useAuthStore();
  const { user: staffUser } = useStaffAuthStore();
  const [maintenanceConfig, setMaintenanceConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const response = await publicHttp.get("/api/public/platform-status");
      setMaintenanceConfig(response.data?.data);
    } catch (err) {
      if (err?.response?.status === 503 && err?.response?.data?.maintenance) {
        // Fallback config if the platform-status endpoint itself was blocked
        setMaintenanceConfig({
          maintenanceEnabled: true,
          title: "The Platform is Under Maintenance",
          subtitle: "We're making improvements to serve you better.",
          description: err.response.data.message || "",
          allowAdmins: true
        });
        // Failed to fetch maintenance status
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading || isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-indigo-600 dark:border-slate-700"></div>
      </div>
    );
  }

  const isEnabled = maintenanceConfig?.maintenanceEnabled;

  if (isEnabled) {
    let isAllowed = false;

    if (user) {
      if (user.role === "super_admin") {
        isAllowed = true;
      } else if (
        (user.role === "admin" || user.role === "support_admin" || user.role === "finance_admin") &&
        maintenanceConfig.allowAdmins !== false
      ) {
        isAllowed = true;
      } else if (user.role === "vendor" && maintenanceConfig.allowVendors) {
        isAllowed = true;
      } else if (user.role === "influencer" && maintenanceConfig.allowInfluencers) {
        isAllowed = true;
      }
    } else if (staffUser && maintenanceConfig.allowStaff) {
      isAllowed = true;
    }

    if (!isAllowed) {
      // Exclude authentication paths from frontend block so staff can login
      const path = location.pathname;
      if (path === "/login" || path === "/staff/login") {
        return children;
      }
      return <MaintenancePage config={maintenanceConfig} onRefresh={fetchStatus} />;
    }
  }

  return children;
}
