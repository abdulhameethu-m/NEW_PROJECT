import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useStaffAuthStore } from "../context/staffAuthStore";

export function StaffProtectedRoute() {
  const token = useStaffAuthStore((s) => s.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
