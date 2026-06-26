import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../context/authStore";
import { saveRedirectAfterLogin } from "../utils/loginRedirect";
import * as authService from "../services/authService";

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthResolved = useAuthStore((s) => s.isAuthResolved);
  const isRefreshing = useAuthStore((s) => s.isRefreshing);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setRefreshing = useAuthStore((s) => s.setRefreshing);
  const markGuest = useAuthStore((s) => s.markGuest);
  const location = useLocation();
  const [checkingSession, setCheckingSession] = useState(!isAuthResolved);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (isAuthenticated || isAuthResolved) {
        setCheckingSession(false);
        return;
      }

      setRefreshing();
      setCheckingSession(true);
      try {
        const response = await authService.refreshSession();
        if (!cancelled) setAuth(response?.data || response);
      } catch {
        if (!cancelled) markGuest();
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isAuthResolved, markGuest, setAuth, setRefreshing]);

  if (checkingSession || isRefreshing) {
    return <div className="flex min-h-screen items-center justify-center text-sm font-bold text-slate-500">Restoring session...</div>;
  }

  if (!isAuthenticated) {
    const attemptedPath = `${location.pathname}${location.search}${location.hash}`;
    if (attemptedPath && attemptedPath !== "/login") {
      saveRedirectAfterLogin(window.location.origin + attemptedPath);
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}

