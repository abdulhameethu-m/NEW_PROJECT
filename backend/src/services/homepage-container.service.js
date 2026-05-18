const mongoose = require("mongoose");
const { HomepageContainer } = require("../models/HomepageContainer");
const { Product } = require("../models/Product");
const { Vendor } = require("../models/Vendor");
const { Category } = require("../models/Category");
const { Subcategory } = require("../models/Subcategory");
const { AppError } = require("../utils/AppError");

const DEFAULT_PREVIEW_LIMIT = 12;

function toObjectIdArray(values = []) {
  return (Array.isArray(values) ? values : [])
    .map((item) => String(item || "").trim())
    .filter((item) => mongoose.isValidObjectId(item))
    .map((item) => new mongoose.Types.ObjectId(item));
}

function toStringArray(values = []) {
  return (Array.isArray(values) ? values : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePositiveNumber(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function normalizePayload(payload = {}, actorId = null, { partial = false } = {}) {
  const normalized = {
    ...(payload.title !== undefined ? { title: String(payload.title || "").trim() } : {}),
    ...(payload.slug !== undefined ? { slug: String(payload.slug || "").trim() } : {}),
    ...(payload.description !== undefined ? { description: String(payload.description || "").trim() } : {}),
    ...(payload.bannerImage !== undefined ? { bannerImage: String(payload.bannerImage || "").trim() } : {}),
    ...(payload.containerType !== undefined ? { containerType: String(payload.containerType || "").trim().toUpperCase() } : {}),
    ...(payload.vendorMode !== undefined ? { vendorMode: String(payload.vendorMode || "").trim().toUpperCase() } : {}),
    ...(payload.vendorIds !== undefined ? { vendorIds: toObjectIdArray(payload.vendorIds) } : {}),
    ...(payload.categoryIds !== undefined ? { categoryIds: toObjectIdArray(payload.categoryIds) } : {}),
    ...(payload.subCategoryIds !== undefined ? { subCategoryIds: toObjectIdArray(payload.subCategoryIds) } : {}),
    ...(payload.brandIds !== undefined ? { brandIds: toStringArray(payload.brandIds) } : {}),
    ...(payload.tags !== undefined ? { tags: toStringArray(payload.tags).map((item) => item.toLowerCase()) } : {}),
    ...(payload.offerType !== undefined ? { offerType: String(payload.offerType || "").trim().toUpperCase() } : {}),
    ...(payload.minDiscountPercentage !== undefined
      ? { minDiscountPercentage: normalizePositiveNumber(payload.minDiscountPercentage, 0) }
      : {}),
    ...(payload.maxDiscountPercentage !== undefined
      ? { maxDiscountPercentage: normalizePositiveNumber(payload.maxDiscountPercentage, null) }
      : {}),
    ...(payload.minPrice !== undefined ? { minPrice: normalizePositiveNumber(payload.minPrice, null) } : {}),
    ...(payload.maxPrice !== undefined ? { maxPrice: normalizePositiveNumber(payload.maxPrice, null) } : {}),
    ...(payload.sortBy !== undefined ? { sortBy: String(payload.sortBy || "").trim().toUpperCase() } : {}),
    ...(payload.productSelectionMode !== undefined
      ? { productSelectionMode: String(payload.productSelectionMode || "").trim().toUpperCase() }
      : {}),
    ...(payload.manualProductIds !== undefined ? { manualProductIds: toObjectIdArray(payload.manualProductIds) } : {}),
    ...(payload.maxProductsToShow !== undefined
      ? { maxProductsToShow: Math.min(Math.max(Number(payload.maxProductsToShow || DEFAULT_PREVIEW_LIMIT), 1), 100) }
      : {}),
    ...(payload.showOnlyInStock !== undefined ? { showOnlyInStock: Boolean(payload.showOnlyInStock) } : {}),
    ...(payload.showOnlyActiveProducts !== undefined ? { showOnlyActiveProducts: Boolean(payload.showOnlyActiveProducts) } : {}),
    ...(payload.deviceVisibility !== undefined
      ? { deviceVisibility: String(payload.deviceVisibility || "").trim().toUpperCase() }
      : {}),
    ...(payload.priority !== undefined ? { priority: Number(payload.priority || 0) } : {}),
    ...(payload.scheduleEnabled !== undefined ? { scheduleEnabled: Boolean(payload.scheduleEnabled) } : {}),
    ...(payload.startDate !== undefined ? { startDate: payload.startDate ? new Date(payload.startDate) : null } : {}),
    ...(payload.endDate !== undefined ? { endDate: payload.endDate ? new Date(payload.endDate) : null } : {}),
    ...(payload.analyticsEnabled !== undefined ? { analyticsEnabled: Boolean(payload.analyticsEnabled) } : {}),
    ...(payload.status !== undefined ? { status: String(payload.status || "").trim().toUpperCase() } : {}),
  };

  if (!partial && actorId) {
    normalized.createdBy = actorId;
  }
  if (actorId) {
    normalized.updatedBy = actorId;
  }

  return normalized;
}

async function validateReferences(payload = {}, existingId = null) {
  const [vendors, categories, subcategories, manualProducts, slugConflict] = await Promise.all([
    payload.vendorIds?.length
      ? Vendor.find({ _id: { $in: payload.vendorIds }, status: "approved" }).select("_id").lean()
      : Promise.resolve([]),
    payload.categoryIds?.length
      ? Category.find({ _id: { $in: payload.categoryIds }, isActive: true }).select("_id").lean()
      : Promise.resolve([]),
    payload.subCategoryIds?.length
      ? Subcategory.find({ _id: { $in: payload.subCategoryIds }, status: "active" }).select("_id categoryId").lean()
      : Promise.resolve([]),
    payload.manualProductIds?.length
      ? Product.find({
          _id: { $in: payload.manualProductIds },
          status: "APPROVED",
          isActive: true,
        })
          .select("_id sellerId categoryId subCategoryId")
          .lean()
      : Promise.resolve([]),
    payload.slug
      ? HomepageContainer.findOne({
          slug: payload.slug,
          ...(existingId ? { _id: { $ne: existingId } } : {}),
        })
          .select("_id")
          .lean()
      : Promise.resolve(null),
  ]);

  if (slugConflict) {
    throw new AppError("Homepage container slug already exists", 409, "SLUG_EXISTS");
  }

  if (payload.vendorMode === "SPECIFIC_VENDORS" && payload.vendorIds?.length && vendors.length !== payload.vendorIds.length) {
    throw new AppError("One or more selected vendors are invalid or not approved", 400, "INVALID_VENDOR_SCOPE");
  }

  if (payload.categoryIds?.length && categories.length !== payload.categoryIds.length) {
    throw new AppError("One or more selected categories are invalid", 400, "INVALID_CATEGORY_SCOPE");
  }

  if (payload.subCategoryIds?.length && subcategories.length !== payload.subCategoryIds.length) {
    throw new AppError("One or more selected subcategories are invalid", 400, "INVALID_SUBCATEGORY_SCOPE");
  }

  const categorySet = new Set((payload.categoryIds || []).map((item) => String(item)));
  if (categorySet.size && subcategories.some((item) => !categorySet.has(String(item.categoryId)))) {
    throw new AppError("Selected subcategories must belong to the selected categories", 400, "SUBCATEGORY_CATEGORY_MISMATCH");
  }

  if (payload.productSelectionMode === "MANUAL" && payload.manualProductIds?.length) {
    if (manualProducts.length !== payload.manualProductIds.length) {
      throw new AppError("One or more manual products are invalid or not publicly visible", 400, "INVALID_MANUAL_PRODUCTS");
    }

    const vendorSet = new Set((payload.vendorIds || []).map((item) => String(item)));
    const subCategorySet = new Set((payload.subCategoryIds || []).map((item) => String(item)));

    for (const product of manualProducts) {
      if (payload.vendorMode === "SPECIFIC_VENDORS" && vendorSet.size && !vendorSet.has(String(product.sellerId))) {
        throw new AppError("Manual products must belong to the selected vendors", 400, "MANUAL_VENDOR_MISMATCH");
      }
      if (categorySet.size && !categorySet.has(String(product.categoryId))) {
        throw new AppError("Manual products must belong to the selected categories", 400, "MANUAL_CATEGORY_MISMATCH");
      }
      if (subCategorySet.size && !subCategorySet.has(String(product.subCategoryId))) {
        throw new AppError("Manual products must belong to the selected subcategories", 400, "MANUAL_SUBCATEGORY_MISMATCH");
      }
    }
  }
}

function matchesSchedule(container = {}, now = new Date()) {
  if (container.status !== "ACTIVE") return false;
  if (!container.scheduleEnabled) return true;
  if (container.startDate && new Date(container.startDate) > now) return false;
  if (container.endDate && new Date(container.endDate) < now) return false;
  return true;
}

function matchesDevice(container = {}, device = "all") {
  const normalized = String(device || "all").trim().toLowerCase();
  if (!normalized || normalized === "all") return true;
  if (container.deviceVisibility === "ALL") return true;
  if (normalized === "mobile") return container.deviceVisibility === "MOBILE_ONLY";
  if (normalized === "desktop") return container.deviceVisibility === "DESKTOP_ONLY";
  return true;
}

function buildProductBaseMatch(container = {}, approvedVendorIds = []) {
  const match = {
    status: "APPROVED",
    ...(container.showOnlyActiveProducts !== false ? { isActive: true } : {}),
  };

  if (container.vendorMode === "SPECIFIC_VENDORS" && container.vendorIds?.length) {
    match.sellerId = { $in: container.vendorIds.map((item) => new mongoose.Types.ObjectId(item)) };
  } else if (approvedVendorIds.length) {
    match.sellerId = { $in: approvedVendorIds };
  }

  if (container.categoryIds?.length) {
    match.categoryId = { $in: container.categoryIds.map((item) => new mongoose.Types.ObjectId(item)) };
  }

  if (container.subCategoryIds?.length) {
    match.subCategoryId = { $in: container.subCategoryIds.map((item) => new mongoose.Types.ObjectId(item)) };
  }

  if (container.tags?.length) {
    match.tags = { $in: container.tags.map((item) => String(item).toLowerCase()) };
  }

  if (container.productSelectionMode === "MANUAL" && container.manualProductIds?.length) {
    match._id = { $in: container.manualProductIds.map((item) => new mongoose.Types.ObjectId(item)) };
  }

  if (container.brandIds?.length) {
    const brandRegex = container.brandIds.map((item) => new RegExp(`^${escapeRegex(item)}$`, "i"));
    match.$or = [
      { "attributes.brand": { $in: brandRegex } },
      { brand: { $in: brandRegex } },
      { name: { $in: brandRegex } },
    ];
  }

  return match;
}

function buildComputedFields() {
  return {
    availableStock: {
      $cond: [
        { $gt: [{ $size: { $ifNull: ["$variants", []] } }, 0] },
        {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: { $ifNull: ["$variants", []] },
                  as: "variant",
                  cond: { $ne: ["$$variant.isActive", false] },
                },
              },
              as: "variant",
              in: { $max: [0, { $subtract: [{ $ifNull: ["$$variant.stock", 0] }, { $ifNull: ["$$variant.reservedStock", 0] }] }] },
            },
          },
        },
        { $max: [0, { $subtract: [{ $ifNull: ["$stock", 0] }, 0] }] },
      ],
    },
    effectivePrice: {
      $cond: [
        {
          $and: [
            { $ne: ["$discountPrice", null] },
            { $gt: ["$discountPrice", 0] },
            { $lt: ["$discountPrice", "$price"] },
          ],
        },
        "$discountPrice",
        "$price",
      ],
    },
    computedDiscountPercentage: {
      $cond: [
        {
          $and: [
            { $gt: ["$price", 0] },
            { $ne: ["$discountPrice", null] },
            { $gt: ["$discountPrice", 0] },
            { $lt: ["$discountPrice", "$price"] },
          ],
        },
        {
          $multiply: [
            {
              $divide: [
                { $subtract: ["$price", "$discountPrice"] },
                "$price",
              ],
            },
            100,
          ],
        },
        0,
      ],
    },
  };
}

function buildSortStages(sortBy = "TRENDING") {
  switch (sortBy) {
    case "BEST_SELLING":
      return [{ $sort: { "analytics.salesCount": -1, createdAt: -1 } }];
    case "HIGHEST_DISCOUNT":
      return [{ $sort: { computedDiscountPercentage: -1, createdAt: -1 } }];
    case "NEWEST":
      return [{ $sort: { createdAt: -1 } }];
    case "PRICE_LOW_TO_HIGH":
      return [{ $sort: { effectivePrice: 1, createdAt: -1 } }];
    case "PRICE_HIGH_TO_LOW":
      return [{ $sort: { effectivePrice: -1, createdAt: -1 } }];
    case "MOST_VIEWED":
      return [{ $sort: { "analytics.views": -1, createdAt: -1 } }];
    case "RANDOM":
      return [{ $sample: { size: 100 } }];
    case "TRENDING":
    default:
      return [{ $sort: { "analytics.views": -1, "analytics.salesCount": -1, createdAt: -1 } }];
  }
}

async function hydrateProductsByIds(ids = []) {
  if (!ids.length) return [];
  const products = await Product.find({ _id: { $in: ids } })
    .populate("sellerId", "companyName shopName logoUrl storeSlug")
    .lean();
  const orderMap = new Map(ids.map((id, index) => [String(id), index]));
  return products.sort((a, b) => orderMap.get(String(a._id)) - orderMap.get(String(b._id)));
}

async function getApprovedVendorIds() {
  const vendors = await Vendor.find({ status: "approved" }).select("_id").lean();
  return vendors.map((vendor) => new mongoose.Types.ObjectId(vendor._id));
}

async function resolveContainerProducts(container, options = {}) {
  const page = Math.max(Number(options.page || 1), 1);
  const limit = Math.min(Math.max(Number(options.limit || container.maxProductsToShow || DEFAULT_PREVIEW_LIMIT), 1), 100);
  const skip = (page - 1) * limit;
  const approvedVendorIds = options.approvedVendorIds || (await getApprovedVendorIds());

  const pipeline = [
    { $match: buildProductBaseMatch(container, approvedVendorIds) },
    { $addFields: buildComputedFields() },
  ];

  const expressionMatch = {};
  if (container.showOnlyInStock !== false) {
    expressionMatch.availableStock = { $gt: 0 };
  }
  if (container.minDiscountPercentage) {
    expressionMatch.computedDiscountPercentage = {
      ...(expressionMatch.computedDiscountPercentage || {}),
      $gte: Number(container.minDiscountPercentage || 0),
    };
  }
  if (container.maxDiscountPercentage !== null && container.maxDiscountPercentage !== undefined) {
    expressionMatch.computedDiscountPercentage = {
      ...(expressionMatch.computedDiscountPercentage || {}),
      $lte: Number(container.maxDiscountPercentage),
    };
  }
  if (container.minPrice !== null && container.minPrice !== undefined) {
    expressionMatch.effectivePrice = {
      ...(expressionMatch.effectivePrice || {}),
      $gte: Number(container.minPrice),
    };
  }
  if (container.maxPrice !== null && container.maxPrice !== undefined) {
    expressionMatch.effectivePrice = {
      ...(expressionMatch.effectivePrice || {}),
      $lte: Number(container.maxPrice),
    };
  }
  if (Object.keys(expressionMatch).length) {
    pipeline.push({ $match: expressionMatch });
  }

  pipeline.push(...buildSortStages(container.sortBy));

  const countPipeline = pipeline
    .filter((stage) => !stage.$sample && !stage.$sort)
    .concat({ $count: "total" });

  pipeline.push(
    { $skip: skip },
    { $limit: limit },
    { $project: { _id: 1 } }
  );

  const [rows, totalRows] = await Promise.all([
    Product.aggregate(pipeline),
    Product.aggregate(countPipeline),
  ]);

  const ids = rows.map((item) => item._id);
  const products = await hydrateProductsByIds(ids);
  const total = Number(totalRows?.[0]?.total || 0);

  return {
    products,
    pagination: {
      total,
      page,
      limit,
      pages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

function mapContainerDocument(container, productsPayload = null) {
  const mapped = {
    _id: container._id,
    title: container.title,
    slug: container.slug,
    description: container.description,
    bannerImage: container.bannerImage,
    containerType: container.containerType,
    vendorMode: container.vendorMode,
    vendorIds: container.vendorIds || [],
    categoryIds: container.categoryIds || [],
    subCategoryIds: container.subCategoryIds || [],
    brandIds: container.brandIds || [],
    tags: container.tags || [],
    offerType: container.offerType,
    minDiscountPercentage: container.minDiscountPercentage,
    maxDiscountPercentage: container.maxDiscountPercentage,
    minPrice: container.minPrice,
    maxPrice: container.maxPrice,
    sortBy: container.sortBy,
    productSelectionMode: container.productSelectionMode,
    manualProductIds: container.manualProductIds || [],
    maxProductsToShow: container.maxProductsToShow,
    showOnlyInStock: container.showOnlyInStock,
    showOnlyActiveProducts: container.showOnlyActiveProducts,
    deviceVisibility: container.deviceVisibility,
    priority: container.priority,
    scheduleEnabled: container.scheduleEnabled,
    startDate: container.startDate,
    endDate: container.endDate,
    analyticsEnabled: container.analyticsEnabled,
    status: container.status,
    metrics: container.metrics || { impressions: 0, clicks: 0, orders: 0, revenue: 0 },
    createdAt: container.createdAt,
    updatedAt: container.updatedAt,
  };

  if (productsPayload) {
    mapped.products = productsPayload.products;
    mapped.productPagination = productsPayload.pagination;
  }

  return mapped;
}

class HomepageContainerService {
  async listAdminContainers({ page = 1, limit = 20, search = "", status = "", deviceVisibility = "" } = {}) {
    const query = {};
    if (status) query.status = String(status).trim().toUpperCase();
    if (deviceVisibility) query.deviceVisibility = String(deviceVisibility).trim().toUpperCase();
    if (search) {
      query.$or = [
        { title: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
        { slug: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }

    const safePage = Math.max(Number(page || 1), 1);
    const safeLimit = Math.min(Math.max(Number(limit || 20), 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const [containers, total] = await Promise.all([
      HomepageContainer.find(query)
        .sort({ priority: 1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate("vendorIds", "companyName shopName")
        .populate("categoryIds", "name")
        .populate("subCategoryIds", "name")
        .lean(),
      HomepageContainer.countDocuments(query),
    ]);

    return {
      containers: containers.map((item) => mapContainerDocument(item)),
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        pages: Math.max(Math.ceil(total / safeLimit), 1),
      },
    };
  }

  async getContainerById(id) {
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError("Invalid homepage container id", 400, "INVALID_ID");
    }
    const container = await HomepageContainer.findById(id)
      .populate("vendorIds", "companyName shopName")
      .populate("categoryIds", "name")
      .populate("subCategoryIds", "name")
      .lean();
    if (!container) {
      throw new AppError("Homepage container not found", 404, "NOT_FOUND");
    }
    return mapContainerDocument(container);
  }

  async createContainer(payload = {}, actorId) {
    const normalized = normalizePayload(payload, actorId);
    await validateReferences(normalized);
    const created = await HomepageContainer.create(normalized);
    return await this.getContainerById(created._id);
  }

  async updateContainer(id, payload = {}, actorId) {
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError("Invalid homepage container id", 400, "INVALID_ID");
    }
    const existing = await HomepageContainer.findById(id).lean();
    if (!existing) {
      throw new AppError("Homepage container not found", 404, "NOT_FOUND");
    }
    const normalized = normalizePayload(payload, actorId, { partial: true });
    const merged = { ...existing, ...normalized };
    await validateReferences(merged, id);

    await HomepageContainer.findByIdAndUpdate(id, { $set: normalized }, { new: false, runValidators: true });
    return await this.getContainerById(id);
  }

  async deleteContainer(id) {
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError("Invalid homepage container id", 400, "INVALID_ID");
    }
    const deleted = await HomepageContainer.findByIdAndDelete(id).lean();
    if (!deleted) {
      throw new AppError("Homepage container not found", 404, "NOT_FOUND");
    }
    return { _id: deleted._id };
  }

  async reorderContainers(items = [], actorId = null) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError("At least one container reorder item is required", 400, "VALIDATION_ERROR");
    }
    const bulkOps = items
      .filter((item) => mongoose.isValidObjectId(item.id))
      .map((item) => ({
        updateOne: {
          filter: { _id: item.id },
          update: {
            $set: {
              priority: Number(item.priority || 0),
              ...(actorId ? { updatedBy: actorId } : {}),
            },
          },
        },
      }));

    if (!bulkOps.length) {
      throw new AppError("No valid homepage containers were provided for reordering", 400, "VALIDATION_ERROR");
    }

    await HomepageContainer.bulkWrite(bulkOps);
    return { updated: bulkOps.length };
  }

  async previewContainer(payload = {}) {
    const normalized = normalizePayload(payload, null, { partial: true });
    await validateReferences(normalized);
    return await resolveContainerProducts(
      {
        ...normalized,
        status: normalized.status || "ACTIVE",
        maxProductsToShow: normalized.maxProductsToShow || DEFAULT_PREVIEW_LIMIT,
        showOnlyActiveProducts: normalized.showOnlyActiveProducts !== false,
        showOnlyInStock: normalized.showOnlyInStock !== false,
      },
      { page: 1, limit: normalized.maxProductsToShow || DEFAULT_PREVIEW_LIMIT }
    );
  }

  async listPublicContainers({ device = "all", includeProducts = true, page = 1, limit } = {}) {
    const now = new Date();
    const containers = await HomepageContainer.find({
      status: "ACTIVE",
      $or: [
        { scheduleEnabled: false },
        {
          scheduleEnabled: true,
          $and: [
            {
              $or: [{ startDate: null }, { startDate: { $lte: now } }],
            },
            {
              $or: [{ endDate: null }, { endDate: { $gte: now } }],
            },
          ],
        },
      ],
    })
      .sort({ priority: 1, createdAt: -1 })
      .lean();

    const visible = containers.filter((container) => matchesSchedule(container, now) && matchesDevice(container, device));
    if (!includeProducts) {
      return visible.map((item) => mapContainerDocument(item));
    }

    const approvedVendorIds = await getApprovedVendorIds();

    const resolved = await Promise.all(
      visible.map(async (container) => {
        const productsPayload = await resolveContainerProducts(container, {
          page,
          limit: limit || container.maxProductsToShow || DEFAULT_PREVIEW_LIMIT,
          approvedVendorIds,
        });
        return mapContainerDocument(container, productsPayload);
      })
    );

    return resolved.filter((item) => Array.isArray(item.products) && item.products.length > 0);
  }

  async getContainerProductsBySlug(slug, { page = 1, limit = 24, device = "all" } = {}) {
    const container = await HomepageContainer.findOne({ slug: String(slug || "").trim().toLowerCase() }).lean();
    if (!container) {
      throw new AppError("Homepage container not found", 404, "NOT_FOUND");
    }
    if (!matchesSchedule(container) || !matchesDevice(container, device) || container.status !== "ACTIVE") {
      throw new AppError("Homepage container is not currently available", 404, "CONTAINER_INACTIVE");
    }

    const productsPayload = await resolveContainerProducts(container, { page, limit });
    return {
      container: mapContainerDocument(container),
      ...productsPayload,
    };
  }
}

module.exports = new HomepageContainerService();
