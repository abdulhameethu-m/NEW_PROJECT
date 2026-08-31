const { STAFF_PERMISSION_CATALOG } = require("../modules/staff/permissions");

const ADMIN_ROLES = ["admin", "super_admin", "support_admin", "finance_admin"];

// Dynamically generate all possible permissions in legacy format "module:action"
const ALL_PERMISSIONS = Object.entries(STAFF_PERMISSION_CATALOG)
  .flatMap(([moduleName, actions]) => actions.map(action => `${moduleName}:${action}`));

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
    "orders:cancel",
    "products:read",
    "reviews:read",
    "reviews:update",
    "reviews:delete",
    "payments:read",
    "payments:refund",
    "payouts:read",
    "payouts:process",
    "settlements:read",
    "settings:read",
    "settings:create",
    "settings:update",
    "settings:delete",
    "branding:view",
    "branding:create",
    "branding:update",
    "branding:delete",
    "categories:read",
    "roles:read",
    "staff:read",
    "audit:read",
  ],
  finance_admin: [
    "dashboard:read",
    "vendors:read",
    "payments:read",
    "payments:refund",
    "payouts:read",
    "payouts:process",
    "settlements:read",
    "settlements:settle",
    "settlements:hold",
    "settlements:release",
    "settlements:reverse",
    "settlements:payout",
    "analytics:read",
  ],
};
function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}
function hasPermission(role, permission) {
  const normalized = String(permission || "").replace(/\./g, ":");
  return (ROLE_PERMISSIONS[normalizeRole(role)] || []).includes(normalized);
}
module.exports = {
  ADMIN_ROLES,
  hasPermission,
  normalizeRole,
};