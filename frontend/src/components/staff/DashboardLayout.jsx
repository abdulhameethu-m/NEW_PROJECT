import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useStaffAuthStore } from "../../context/staffAuthStore";
import { StaffSidebar } from "./Sidebar";
import { StaffTopbar } from "./Topbar";
import * as staffAuthService from "../../services/staffAuthService";
import { getStaffModuleByRoute } from "../../config/staffModules";

// Periodic sync interval - 5 minutes
const PERMISSION_SYNC_INTERVAL = 5 * 60 * 1000;

export function StaffDashboardLayout({ children }) {
  const { token, user } = useStaffAuthStore();
  const setAuth = useStaffAuthStore((state) => state.setAuth);
  const logout = useStaffAuthStore((state) => state.logout);
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Initial sync and periodic sync
  useEffect(() => {
    let active = true;
    let syncInterval = null;

    async function syncSession() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        console.log("[DASHBOARD_LAYOUT] Starting permission sync...");
        const response = await staffAuthService.getMe();
        
        if (active) {
          console.log("[DASHBOARD_LAYOUT] Permission sync successful", {
            modules: Object.keys(response.data.permissions || {}),
            syncedAt: response.data.syncedAt,
            fullResponse: response.data,
          });
          
          setAuth({
            token,
            refreshToken: useStaffAuthStore.getState().refreshToken,
            user: response.data,
          });
          setLastSyncTime(new Date());
          setError("");
        }
      } catch (err) {
        if (!active) return;

        if (err.response?.status === 401) {
          console.log("[DASHBOARD_LAYOUT] Unauthorized - logging out");
          logout();
          return;
        }

        const errorMsg = err.response?.data?.message || "Failed to load the latest staff permissions.";
        setError(errorMsg);
        console.error("[DASHBOARD_LAYOUT] Permission sync failed:", errorMsg, { error: err });
      } finally {
        if (active) setLoading(false);
      }
    }

    // Initial sync on mount
    syncSession();

    // Setup periodic sync
    syncInterval = setInterval(() => {
      console.log("[DASHBOARD_LAYOUT] Periodic permission sync triggered");
      syncSession();
    }, PERMISSION_SYNC_INTERVAL);

    return () => {
      active = false;
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [logout, setAuth, token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500" />
          <p className="mt-4 text-sm text-slate-600">Loading staff workspace...</p>
          {lastSyncTime && (
            <p className="mt-2 text-xs text-slate-400">
              Last synced: {lastSyncTime.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="max-w-md rounded-[1.5rem] border border-rose-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Unable to load workspace</h2>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
          {lastSyncTime && (
            <p className="mt-4 text-xs text-slate-400">
              Last synced: {lastSyncTime.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  const activeModule = getStaffModuleByRoute(location.pathname);

  return (
    <div className="flex min-h-screen overflow-hidden bg-slate-100">
      <StaffSidebar
        permissions={user?.permissions || {}}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((current) => !current)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <StaffTopbar
          user={user}
          role={user?.role || null}
          permissions={user?.permissions || {}}
          module={activeModule}
          onMenuToggle={() => setSidebarOpen((current) => !current)}
        />

        <main className="flex-1 overflow-auto bg-slate-100">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children || <Outlet />}</div>
        </main>
      </div>

      {sidebarOpen ? (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          aria-label="Close sidebar overlay"
        />
      ) : null}
    </div>
  );
}
