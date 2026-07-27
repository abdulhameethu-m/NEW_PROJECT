const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const categoryService = require("../services/category.service");

const getActiveCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.listActiveCategories();
  return ok(res, categories, "Categories loaded");
});

const getAdminCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.listAllCategories();
  return ok(res, categories, "Categories loaded");
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  return ok(res, category, "Category created");
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  return ok(res, category, "Category updated");
});

const toggleCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.toggleCategory(req.params.id, req.body.isActive);
  return ok(res, category, "Category updated");
});

const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  return ok(res, null, "Category deleted");
});

module.exports = {
  getActiveCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  toggleCategory,
  deleteCategory,
};
