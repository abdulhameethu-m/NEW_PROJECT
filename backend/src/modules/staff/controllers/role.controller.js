const { ok } = require("../../../utils/apiResponse");
const { asyncHandler } = require("../../../utils/asyncHandler");
const roleService = require("../services/role.service");

const getPermissionCatalog = asyncHandler(async (req, res) => {
  return ok(res, roleService.getPermissionCatalog(), "Permission catalog loaded");
});

const listRoles = asyncHandler(async (req, res) => {
  const roles = await roleService.listRoles();
  return ok(res, roles, "Roles loaded");
});

const getRoleById = asyncHandler(async (req, res) => {
  const role = await roleService.getRoleById(req.params.id);
  return ok(res, role, "Role loaded");
});

const createRole = asyncHandler(async (req, res) => {
  const role = await roleService.createRole(req.body);
  return ok(res, role, "Role created");
});

const updateRole = asyncHandler(async (req, res) => {
  const role = await roleService.updateRole(req.params.id, req.body);
  return ok(res, role, "Role updated");
});

const deleteRole = asyncHandler(async (req, res) => {
  const result = await roleService.deleteRole(req.params.id);
  return ok(res, result, "Role deleted");
});

module.exports = {
  getPermissionCatalog,
  listRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};
