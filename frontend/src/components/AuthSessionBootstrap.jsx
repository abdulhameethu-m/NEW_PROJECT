import { useEffect, useState } from "react";
import { useAuthStore } from "../context/authStore";
import * as authService from "../services/authService";

let bootstrapAttempted = false;

export function AuthSessionBootstrap({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [checkingSession, setCheckingSession] = useState(() => !isAuthenticated && !bootstrapAttempted);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (isAuthenticated || bootstrapAttempted) {
        setCheckingSession(false);
        return;
      }

      bootstrapAttempted = true;
      setCheckingSession(true);

      try {
        const response = await authService.refreshSession();
        if (!cancelled) setAuth(response?.data || response);
      } catch {
        // No refresh cookie means the visitor is genuinely signed out.
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, setAuth]);

  if (checkingSession) {
    return <div className="flex min-h-screen items-center justify-center text-sm font-bold text-slate-500">Restoring session...</div>;
  }

  return children;
}
