const { isValidObjectId } = require("mongoose");
const { AppError } = require("../utils/AppError");
const { listAttributeDefinitions } = require("./attribute.service");

const BUILT_IN_FILTERS = [
  {
    key: "price",
    name: "Price",
    type: "range",
    source: "built_in",
    isVariant: false,
    group: "General",
    order: -1000,
    options: [],
    rangeConfig: {
      min: 0,
      max: 100000,
      step: 100,
    },
  },
];

function toQueryArray(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(","))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  return null;
}

function getRangeQueryKeys(filterKey) {
  const capitalized = filterKey.charAt(0).toUpperCase() + filterKey.slice(1);
  return {
    minKey: `min${capitalized}`,
    maxKey: `max${capitalized}`,
  };
}

function mapAttributeToFilterDefinition(def = {}) {
  const isRange = def.type === "number";

  return {
    key: def.key,
    name: def.name,
    type: isRange ? "range" : "checkbox",
    source: "attribute",
    attributeType: def.type,
    isVariant: Boolean(def.isVariant),
    required: Boolean(def.required),
    group: def.group || "General",
    order: Number(def.order || 0),
    options: Array.isArray(def.options) ? def.options.map((item) => String(item).trim()).filter(Boolean) : [],
    rangeConfig: isRange
      ? {
          min: 0,
          max: 100000,
          step: 1,
        }
      : undefined,
  };
}

function normalizeDiscreteFilterValue(filterDef, rawValue) {
  const values = toQueryArray(rawValue);
  if (!values.length) return undefined;

  if (filterDef.attributeType === "boolean") {
    const normalized = values
      .map((value) => parseBoolean(value))
      .filter((value) => value !== null);
    return normalized.length ? Array.from(new Set(normalized)) : undefined;
  }

  if (filterDef.attributeType === "number") {
    const normalized = values
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    return normalized.length ? Array.from(new Set(normalized)) : undefined;
  }

  const normalized = values.map((value) => String(value).trim()).filter(Boolean);
  return normalized.length ? Array.from(new Set(normalized)) : undefined;
}

function normalizeRangeFilterValue(filterDef, rawQuery = {}) {
  const { minKey, maxKey } = getRangeQueryKeys(filterDef.key);
  const min = rawQuery[minKey] !== undefined && rawQuery[minKey] !== "" ? Number(rawQuery[minKey]) : undefined;
  const max = rawQuery[maxKey] !== undefined && rawQuery[maxKey] !== "" ? Number(rawQuery[maxKey]) : undefined;

  if (min === undefined && max === undefined) return undefined;
  if (min !== undefined && !Number.isFinite(min)) {
    throw new AppError(`${filterDef.name} minimum is invalid`, 400, "VALIDATION_ERROR");
  }
  if (max !== undefined && !Number.isFinite(max)) {
    throw new AppError(`${filterDef.name} maximum is invalid`, 400, "VALIDATION_ERROR");
  }

  return {
    ...(min !== undefined ? { min } : {}),
    ...(max !== undefined ? { max } : {}),
  };
}

function normalizeSingleAttributeValue(filterDef, rawValue, requireAll = false) {
  if (filterDef.type === "range") {
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      if (requireAll) throw new AppError(`${filterDef.name} is required`, 400, "VALIDATION_ERROR");
      return undefined;
    }

    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      throw new AppError(`${filterDef.name} must be a valid number`, 400, "VALIDATION_ERROR");
    }
    return value;
  }

  const values = Array.isArray(rawValue)
    ? rawValue.map((item) => String(item).trim()).filter(Boolean)
    : rawValue === undefined || rawValue === null || rawValue === ""
      ? []
      : [String(rawValue).trim()].filter(Boolean);

  if (!values.length) {
    if (requireAll) throw new AppError(`${filterDef.name} is required`, 400, "VALIDATION_ERROR");
    return undefined;
  }

  if (filterDef.attributeType === "boolean") {
    const bool = parseBoolean(values[0]);
    if (bool === null) {
      throw new AppError(`${filterDef.name} must be true or false`, 400, "VALIDATION_ERROR");
    }
    return bool;
  }

  if (filterDef.attributeType === "number") {
    const num = Number(values[0]);
    if (!Number.isFinite(num)) {
      throw new AppError(`${filterDef.name} must be a valid number`, 400, "VALIDATION_ERROR");
    }
    return num;
  }

  if (filterDef.options?.length) {
    for (const value of values) {
      if (!filterDef.options.includes(value)) {
        throw new AppError(`${filterDef.name} has an invalid option`, 400, "VALIDATION_ERROR");
      }
    }
  }

  return values.length === 1 ? values[0] : values;
}

async function listDynamicProductFilterDefinitions({ categoryId, subCategoryId } = {}) {
  if (!categoryId || !isValidObjectId(categoryId)) {
    return BUILT_IN_FILTERS;
  }

  const definitions = await listAttributeDefinitions({
    categoryId,
    subCategoryId,
    activeOnly: true,
  });

  const dynamicDefs = definitions
    .filter((def) => def?.key && def.useInFilters)
    .map(mapAttributeToFilterDefinition)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));

  return [...BUILT_IN_FILTERS, ...dynamicDefs];
}

async function normalizeDynamicFilterQuery({ categoryId, subCategoryId, query = {} } = {}) {
  const filterDefs = await listDynamicProductFilterDefinitions({ categoryId, subCategoryId });
  const attributeFilters = {};
  const filterDefMap = Object.fromEntries(filterDefs.map((item) => [item.key, item]));

  for (const filterDef of filterDefs) {
    if (filterDef.key === "price") continue;

    if (filterDef.type === "range") {
      const value = normalizeRangeFilterValue(filterDef, query);
      if (value !== undefined) {
        attributeFilters[filterDef.key] = value;
      }
      continue;
    }

    const value = normalizeDiscreteFilterValue(filterDef, query[filterDef.key]);
    if (value !== undefined) {
      attributeFilters[filterDef.key] = value;
    }
  }

  return {
    filterDefs,
    filterDefMap,
    attributeFilters,
  };
}

async function validateAndNormalizeFilterAttributes({
  categoryId,
  subCategoryId,
  attributes = {},
  requireAll = false,
} = {}) {
  const defs = await listDynamicProductFilterDefinitions({ categoryId, subCategoryId });
  const normalized = {};

  for (const def of defs) {
    if (def.key === "price") continue;
    const value = normalizeSingleAttributeValue(def, attributes?.[def.key], requireAll && Boolean(def.required));
    if (value !== undefined) {
      normalized[def.key] = value;
    }
  }

  return normalized;
}

module.exports = {
  BUILT_IN_FILTERS,
  getRangeQueryKeys,
  listDynamicProductFilterDefinitions,
  normalizeDynamicFilterQuery,
  validateAndNormalizeFilterAttributes,
};
