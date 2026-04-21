import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStaffAuthStore } from "../context/staffAuthStore";
import { hasStaffPermission } from "../utils/staffPermissions";

export function useStaffPermission() {
  const user = useStaffAuthStore((state) => state.user);
  const permissions = user?.permissions || {};

  return {
    permissions,
    hasPermission: (permissionKey) => hasStaffPermission(permissions, permissionKey),
    canAccess: (permissionKey) => (!permissionKey ? true : hasStaffPermission(permissions, permissionKey)),
    getPermissions: () => permissions,
    getRole: () => user?.role?.name || user?.roleName || null,
  };
}

export function useRequirePermission(permissionKey) {
  const navigate = useNavigate();
  const user = useStaffAuthStore((state) => state.user);

  useEffect(() => {
    if (permissionKey && user && !hasStaffPermission(user.permissions, permissionKey)) {
      navigate("/staff/unauthorized", { replace: true });
    }
  }, [navigate, permissionKey, user]);
}

export function useStaffUser() {
  const { user, isAuthenticated, token } = useStaffAuthStore();

  return {
    user,
    isAuthenticated,
    token,
    name: user?.name || "Staff",
    email: user?.email || "",
    roleId: user?.roleId || user?.role?._id || null,
    roleName: user?.role?.name || user?.roleName || null,
    status: user?.status || "active",
  };
}

export function useStaffAuthLoading() {
  const { token, user, isAuthenticated } = useStaffAuthStore();
  return !isAuthenticated || (Boolean(token) && !user);
}

export function PermissionGate({ permission, children, fallback = null }) {
  const { hasPermission } = useStaffPermission();
  return !permission || hasPermission(permission) ? children : fallback;
}
