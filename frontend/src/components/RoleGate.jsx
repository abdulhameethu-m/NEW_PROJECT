import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../context/authStore";

export function RoleGate({ roles }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

