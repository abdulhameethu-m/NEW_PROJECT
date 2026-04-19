import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../context/authStore";
import { saveRedirectAfterLogin } from "../utils/loginRedirect";

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  if (!token) {
    const attemptedPath = `${location.pathname}${location.search}${location.hash}`;
    if (attemptedPath && attemptedPath !== "/login") {
      saveRedirectAfterLogin(window.location.origin + attemptedPath);
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}

