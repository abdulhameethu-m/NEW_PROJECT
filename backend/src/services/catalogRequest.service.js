const { CatalogRequest } = require("../models/CatalogRequest");
const { Category } = require("../models/Category");
const { Subcategory } = require("../models/Subcategory");
const { Attribute } = require("../models/Attribute");
const { ProductModule } = require("../models/ProductModule");
const { AppError } = require("../utils/AppError");
const { generateSlug } = require("../utils/slug");
const auditService = require("./audit.service");
const notificationService = require("./notification.service");

function normalizeSearch(value = "") {
  return String(value || "").trim().toLowerCase();
}

function buildSearchRegex(value = "") {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
}

async function detectDuplicates({ requestType, requestedName, categoryId, subCategoryId, payload = {} }) {
  const normalizedName = String(requestedName || "").trim().toLowerCase();
  const existingQuery = {
    status: { $in: ["submitted", "under_review", "approved"] },
  };

  if (requestType === "category") {
    const [categoryMatch, pendingRequestMatch] = await Promise.all([
      Category.findOne({ name: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } }).select("_id").lean(),
      CatalogRequest.findOne({ requestType, requestedName: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }, status: { $in: ["submitted", "under_review", "approved"] } }).select("_id").lean(),
    ]);

    return { categoryMatch, pendingRequestMatch, duplicate: Boolean(categoryMatch || pendingRequestMatch) };
  }

  if (requestType === "subcategory") {
    const [subcategoryMatch, pendingRequestMatch] = await Promise.all([
      Subcategory.findOne({ categoryId, name: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } }).select("_id").lean(),
      CatalogRequest.findOne({ requestType, categoryId, requestedName: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }, status: { $in: ["submitted", "under_review", "approved"] } }).select("_id").lean(),
    ]);
    return { subcategoryMatch, pendingRequestMatch, duplicate: Boolean(subcategoryMatch || pendingRequestMatch) };
  }

  if (requestType === "attribute") {
    const [attributeMatch, pendingRequestMatch] = await Promise.all([
      Attribute.findOne({
        "appliesTo.categoryId": categoryId,
        "appliesTo.subCategoryId": subCategoryId || null,
        name: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      }).select("_id").lean(),
      CatalogRequest.findOne({
        requestType,
        categoryId,
        subCategoryId: subCategoryId || null,
        requestedName: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
        status: { $in: ["submitted", "under_review", "approved"] },
      }).select("_id").lean(),
    ]);
    return { attributeMatch, pendingRequestMatch, duplicate: Boolean(attributeMatch || pendingRequestMatch) };
  }

  const [moduleMatch, pendingRequestMatch] = await Promise.all([
    ProductModule.findOne({ name: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } }).select("_id").lean(),
    CatalogRequest.findOne({ requestType, requestedName: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }, status: { $in: ["submitted", "under_review", "approved"] } }).select("_id").lean(),
  ]);

  return { moduleMatch, pendingRequestMatch, duplicate: Boolean(moduleMatch || pendingRequestMatch) };
}

async function listCatalogSearch({ type, query = "", page = 1, limit = 20 } = {}) {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;
  const search = normalizeSearch(query);
  const regex = buildSearchRegex(search);
  const filter = { isActive: true };

  if (regex) {
    filter.name = { $regex: regex, $options: "i" };
  }

  if (type === "all") {
    const innerLimit = Math.max(Math.ceil(limitNumber / 4), 1);
    const [categories, subcategories, attributes, productModules] = await Promise.all([
      Category.find(filter).sort({ order: 1, name: 1 }).limit(innerLimit).lean(),
      Subcategory.find(filter).populate("categoryId", "name slug").sort({ createdAt: -1 }).limit(innerLimit).lean(),
      Attribute.find(filter).populate("appliesTo.categoryId", "name slug").populate("appliesTo.subCategoryId", "name slug").sort({ createdAt: -1 }).limit(innerLimit).lean(),
      ProductModule.find(filter).sort({ order: 1, name: 1 }).limit(innerLimit).lean(),
    ]);

    const items = [
      ...categories.map((item) => ({ ...item, catalogType: "Category" })),
      ...subcategories.map((item) => ({ ...item, catalogType: "Subcategory" })),
      ...attributes.map((item) => ({ ...item, catalogType: "Attribute" })),
      ...productModules.map((item) => ({ ...item, catalogType: "Product Module" })),
    ];

    return { items, pagination: { page: pageNumber, limit: limitNumber, total: items.length, pages: 1 } };
  }

  if (type === "category") {
    const [items, total] = await Promise.all([
      Category.find(filter).sort({ order: 1, name: 1 }).skip(skip).limit(limitNumber).lean(),
      Category.countDocuments(filter),
    ]);
    return { items: items.map((item) => ({ ...item, catalogType: "Category" })), pagination: { page: pageNumber, limit: limitNumber, total, pages: Math.ceil(total / limitNumber) } };
  }

  if (type === "subcategory") {
    const [items, total] = await Promise.all([
      Subcategory.find(filter).populate("categoryId", "name slug").sort({ createdAt: -1 }).skip(skip).limit(limitNumber).lean(),
      Subcategory.countDocuments(filter),
    ]);
    return { items: items.map((item) => ({ ...item, catalogType: "Subcategory" })), pagination: { page: pageNumber, limit: limitNumber, total, pages: Math.ceil(total / limitNumber) } };
  }

  if (type === "attribute") {
    const [items, total] = await Promise.all([
      Attribute.find(filter).populate("appliesTo.categoryId", "name slug").populate("appliesTo.subCategoryId", "name slug").sort({ createdAt: -1 }).skip(skip).limit(limitNumber).lean(),
      Attribute.countDocuments(filter),
    ]);
    return { items: items.map((item) => ({ ...item, catalogType: "Attribute" })), pagination: { page: pageNumber, limit: limitNumber, total, pages: Math.ceil(total / limitNumber) } };
  }

  const [items, total] = await Promise.all([
    ProductModule.find(filter).sort({ order: 1, name: 1 }).skip(skip).limit(limitNumber).lean(),
    ProductModule.countDocuments(filter),
  ]);

  return { items: items.map((item) => ({ ...item, catalogType: "Product Module" })), pagination: { page: pageNumber, limit: limitNumber, total, pages: Math.ceil(total / limitNumber) } };
}

async function listVendorRequests(vendorId, { page = 1, limit = 20, status, requestType, search } = {}) {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;
  const query = { vendorId };

  if (status) query.status = status;
  if (requestType) query.requestType = requestType;
  if (search) {
    query.$or = [
      { requestedName: { $regex: buildSearchRegex(search), $options: "i" } },
      { requestId: { $regex: buildSearchRegex(search), $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    CatalogRequest.find(query)
      .populate("categoryId", "name slug")
      .populate("subCategoryId", "name slug")
      .populate("reviewer", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(),
    CatalogRequest.countDocuments(query),
  ]);

  return { items, pagination: { page: pageNumber, limit: limitNumber, total, pages: Math.ceil(total / limitNumber) } };
}

async function listAdminRequests({ page = 1, limit = 20, status, requestType, search } = {}) {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;
  const query = {};

  if (status) query.status = status;
  if (requestType) query.requestType = requestType;
  if (search) {
    query.$or = [
      { requestedName: { $regex: buildSearchRegex(search), $options: "i" } },
      { requestId: { $regex: buildSearchRegex(search), $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    CatalogRequest.find(query)
      .populate("vendorId", "shopName userId")
      .populate("categoryId", "name slug")
      .populate("subCategoryId", "name slug")
      .populate("reviewer", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(),
    CatalogRequest.countDocuments(query),
  ]);

  return { items, pagination: { page: pageNumber, limit: limitNumber, total, pages: Math.ceil(total / limitNumber) } };
}

async function getRequestById(requestId, vendorId = null) {
  const query = { requestId };
  if (vendorId) query.vendorId = vendorId;

  const request = await CatalogRequest.findOne(query)
    .populate("vendorId", "shopName userId")
    .populate("categoryId", "name slug")
    .populate("subCategoryId", "name slug")
    .populate("reviewer", "name email")
    .lean();

  if (!request) {
    throw new AppError("Catalog request not found", 404, "NOT_FOUND");
  }
  return request;
}

async function createRequest({ vendorId, vendorUserId, requestType, requestedName, description = "", businessJustification = "", payload = {}, categoryId = null, subCategoryId = null }) {
  if (!vendorId) throw new AppError("Vendor is required", 400, "VALIDATION_ERROR");
  if (!requestType) throw new AppError("Request type is required", 400, "VALIDATION_ERROR");
  if (!requestedName) throw new AppError("Requested name is required", 400, "VALIDATION_ERROR");

  const duplicates = await detectDuplicates({ requestType, requestedName, categoryId, subCategoryId, payload });
  if (duplicates.duplicate) {
    throw new AppError("This request already exists.", 409, "DUPLICATE_REQUEST");
  }

  const request = await CatalogRequest.create({
    vendorId,
    vendorUserId,
    requestType,
    requestedName,
    description,
    businessJustification,
    payload,
    categoryId,
    subCategoryId,
    status: "submitted",
  });

  await auditService.log({ actor: { _id: vendorUserId, role: "vendor" }, action: "catalog_request.created", entityType: "CatalogRequest", entityId: request._id, metadata: { requestType, requestedName } }).catch(() => {});
  await notificationService.notifyAdmins({ title: "New catalog request", message: `${requestedName} requires catalog review.`, module: "CATALOG", subModule: "REQUESTS", type: "INFO", referenceId: String(request._id), meta: { requestId: request.requestId, requestType } }).catch(() => {});

  return request;
}

async function cancelRequest(requestId, actor, vendorId = null) {
  const query = { requestId };
  if (vendorId) query.vendorId = vendorId;

  const request = await CatalogRequest.findOne(query);
  if (!request) throw new AppError("Catalog request not found", 404, "NOT_FOUND");
  if (request.status !== "submitted" && request.status !== "under_review") {
    throw new AppError("Only pending requests can be cancelled", 400, "VALIDATION_ERROR");
  }
  request.status = "cancelled";
  request.remarks = "Cancelled by vendor";
  await request.save();
  await auditService.log({ actor, action: "catalog_request.cancelled", entityType: "CatalogRequest", entityId: request._id, metadata: { requestId } }).catch(() => {});
  return request;
}

async function reviewRequest(requestId, actor, payload = {}) {
  const request = await CatalogRequest.findOne({ requestId });
  if (!request) throw new AppError("Catalog request not found", 404, "NOT_FOUND");

  const nextStatus = String(payload.status || "").toLowerCase();
  if (!["approved", "rejected", "under_review"].includes(nextStatus)) {
    throw new AppError("Invalid review action", 400, "VALIDATION_ERROR");
  }

  request.status = nextStatus;
  request.reviewer = actor?._id || actor?.sub || null;
  request.reviewDate = new Date();
  request.remarks = payload.remarks || request.remarks || "";
  request.reviewReason = payload.reviewReason || request.reviewReason || "";
  request.reviewMetadata = payload.reviewMetadata || request.reviewMetadata || {};
  await request.save();

  if (nextStatus === "approved") {
    await createCatalogEntryFromRequest(request);
  }
  await auditService.log({ actor, action: `catalog_request.${nextStatus}`, entityType: "CatalogRequest", entityId: request._id, metadata: { requestId, status: nextStatus } }).catch(() => {});

  const recipientId = request.vendorUserId || request.vendorId;
  await notificationService.createNotification({ userId: recipientId, role: "VENDOR", module: "CATALOG", subModule: "REQUESTS", type: nextStatus === "approved" ? "SUCCESS" : "WARNING", title: nextStatus === "approved" ? "Catalog request approved" : "Catalog request reviewed", message: nextStatus === "approved" ? `Your request for ${request.requestedName} was approved.` : `Your request for ${request.requestedName} was reviewed.`, referenceId: String(request._id), meta: { requestId: request.requestId, requestType: request.requestType, status: nextStatus } }).catch(() => {});

  return request;
}

async function createCatalogEntryFromRequest(request) {
  const requestDoc = typeof request === "object" && request._id ? request : await CatalogRequest.findById(request);
  if (!requestDoc) throw new AppError("Catalog request not found", 404, "NOT_FOUND");
  const payload = requestDoc.payload || {};

  if (requestDoc.requestType === "category") {
    const existing = await Category.findOne({ name: { $regex: `^${escapeRegex(requestDoc.requestedName)}$`, $options: "i" } }).lean();
    if (!existing) {
      await Category.create({ name: requestDoc.requestedName, slug: generateSlug(requestDoc.requestedName), code: requestDoc.requestedName.slice(0, 3).toUpperCase(), isActive: true, order: 0 });
    }
    return { type: "category" };
  }

  if (requestDoc.requestType === "subcategory") {
    const existing = await Subcategory.findOne({ categoryId: requestDoc.categoryId, name: { $regex: `^${escapeRegex(requestDoc.requestedName)}$`, $options: "i" } }).lean();
    if (!existing) {
      await Subcategory.create({ categoryId: requestDoc.categoryId, name: requestDoc.requestedName, code: requestDoc.requestedName.slice(0, 3).toUpperCase(), slug: generateSlug(requestDoc.requestedName) });
    }
    return { type: "subcategory" };
  }

  if (requestDoc.requestType === "attribute") {
    const existing = await Attribute.findOne({
      "appliesTo.categoryId": requestDoc.categoryId,
      "appliesTo.subCategoryId": requestDoc.subCategoryId || null,
      name: { $regex: `^${escapeRegex(requestDoc.requestedName)}$`, $options: "i" },
    }).lean();
    if (!existing) {
      await Attribute.create({
        name: requestDoc.requestedName,
        key: payload.key || generateSlug(requestDoc.requestedName),
        type: payload.type || "text",
        required: Boolean(payload.required),
        options: Array.isArray(payload.options) ? payload.options : [],
        moduleKey: payload.moduleKey || "general",
        group: payload.group || "General",
        appliesTo: {
          categoryId: requestDoc.categoryId,
          subCategoryId: requestDoc.subCategoryId || null,
        },
        useInFilters: Boolean(payload.filterable),
        isVariant: Boolean(payload.variantAttribute),
        isActive: true,
      });
    }
    return { type: "attribute" };
  }

  const existing = await ProductModule.findOne({ name: { $regex: `^${escapeRegex(requestDoc.requestedName)}$`, $options: "i" } }).lean();
  if (!existing) {
    await ProductModule.create({ name: requestDoc.requestedName, key: payload.key || generateSlug(requestDoc.requestedName), fields: [], isActive: true, order: 0 });
  }
  return { type: "product_module" };
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  listCatalogSearch,
  createRequest,
  listVendorRequests,
  listAdminRequests,
  getRequestById,
  cancelRequest,
  reviewRequest,
  createCatalogEntryFromRequest,
  detectDuplicates,
};
