const { isValidObjectId } = require("mongoose");
const { Attribute } = require("../models/Attribute");
const { Category } = require("../models/Category");
const { Subcategory } = require("../models/Subcategory");
const { ProductModule } = require("../models/ProductModule");
const { AppError } = require("../utils/AppError");

function normalizeModuleKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function normalizeAttributePayload(payload = {}) {
  const normalizedOptions = Array.isArray(payload.options)
    ? payload.options
    : Array.isArray(payload.values)
      ? payload.values
      : [];
  return {
    name: String(payload.name || "").trim(),
    key: String(payload.key || "").trim().toLowerCase(),
    type: payload.type || "text",
    required: Boolean(payload.required),
    options: normalizedOptions.map((item) => String(item).trim()).filter(Boolean),
    values: normalizedOptions.map((item) => String(item).trim()).filter(Boolean),
    moduleKey: normalizeModuleKey(payload.moduleKey || payload.group || "general"),
    group: String(payload.group || payload.moduleKey || "General").trim() || "General",
    order: Number.isFinite(Number(payload.order)) ? Number(payload.order) : 0,
    template: String(payload.template || "").trim(),
    isVariant: Boolean(payload.isVariant),
    useInFilters: Boolean(payload.useInFilters),
    variantConfig: {
      displayType: payload.variantConfig?.displayType || "button",
      affectsImage: Boolean(payload.variantConfig?.affectsImage),
    },
    isActive: payload.isActive !== false,
    appliesTo: {
      categoryId: payload.appliesTo?.categoryId || payload.categoryId,
      subCategoryId: payload.appliesTo?.subCategoryId || payload.subCategoryId || null,
    },
  };
}

async function assertModuleExists(moduleKey) {
  const moduleDef = await ProductModule.findOne({ key: moduleKey }).select("_id name key isActive").lean();
  if (!moduleDef) {
    throw new AppError("Module not found", 404, "NOT_FOUND");
  }
  return moduleDef;
}

async function assertCategorySubcategory(appliesTo) {
  const categoryId = appliesTo?.categoryId;
  const subCategoryId = appliesTo?.subCategoryId || null;
  if (!isValidObjectId(categoryId)) {
    throw new AppError("Category is invalid", 400, "VALIDATION_ERROR");
  }
  if (subCategoryId && !isValidObjectId(subCategoryId)) {
    throw new AppError("Subcategory is invalid", 400, "VALIDATION_ERROR");
  }

  const category = await Category.findById(categoryId).select("_id").lean();
  if (!category) throw new AppError("Category not found", 404, "NOT_FOUND");

  if (subCategoryId) {
    const subcategory = await Subcategory.findById(subCategoryId).select("_id categoryId").lean();
    if (!subcategory) throw new AppError("Subcategory not found", 404, "NOT_FOUND");
    if (String(subcategory.categoryId) !== String(categoryId)) {
      throw new AppError("Subcategory does not belong to category", 400, "VALIDATION_ERROR");
    }
  }
}

async function createAttribute(payload) {
  const normalized = normalizeAttributePayload(payload);
  if (!normalized.name || !normalized.key || !normalized.moduleKey) {
    throw new AppError("Attribute name, key, and module are required", 400, "VALIDATION_ERROR");
  }
  const moduleDef = await assertModuleExists(normalized.moduleKey);
  normalized.group = moduleDef.name;
  await assertCategorySubcategory(normalized.appliesTo);
  return await Attribute.create(normalized);
}

async function updateAttribute(attributeId, payload) {
  if (!isValidObjectId(attributeId)) throw new AppError("Attribute is invalid", 400, "VALIDATION_ERROR");
  const current = await Attribute.findById(attributeId);
  if (!current) throw new AppError("Attribute not found", 404, "NOT_FOUND");

  const normalized = normalizeAttributePayload({
    ...current.toObject(),
    ...payload,
    appliesTo: {
      ...(current.appliesTo || {}),
      ...(payload.appliesTo || {}),
      categoryId: payload.appliesTo?.categoryId || current.appliesTo?.categoryId,
      subCategoryId:
        payload.appliesTo?.subCategoryId !== undefined
          ? payload.appliesTo?.subCategoryId || null
          : current.appliesTo?.subCategoryId || null,
    },
  });

  const moduleDef = await assertModuleExists(normalized.moduleKey);
  normalized.group = moduleDef.name;
  await assertCategorySubcategory(normalized.appliesTo);

  Object.assign(current, normalized, { version: (current.version || 1) + 1 });
  await current.save();
  return current;
}

async function deleteAttribute(attributeId) {
  if (!isValidObjectId(attributeId)) throw new AppError("Attribute is invalid", 400, "VALIDATION_ERROR");
  const deleted = await Attribute.findByIdAndDelete(attributeId);
  if (!deleted) throw new AppError("Attribute not found", 404, "NOT_FOUND");
  return deleted;
}

async function listAdminAttributes(filters = {}) {
  const query = {};
  if (filters.categoryId) query["appliesTo.categoryId"] = filters.categoryId;
  if (filters.subCategoryId) query["appliesTo.subCategoryId"] = filters.subCategoryId;
  if (filters.moduleKey) query.moduleKey = normalizeModuleKey(filters.moduleKey);

  return await Attribute.find(query)
    .populate("appliesTo.categoryId", "name")
    .populate("appliesTo.subCategoryId", "name")
    .sort({ moduleKey: 1, order: 1, name: 1 })
    .lean();
}

async function listAttributeDefinitions({ categoryId, subCategoryId, activeOnly = true } = {}) {
  const query = {};
  if (activeOnly) query.isActive = true;

  if (!isValidObjectId(categoryId)) {
    throw new AppError("Category is invalid", 400, "VALIDATION_ERROR");
  }
  query["appliesTo.categoryId"] = categoryId;

  if (subCategoryId && isValidObjectId(subCategoryId)) {
    query.$or = [{ "appliesTo.subCategoryId": subCategoryId }, { "appliesTo.subCategoryId": null }];
  } else {
    query["appliesTo.subCategoryId"] = null;
  }

  return await Attribute.find(query).sort({ moduleKey: 1, order: 1, name: 1 }).lean();
}

async function listAttributesForSelection({ categoryId, subCategoryId }) {
  const [modules, defs] = await Promise.all([
    ProductModule.find({ isActive: true }).sort({ order: 1, name: 1 }).lean(),
    listAttributeDefinitions({ categoryId, subCategoryId, activeOnly: true }),
  ]);

  const grouped = {};
  const groupedByModule = defs.reduce((acc, def) => {
    const moduleKey = def.moduleKey || "general";
    if (!acc[moduleKey]) acc[moduleKey] = [];
    acc[moduleKey].push(def);
    return acc;
  }, {});

  for (const moduleDef of modules) {
    if (!groupedByModule[moduleDef.key]?.length) continue;
    grouped[moduleDef.key] = [...groupedByModule[moduleDef.key]].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)
    );
  }

  for (const [moduleKey, fields] of Object.entries(groupedByModule)) {
    if (grouped[moduleKey]) continue;
    grouped[moduleKey] = [...fields].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)
    );
  }

  return grouped;
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  return null;
}

function ensureInOptions(value, options = []) {
  return options.length === 0 || options.includes(String(value));
}

function normalizeModulePayloadLegacy(defs = [], modulesData = {}, attributes = {}, extraDetails = {}) {
  const next = {};

  for (const def of defs.filter((item) => !item.isVariant)) {
    const moduleKey = def.moduleKey || "general";
    const explicitModuleValue = modulesData?.[moduleKey]?.[def.key];
    const legacyAttributeValue = attributes?.[def.key];
    const rawValue =
      explicitModuleValue !== undefined ? explicitModuleValue : legacyAttributeValue;

    if (rawValue !== undefined) {
      next[moduleKey] = {
        ...(next[moduleKey] || {}),
        [def.key]: rawValue,
      };
    }
  }

  for (const [moduleKey, value] of Object.entries(extraDetails || {})) {
    if (!value || typeof value !== "object") continue;
    next[moduleKey] = {
      ...(next[moduleKey] || {}),
      ...value,
    };
  }

  for (const [moduleKey, value] of Object.entries(modulesData || {})) {
    if (!value || typeof value !== "object") continue;
    next[moduleKey] = {
      ...(next[moduleKey] || {}),
      ...value,
    };
  }

  return next;
}

function normalizeDefinitionValue(def, raw, requireAll = true) {
  if ((raw === undefined || raw === null || raw === "") && def.required && requireAll) {
    throw new AppError(`${def.name} is required`, 400, "VALIDATION_ERROR");
  }
  if (raw === undefined || raw === null || raw === "") return undefined;

  if (def.type === "number") {
    const num = Number(raw);
    if (!Number.isFinite(num)) throw new AppError(`${def.name} must be a number`, 400, "VALIDATION_ERROR");
    return num;
  }

  if (def.type === "boolean") {
    const bool = parseBoolean(raw);
    if (bool === null) throw new AppError(`${def.name} must be true or false`, 400, "VALIDATION_ERROR");
    return bool;
  }

  if (def.type === "multi-select") {
    const values = Array.isArray(raw) ? raw.map((item) => String(item)) : [String(raw)];
    if (!values.length && def.required && requireAll) {
      throw new AppError(`${def.name} is required`, 400, "VALIDATION_ERROR");
    }
    for (const value of values) {
      if (!ensureInOptions(value, def.options)) {
        throw new AppError(`${def.name} has invalid option`, 400, "VALIDATION_ERROR");
      }
    }
    return values;
  }

  const value = String(raw).trim();
  if (!value && def.required && requireAll) {
    throw new AppError(`${def.name} is required`, 400, "VALIDATION_ERROR");
  }
  if (!ensureInOptions(value, def.options)) {
    throw new AppError(`${def.name} has invalid option`, 400, "VALIDATION_ERROR");
  }
  return value;
}

async function validateAndNormalizeModulesData({
  categoryId,
  subCategoryId,
  modulesData = {},
  attributes = {},
  extraDetails = {},
  requireAll = true,
}) {
  const defs = await listAttributeDefinitions({ categoryId, subCategoryId, activeOnly: true });
  const source = normalizeModulePayloadLegacy(defs, modulesData, attributes, extraDetails);
  const normalized = {};

  for (const def of defs.filter((item) => !item.isVariant)) {
    const moduleKey = def.moduleKey || "general";
    const raw = source?.[moduleKey]?.[def.key];
    const value = normalizeDefinitionValue(def, raw, requireAll);
    if (value === undefined) continue;
    normalized[moduleKey] = {
      ...(normalized[moduleKey] || {}),
      [def.key]: value,
    };
  }

  return normalized;
}

async function flattenModulesDataToAttributes({ categoryId, subCategoryId, modulesData = {} }) {
  const defs = await listAttributeDefinitions({ categoryId, subCategoryId, activeOnly: true });
  const flattened = {};

  for (const def of defs.filter((item) => !item.isVariant)) {
    const moduleKey = def.moduleKey || "general";
    const raw = modulesData?.[moduleKey]?.[def.key];
    if (raw === undefined) continue;
    flattened[def.key] = raw;
  }

  return flattened;
}

module.exports = {
  createAttribute,
  updateAttribute,
  deleteAttribute,
  listAdminAttributes,
  listAttributeDefinitions,
  listAttributesForSelection,
  validateAndNormalizeModulesData,
  flattenModulesDataToAttributes,
};
