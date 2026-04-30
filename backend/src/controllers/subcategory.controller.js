const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const { logger } = require("../utils/logger");
const subcategoryService = require("../services/subcategory.service");

const createSubcategory = asyncHandler(async (req, res) => {
  logger.info("Create subcategory request", { 
    body: req.body,
    user: req.user?.role,
    authContext: req.authContext?.type 
  });
  const subcategory = await subcategoryService.createSubcategory(req.body);
  logger.info("Subcategory created successfully", { subcategoryId: subcategory._id });
  return ok(res, subcategory, "Subcategory created", 201);
});

const getAdminSubcategories = asyncHandler(async (req, res) => {
  const subcategories = await subcategoryService.listAdminSubcategories();
  return ok(res, subcategories, "Subcategories loaded");
});

const updateSubcategory = asyncHandler(async (req, res) => {
  const subcategory = await subcategoryService.updateSubcategory(req.params.id, req.body);
  return ok(res, subcategory, "Subcategory updated");
});

const deleteSubcategory = asyncHandler(async (req, res) => {
  const subcategory = await subcategoryService.deleteSubcategory(req.params.id);
  return ok(res, subcategory, "Subcategory deleted");
});

const updateSubcategoryStatus = asyncHandler(async (req, res) => {
  const subcategory = await subcategoryService.setSubcategoryStatus(req.params.id, req.body.status);
  return ok(res, subcategory, "Subcategory status updated");
});

const getActiveSubcategories = asyncHandler(async (req, res) => {
  const subcategories = await subcategoryService.listActiveByCategory(req.query.categoryId);
  return ok(res, subcategories, "Subcategories loaded");
});

module.exports = {
  createSubcategory,
  getAdminSubcategories,
  updateSubcategory,
  deleteSubcategory,
  updateSubcategoryStatus,
  getActiveSubcategories,
};
