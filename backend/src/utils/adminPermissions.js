const ADMIN_ROLES = ["admin", "super_admin", "support_admin", "finance_admin"];

const ALL_PERMISSIONS = [
  "dashboard:read",
  "analytics:read",
  "users:read",
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
  "audit:read",
];

const ROLE_PERMISSIONS = {
  admin: ALL_PERMISSIONS,
  super_admin: ALL_PERMISSIONS,
  support_admin: [
    "dashboard:read",
    "users:read",
    "users:update",
    "vendors:read",
    "vendors:approve",
    "vendors:reject",
    "orders:read",
    "orders:update",
    "products:read",
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
  ],
};

function hasPermission(role, permission) {
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}

module.exports = {
  ADMIN_ROLES,
  ROLE_PERMISSIONS,
  hasPermission,
};
