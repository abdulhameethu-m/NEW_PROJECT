const { isValidObjectId } = require("mongoose");
const { Filter } = require("../models/Filter");
const { Category } = require("../models/Category");
const { Subcategory } = require("../models/Subcategory");
const { AppError } = require("../utils/AppError");

function normalizeOptionList(options = []) {
  return Array.from(
    new Set(
      (Array.isArray(options) ? options : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );
}

function normalizeObjectIdList(values = []) {
  return Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean).map(String)));
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  return null;
}

function toQueryArray(value) {
  if (Array.isArray(value)) return value.flatMap((item) => String(item).split(",")).map((item) => item.trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeFilterPayload(payload = {}) {
  return {
    name: String(payload.name || "").trim(),
    key: String(payload.key || "").trim().toLowerCase(),
    type: String(payload.type || "select").trim().toLowerCase(),
    options: normalizeOptionList(payload.options),
    categoryIds: normalizeObjectIdList(payload.categoryIds),
    subCategoryIds: normalizeObjectIdList(payload.subCategoryIds),
    unit: String(payload.unit || "").trim(),
    placeholder: String(payload.placeholder || "").trim(),
    order: Number.isFinite(Number(payload.order)) ? Number(payload.order) : 0,
    isActive: payload.isActive !== false,
    rangeConfig: {
      min: Number.isFinite(Number(payload.rangeConfig?.min)) ? Number(payload.rangeConfig.min) : 0,
      max: Number.isFinite(Number(payload.rangeConfig?.max)) ? Number(payload.rangeConfig.max) : 100000,
      step: Number.isFinite(Number(payload.rangeConfig?.step)) && Number(payload.rangeConfig.step) > 0 ? Number(payload.rangeConfig.step) : 1,
    },
  };
}

async function assertCategoryMapping(categoryIds = [], subCategoryIds = []) {
  if (!categoryIds.length) {
    throw new AppError("At least one category is required", 400, "VALIDATION_ERROR");
  }

  for (const categoryId of categoryIds) {
    if (!isValidObjectId(categoryId)) {
      throw new AppError("Category is invalid", 400, "VALIDATION_ERROR");
    }
  }

  const categories = await Category.find({ _id: { $in: categoryIds } }).select("_id").lean();
  if (categories.length !== categoryIds.length) {
    throw new AppError("One or more categories were not found", 404, "NOT_FOUND");
  }

  for (const subCategoryId of subCategoryIds) {
    if (!isValidObjectId(subCategoryId)) {
      throw new AppError("Subcategory is invalid", 400, "VALIDATION_ERROR");
    }
  }

  if (!subCategoryIds.length) return;

  const subcategories = await Subcategory.find({ _id: { $in: subCategoryIds } }).select("_id categoryId").lean();
  if (subcategories.length !== subCategoryIds.length) {
    throw new AppError("One or more subcategories were not found", 404, "NOT_FOUND");
  }

  for (const subcategory of subcategories) {
    if (!categoryIds.includes(String(subcategory.categoryId))) {
      throw new AppError("Each subcategory must belong to one of the selected categories", 400, "VALIDATION_ERROR");
    }
  }
}

function ensureFilterConfig(filterDef) {
  if (filterDef.type !== "range" && (!Array.isArray(filterDef.options) || filterDef.options.length === 0)) {
    throw new AppError(`Options are required for ${filterDef.name}`, 400, "VALIDATION_ERROR");
  }

  if (filterDef.type === "range" && filterDef.rangeConfig.min >= filterDef.rangeConfig.max) {
    throw new AppError(`Range max must be greater than min for ${filterDef.name}`, 400, "VALIDATION_ERROR");
  }
}

async function createFilter(payload) {
  const normalized = normalizeFilterPayload(payload);
  if (!normalized.name || !normalized.key || !normalized.type) {
    throw new AppError("Filter name, key, and type are required", 400, "VALIDATION_ERROR");
  }

  ensureFilterConfig(normalized);
  await assertCategoryMapping(normalized.categoryIds, normalized.subCategoryIds);

  const exists = await Filter.findOne({ key: normalized.key });
  if (exists) {
    throw new AppError("A filter with this key already exists", 409, "FILTER_EXISTS");
  }

  return await Filter.create(normalized);
}

async function updateFilter(filterId, payload) {
  if (!isValidObjectId(filterId)) throw new AppError("Filter is invalid", 400, "VALIDATION_ERROR");
  const current = await Filter.findById(filterId);
  if (!current) throw new AppError("Filter not found", 404, "NOT_FOUND");

  const normalized = normalizeFilterPayload({
    ...current.toObject(),
    ...payload,
    categoryIds: payload.categoryIds ?? current.categoryIds,
    subCategoryIds: payload.subCategoryIds ?? current.subCategoryIds,
    rangeConfig: {
      ...(current.rangeConfig?.toObject?.() || current.rangeConfig || {}),
      ...(payload.rangeConfig || {}),
    },
  });

  ensureFilterConfig(normalized);
  await assertCategoryMapping(normalized.categoryIds, normalized.subCategoryIds);

  const duplicate = await Filter.findOne({ key: normalized.key, _id: { $ne: filterId } }).select("_id").lean();
  if (duplicate) throw new AppError("A filter with this key already exists", 409, "FILTER_EXISTS");

  Object.assign(current, normalized);
  await current.save();
  return current;
}

async function deleteFilter(filterId) {
  if (!isValidObjectId(filterId)) throw new AppError("Filter is invalid", 400, "VALIDATION_ERROR");
  const deleted = await Filter.findByIdAndDelete(filterId);
  if (!deleted) throw new AppError("Filter not found", 404, "NOT_FOUND");
  return deleted;
}

async function listAdminFilters(filters = {}) {
  const query = {};
  if (filters.categoryId && isValidObjectId(filters.categoryId)) query.categoryIds = filters.categoryId;
  if (filters.subCategoryId && isValidObjectId(filters.subCategoryId)) query.subCategoryIds = filters.subCategoryId;
  if (filters.isActive !== undefined) {
    const parsed = parseBoolean(filters.isActive);
    if (parsed !== null) query.isActive = parsed;
  }
  if (filters.search) {
    query.$or = [
      { name: { $regex: String(filters.search).trim(), $options: "i" } },
      { key: { $regex: String(filters.search).trim(), $options: "i" } },
    ];
  }

  return await Filter.find(query)
    .populate("categoryIds", "name")
    .populate("subCategoryIds", "name categoryId")
    .sort({ order: 1, name: 1 })
    .lean();
}

async function listFilterDefinitions({ categoryId, subCategoryId, activeOnly = true } = {}) {
  if (!categoryId || !isValidObjectId(categoryId)) {
    return [];
  }

  const query = {
    categoryIds: categoryId,
  };
  if (activeOnly) query.isActive = true;
  if (subCategoryId && isValidObjectId(subCategoryId)) {
    query.$or = [{ subCategoryIds: subCategoryId }, { subCategoryIds: { $size: 0 } }];
  }

  const filters = await Filter.find(query).sort({ order: 1, name: 1 }).lean();

  if (!subCategoryId || !isValidObjectId(subCategoryId)) {
    return filters.filter((item) => !item.subCategoryIds?.length);
  }

  return filters;
}

function getRangeQueryKeys(filterKey) {
  const capitalized = filterKey.charAt(0).toUpperCase() + filterKey.slice(1);
  return {
    minKey: `min${capitalized}`,
    maxKey: `max${capitalized}`,
  };
}

function normalizeSingleFilterValue(filterDef, rawValue, rawQuery = {}, requireAll = false) {
  if (filterDef.type === "range") {
    const { minKey, maxKey } = getRangeQueryKeys(filterDef.key);
    const min = rawQuery[minKey] !== undefined ? Number(rawQuery[minKey]) : rawValue !== undefined && rawValue !== "" ? Number(rawValue) : undefined;
    const max = rawQuery[maxKey] !== undefined ? Number(rawQuery[maxKey]) : undefined;

    if (min === undefined && max === undefined) {
      if (requireAll) throw new AppError(`${filterDef.name} is required`, 400, "VALIDATION_ERROR");
      return undefined;
    }

    const normalized = {};
    if (min !== undefined) {
      if (!Number.isFinite(min)) throw new AppError(`${filterDef.name} minimum is invalid`, 400, "VALIDATION_ERROR");
      normalized.min = min;
    }
    if (max !== undefined) {
      if (!Number.isFinite(max)) throw new AppError(`${filterDef.name} maximum is invalid`, 400, "VALIDATION_ERROR");
      normalized.max = max;
    }
    return normalized;
  }

  if (filterDef.type === "checkbox") {
    const values = toQueryArray(rawValue);
    if (!values.length) {
      if (requireAll) throw new AppError(`${filterDef.name} is required`, 400, "VALIDATION_ERROR");
      return undefined;
    }
    for (const value of values) {
      if (filterDef.options?.length && !filterDef.options.includes(value)) {
        throw new AppError(`${filterDef.name} has an invalid option`, 400, "VALIDATION_ERROR");
      }
    }
    return values;
  }

  const value = String(rawValue ?? "").trim();
  if (!value) {
    if (requireAll) throw new AppError(`${filterDef.name} is required`, 400, "VALIDATION_ERROR");
    return undefined;
  }
  if (filterDef.options?.length && !filterDef.options.includes(value)) {
    throw new AppError(`${filterDef.name} has an invalid option`, 400, "VALIDATION_ERROR");
  }
  return value;
}

async function validateAndNormalizeFilterAttributes({
  categoryId,
  subCategoryId,
  attributes = {},
  requireAll = false,
}) {
  const defs = await listFilterDefinitions({ categoryId, subCategoryId, activeOnly: true });
  const normalized = {};

  for (const def of defs) {
    if (BUILT_IN_PRODUCT_FILTER_KEYS.has(def.key)) continue;
    const value = normalizeSingleFilterValue(def, attributes?.[def.key], {}, requireAll && def.required);
    if (value !== undefined) normalized[def.key] = value;
  }

  return normalized;
}

async function normalizeFilterQuery({ categoryId, subCategoryId, query = {} }) {
  const defs = await listFilterDefinitions({ categoryId, subCategoryId, activeOnly: true });
  const attributeFilters = {};

  for (const def of defs) {
    const rawValue = query?.[def.key];
    const normalized = normalizeSingleFilterValue(def, rawValue, query, false);
    if (normalized !== undefined) {
      attributeFilters[def.key] = normalized;
    }
  }

  return {
    filterDefs: defs,
    attributeFilters,
  };
}

module.exports = {
  BUILT_IN_PRODUCT_FILTER_KEYS,
  createFilter,
  updateFilter,
  deleteFilter,
  listAdminFilters,
  listFilterDefinitions,
  validateAndNormalizeFilterAttributes,
  normalizeFilterQuery,
  getRangeQueryKeys,
};
const BUILT_IN_PRODUCT_FILTER_KEYS = new Set(["price", "rating"]);
