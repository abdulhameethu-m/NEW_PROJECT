import { useEffect, useState } from "react";
import { useAuthStore } from "../context/authStore";
import * as authService from "../services/authService";

export function AuthSessionBootstrap({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthResolved = useAuthStore((s) => s.isAuthResolved);
  const isRefreshing = useAuthStore((s) => s.isRefreshing);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setRefreshing = useAuthStore((s) => s.setRefreshing);
  const markGuest = useAuthStore((s) => s.markGuest);
  const [checkingSession, setCheckingSession] = useState(() => !isAuthResolved);

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

  return children;
}
