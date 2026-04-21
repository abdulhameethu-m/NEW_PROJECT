const { AppError } = require("../../../utils/AppError");
const { Role } = require("../models/Role");
const {
  STAFF_PERMISSION_CATALOG,
  createEmptyPermissions,
  normalizePermissions,
} = require("../permissions");

const PREDEFINED_ROLES = [
  {
    name: "Admin",
    description: "Full staff access across supported modules.",
    permissions: Object.fromEntries(
      Object.entries(STAFF_PERMISSION_CATALOG).map(([moduleName, actions]) => [
        moduleName,
        Object.fromEntries(actions.map((action) => [action, true])),
      ])
    ),
  },
  {
    name: "Support",
    description: "Customer support focused permissions.",
    permissions: normalizePermissions({
      users: { read: true, update: true },
      orders: { read: true, update: true },
      products: { read: true },
      reviews: { read: true, delete: true },
      analytics: { read: true },
    }),
  },
  {
    name: "Finance",
    description: "Payments, payouts, and analytics access.",
    permissions: normalizePermissions({
      orders: { read: true },
      payments: { read: true, refund: true },
      payouts: { read: true, process: true },
      analytics: { read: true },
    }),
  },
  {
    name: "Operations",
    description: "Product and order operational workflows.",
    permissions: normalizePermissions({
      orders: { read: true, update: true, cancel: true },
      products: { read: true, create: true, update: true, delete: true },
      analytics: { read: true },
      settings: { update: true },
    }),
  },
];

async function ensurePredefinedStaffRoles() {
  for (const role of PREDEFINED_ROLES) {
    await Role.findOneAndUpdate(
      { name: role.name },
      { ...role, isSystem: true },
      { upsert: true }
    );
  }
}

async function listRoles() {
  await ensurePredefinedStaffRoles();
  return Role.find().sort({ isSystem: -1, name: 1 }).lean();
}

async function getRoleById(roleId) {
  const role = await Role.findById(roleId).lean();
  if (!role) throw new AppError("Role not found", 404, "NOT_FOUND");
  return role;
}

async function createRole(payload) {
  const exists = await Role.findOne({ name: payload.name.trim() });
  if (exists) throw new AppError("Role name already exists", 409, "ROLE_EXISTS");

  return Role.create({
    name: payload.name.trim(),
    description: payload.description || "",
    permissions: normalizePermissions(payload.permissions),
  });
}

async function updateRole(roleId, payload) {
  const role = await Role.findById(roleId);
  if (!role) throw new AppError("Role not found", 404, "NOT_FOUND");

  if (payload.name && payload.name.trim() !== role.name) {
    const exists = await Role.findOne({ name: payload.name.trim(), _id: { $ne: roleId } });
    if (exists) throw new AppError("Role name already exists", 409, "ROLE_EXISTS");
    role.name = payload.name.trim();
  }

  if (payload.description !== undefined) role.description = payload.description || "";
  
  const oldPermissions = role.permissions ? JSON.parse(JSON.stringify(role.permissions)) : {};
  
  if (payload.permissions) {
    role.permissions = normalizePermissions(payload.permissions);
  }

  await role.save();
  
  // Log permission change for audit trail
  console.log(`[PERMISSION_INVALIDATION] Role ${roleId} (${role.name}) updated`);
  console.log(`[PERMISSION_INVALIDATION] Old permissions:`, oldPermissions);
  console.log(`[PERMISSION_INVALIDATION] New permissions:`, role.permissions);
  console.log(`[PERMISSION_INVALIDATION] All staff with this role will see updated permissions on next sync`);
  
  return role;
}

async function deleteRole(roleId) {
  const role = await Role.findById(roleId);
  if (!role) throw new AppError("Role not found", 404, "NOT_FOUND");
  if (role.isSystem) {
    throw new AppError("System roles cannot be deleted", 400, "INVALID_OPERATION");
  }
  await role.deleteOne();
  return { _id: roleId };
}

function getPermissionCatalog() {
  return {
    catalog: STAFF_PERMISSION_CATALOG,
    emptyPermissions: createEmptyPermissions(),
  };
}

module.exports = {
  PREDEFINED_ROLES,
  ensurePredefinedStaffRoles,
  listRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getPermissionCatalog,
};
