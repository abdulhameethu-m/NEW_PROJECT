const ADMIN_ROLES = ["admin", "super_admin", "support_admin", "finance_admin"];

const ALL_PERMISSIONS = [
  "dashboard:read",
  "analytics:read",
  "users:read",
  "users:create",
  "users:update",
  "users:delete",
  "vendors:read",
  "vendors:approve",
  "vendors:reject",
  "vendors:delete",
  "orders:read",
  "orders:update",
  "products:read",
  "products:create",
  "products:update",
  "products:delete",
  "products:approve",
  "products:reject",
  "filters:read",
  "filters:create",
  "filters:update",
  "filters:delete",
  "categories:read",
  "categories:create",
  "categories:update",
  "audit:read",
];

const ROLE_PERMISSIONS = {
  admin: ALL_PERMISSIONS,
  super_admin: ALL_PERMISSIONS,
  support_admin: [
    "dashboard:read",
    "users:read",
    "users:create",
    "users:update",
    "vendors:read",
    "vendors:approve",
    "vendors:reject",
    "orders:read",
    "orders:update",
    "products:read",
    "filters:read",
    "categories:read",
    "audit:read",
  ],
  finance_admin: [
    "dashboard:read",
    "analytics:read",
    "orders:read",
    "audit:read",
    "users:read",
    "vendors:read",
    "products:read",
    "filters:read",
    "categories:read",
  ],
};

function hasPermission(role, permission) {
  const normalized = String(permission || "").replace(/\./g, ":");
  return (ROLE_PERMISSIONS[role] || []).includes(normalized);
}

module.exports = {
  ADMIN_ROLES,
  ROLE_PERMISSIONS,
  hasPermission,
};
