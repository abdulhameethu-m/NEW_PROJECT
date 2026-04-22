const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const attributeService = require("../services/attribute.service");

const getAttributes = asyncHandler(async (req, res) => {
  const attributes = await attributeService.listAttributesForSelection({
    categoryId: req.query.categoryId,
    subCategoryId: req.query.subCategoryId,
  });
  return ok(res, attributes, "Attributes loaded");
});

const getAdminAttributes = asyncHandler(async (req, res) => {
  const attributes = await attributeService.listAdminAttributes(req.query);
  return ok(res, attributes, "Attributes loaded");
});

const createAttribute = asyncHandler(async (req, res) => {
  const attribute = await attributeService.createAttribute(req.body);
  return ok(res, attribute, "Attribute created");
});

const updateAttribute = asyncHandler(async (req, res) => {
  const attribute = await attributeService.updateAttribute(req.params.id, req.body);
  return ok(res, attribute, "Attribute updated");
});

const deleteAttribute = asyncHandler(async (req, res) => {
  const attribute = await attributeService.deleteAttribute(req.params.id);
  return ok(res, attribute, "Attribute deleted");
});

module.exports = {
  getAttributes,
  getAdminAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute,
};
