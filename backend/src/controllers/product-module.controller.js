const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const productModuleService = require("../services/product-module.service");

const getProductModules = asyncHandler(async (req, res) => {
  const modules = await productModuleService.listProductModules({ activeOnly: true });
  return ok(res, modules, "Product modules loaded");
});

const getAdminProductModules = asyncHandler(async (req, res) => {
  const modules = await productModuleService.listProductModules();
  return ok(res, modules, "Product modules loaded");
});

const createProductModule = asyncHandler(async (req, res) => {
  const moduleDef = await productModuleService.createProductModule(req.body);
  return ok(res, moduleDef, "Product module created");
});

const updateProductModule = asyncHandler(async (req, res) => {
  const moduleDef = await productModuleService.updateProductModule(req.params.id, req.body);
  return ok(res, moduleDef, "Product module updated");
});

const deleteProductModule = asyncHandler(async (req, res) => {
  const moduleDef = await productModuleService.deleteProductModule(req.params.id);
  return ok(res, moduleDef, "Product module deleted");
});

module.exports = {
  getProductModules,
  getAdminProductModules,
  createProductModule,
  updateProductModule,
  deleteProductModule,
};
