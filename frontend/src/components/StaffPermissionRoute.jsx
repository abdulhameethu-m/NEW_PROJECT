import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useStaffAuthStore } from "../context/staffAuthStore";
import { hasStaffPermission } from "../utils/staffPermissions";

export function StaffPermissionRoute({ permission }) {
  const user = useStaffAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!hasStaffPermission(user.permissions, permission)) {
    return <Navigate to="/staff/unauthorized" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
