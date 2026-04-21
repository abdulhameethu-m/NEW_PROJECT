import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStaffAuthStore } from "../context/staffAuthStore";
import { hasStaffPermission } from "../utils/staffPermissions";
import * as staffAuthService from "../services/staffAuthService";

export function useStaffPermission() {
  const user = useStaffAuthStore((state) => state.user);
  const setAuth = useStaffAuthStore((state) => state.setAuth);
  const token = useStaffAuthStore((state) => state.token);
  const refreshToken = useStaffAuthStore((state) => state.refreshToken);
  const [syncing, setSyncing] = useState(false);

  const permissions = useMemo(() => user?.permissions || {}, [user]);
  const roleName = user?.role?.name || user?.roleName || null;

  // Force sync permissions from server
  const syncPermissions = useCallback(async () => {
    if (!token || syncing) return;

    try {
      setSyncing(true);
      console.log("[PERMISSION_SYNC] Starting sync from /api/staff/auth/me");
      const response = await staffAuthService.getMe();
      
      console.log("[PERMISSION_SYNC] Sync successful", {
        syncedAt: response.data.syncedAt,
        modules: Object.keys(response.data.permissions || {}),
        permissions: response.data.permissions,
      });

      setAuth({
        token,
        refreshToken,
        user: response.data,
      });
    } catch (error) {
      console.error("[PERMISSION_SYNC] Sync failed:", error.message);
    } finally {
      setSyncing(false);
    }
  }, [token, refreshToken, setAuth, syncing]);

  const hasPermission = useCallback(
    (permissionKey) => {
      const result = hasStaffPermission(permissions, permissionKey);
      console.log(`[PERMISSION_CHECK] ${permissionKey}: ${result}`, { permissions });
      return result;
    },
    [permissions]
  );

  const canAccess = useCallback(
    (permissionKey) => (!permissionKey ? true : hasStaffPermission(permissions, permissionKey)),
    [permissions]
  );

  const getPermissions = useCallback(() => permissions, [permissions]);
  const getRole = useCallback(() => roleName, [roleName]);

  return useMemo(
    () => ({
      permissions,
      hasPermission,
      canAccess,
      getPermissions,
      getRole,
      syncPermissions,
      syncing,
    }),
    [permissions, hasPermission, canAccess, getPermissions, getRole, syncPermissions, syncing]
  );
}

export function useRequirePermission(permissionKey) {
  const navigate = useNavigate();
  const user = useStaffAuthStore((state) => state.user);

  useEffect(() => {
    if (permissionKey && user && !hasStaffPermission(user.permissions, permissionKey)) {
      console.warn(`[PERMISSION_GUARD] Access denied for ${permissionKey}`);
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
