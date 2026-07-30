const { Role } = require("../models/Role");
const { Staff } = require("../models/Staff");
const { AppError } = require("../../../utils/AppError");

const {
  STAFF_PERMISSION_CATALOG,
  STAFF_PERMISSION_LAYOUT,
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
      users: { read: true },
      orders: { read: true, update: true },
      products: { read: true },
      reviews: { read: true, delete: true },
      analytics: { read: true },
      branding: { view: true },
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
      branding: { view: true },
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
      branding: { view: true, update: true },
    }),
  },
];

async function ensurePredefinedStaffRoles() {
  await Role.bulkWrite(
    PREDEFINED_ROLES.map((role) => ({
      updateOne: {
        filter: { name: role.name },
        update: {
          $set: {
            description: role.description,
            permissions: role.permissions,
            isSystem: true,
          },
          $setOnInsert: {
            name: role.name,
          },
        },
        upsert: true,
      },
    }))
  );
}

function getPermissionCatalog() {
  return {
    catalog: STAFF_PERMISSION_CATALOG,
    layout: STAFF_PERMISSION_LAYOUT,
    emptyPermissions: createEmptyPermissions(),
  };
}

async function listRoles() {
  return Role.find().sort({ createdAt: -1 }).lean();
}

async function getRoleById(roleId) {
  const role = await Role.findById(roleId).lean();
  if (!role) throw new AppError("Role not found", 404, "NOT_FOUND");
  return role;
}

async function createRole(payload) {
  const { name, description, permissions } = payload;
  if (!name) throw new AppError("Role name is required", 400, "VALIDATION_ERROR");

  const existing = await Role.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
  if (existing) throw new AppError("Role name already exists", 400, "DUPLICATE_ROLE");
  
  const role = new Role({ name, description, permissions });
  await role.save();
  return role.toObject();
}

async function updateRole(roleId, payload) {
  const { name, description, permissions } = payload;
  const role = await Role.findById(roleId);
  if (!role) throw new AppError("Role not found", 404, "NOT_FOUND");
  if (role.isSystem) throw new AppError("Cannot modify system roles", 400, "SYSTEM_ROLE_MODIFICATION_DENIED");
  
  if (name && name !== role.name) {
    const existing = await Role.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (existing && existing._id.toString() !== roleId) throw new AppError("Role name already exists", 400, "DUPLICATE_ROLE");
    role.name = name;
  }
  
  if (description !== undefined) role.description = description;
  if (permissions !== undefined) role.permissions = permissions;
  
  await role.save();
  return role.toObject();
}

async function deleteRole(roleId) {
  const role = await Role.findById(roleId);
  if (!role) throw new AppError("Role not found", 404, "NOT_FOUND");
  if (role.isSystem) throw new AppError("Cannot delete system roles", 400, "SYSTEM_ROLE_DELETION_DENIED");
  
  const inUse = await Staff.exists({ roleId });
  if (inUse) throw new AppError("Cannot delete role in use by staff members", 400, "ROLE_IN_USE");
  
  await role.deleteOne();
  return { success: true };
}

module.exports = {
  ensurePredefinedStaffRoles,
  getPermissionCatalog,
  listRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};
