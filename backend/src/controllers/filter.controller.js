const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const filterService = require("../services/filter.service");

const getFilters = asyncHandler(async (req, res) => {
  const filters = await filterService.listFilterDefinitions({
    categoryId: req.query.categoryId,
    subCategoryId: req.query.subCategoryId,
    activeOnly: req.query.includeInactive === "true" ? false : true,
  });
  return ok(res, filters, "Filters loaded");
});

const getAdminFilters = asyncHandler(async (req, res) => {
  const filters = await filterService.listAdminFilters(req.query);
  return ok(res, filters, "Filters loaded");
});

const createFilter = asyncHandler(async (req, res) => {
  const filter = await filterService.createFilter(req.body);
  return ok(res, filter, "Filter created");
});

const updateFilter = asyncHandler(async (req, res) => {
  const filter = await filterService.updateFilter(req.params.id, req.body);
  return ok(res, filter, "Filter updated");
});

const deleteFilter = asyncHandler(async (req, res) => {
  const filter = await filterService.deleteFilter(req.params.id);
  return ok(res, filter, "Filter deleted");
});

module.exports = {
  getFilters,
  getAdminFilters,
  createFilter,
  updateFilter,
  deleteFilter,
};
