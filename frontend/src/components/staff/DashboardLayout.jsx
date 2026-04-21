import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useStaffAuthStore } from "../../context/staffAuthStore";
import { StaffSidebar } from "./Sidebar";
import { StaffTopbar } from "./Topbar";
import * as staffAuthService from "../../services/staffAuthService";
import { getStaffModuleByRoute } from "../../config/staffModules";

export function StaffDashboardLayout({ children }) {
  const { token, user } = useStaffAuthStore();
  const setAuth = useStaffAuthStore((state) => state.setAuth);
  const logout = useStaffAuthStore((state) => state.logout);
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function syncSession() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await staffAuthService.getMe();
        if (active) {
          setAuth({
            token,
            refreshToken: useStaffAuthStore.getState().refreshToken,
            user: response.data,
          });
          setError("");
        }
      } catch (err) {
        if (!active) return;

        if (err.response?.status === 401) {
          logout();
          return;
        }

        setError("Failed to load the latest staff permissions.");
      } finally {
        if (active) setLoading(false);
      }
    }

    syncSession();

    return () => {
      active = false;
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
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Retry
          </button>
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

      <div className="flex flex-1 flex-col overflow-hidden">
        <StaffTopbar
          user={user}
          role={user?.role || null}
          permissions={user?.permissions || {}}
          module={activeModule}
          onMenuToggle={() => setSidebarOpen((current) => !current)}
        />

        <main className="flex-1 overflow-auto">
          <div className="px-4 py-6 sm:px-6 lg:px-8">{children || <Outlet />}</div>
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
