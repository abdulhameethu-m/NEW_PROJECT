const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const subcategoryService = require("../services/subcategory.service");

const createSubcategory = asyncHandler(async (req, res) => {
  const subcategory = await subcategoryService.createSubcategory(req.body);
  return ok(res, subcategory, "Subcategory created");
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
