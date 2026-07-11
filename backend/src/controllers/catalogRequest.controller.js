const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const catalogRequestService = require("../services/catalogRequest.service");

const searchCatalog = asyncHandler(async (req, res) => {
  const { type = "category", query = "", page, limit } = req.query;
  const data = await catalogRequestService.listCatalogSearch({ type, query, page, limit });
  return ok(res, data, "Catalog search completed");
});

const listVendorRequests = asyncHandler(async (req, res) => {
  const vendor = req.vendor;
  const data = await catalogRequestService.listVendorRequests(vendor._id, req.query);
  return ok(res, data, "Vendor catalog requests loaded");
});

const listAdminRequests = asyncHandler(async (req, res) => {
  const data = await catalogRequestService.listAdminRequests(req.query);
  return ok(res, data, "Admin catalog requests loaded");
});

const getRequestById = asyncHandler(async (req, res) => {
  const vendorId = req.user?.role === "vendor" ? req.vendor?._id : null;
  const data = await catalogRequestService.getRequestById(req.params.id, vendorId);
  return ok(res, data, "Catalog request loaded");
});

const createRequest = asyncHandler(async (req, res) => {
  const vendor = req.vendor;
  const data = await catalogRequestService.createRequest({
    vendorId: vendor._id,
    vendorUserId: req.user?.sub,
    requestType: req.body.requestType,
    requestedName: req.body.requestedName,
    description: req.body.description,
    businessJustification: req.body.businessJustification,
    payload: req.body.payload || {},
    categoryId: req.body.categoryId || null,
    subCategoryId: req.body.subCategoryId || null,
  });
  return ok(res, data, "Catalog request submitted");
});

const cancelRequest = asyncHandler(async (req, res) => {
  const vendorId = req.user?.role === "vendor" ? req.vendor?._id : null;
  const data = await catalogRequestService.cancelRequest(req.params.id, req.user, vendorId);
  return ok(res, data, "Catalog request cancelled");
});

const reviewRequest = asyncHandler(async (req, res) => {
  const data = await catalogRequestService.reviewRequest(req.params.id, req.user, req.body);
  return ok(res, data, "Catalog request reviewed");
});

module.exports = {
  searchCatalog,
  listVendorRequests,
  listAdminRequests,
  getRequestById,
  createRequest,
  cancelRequest,
  reviewRequest,
};
