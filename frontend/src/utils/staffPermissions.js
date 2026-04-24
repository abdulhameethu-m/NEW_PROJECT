export const LEGACY_ADMIN_ROLES = ["admin", "super_admin", "support_admin", "finance_admin"];

export const LEGACY_ROLE_PERMISSIONS = {
  admin: ["all"],
  super_admin: ["all"],
  support_admin: [
    "analytics.read",
    "users.read",
    "users.update",
    "orders.read",
    "orders.update",
    "products.read",
    "filters.read",
  ],
  finance_admin: ["analytics.read", "orders.read", "users.read", "products.read", "filters.read"],
};

export function hasStaffPermission(permissions, permission) {
  const [moduleName, action] = String(permission || "").split(".");
  return Boolean(permissions?.[moduleName]?.[action]);
}

export function hasLegacyPermission(role, permission) {
  const permissions = LEGACY_ROLE_PERMISSIONS[role] || [];
  return permissions.includes("all") || permissions.includes(permission);
}
