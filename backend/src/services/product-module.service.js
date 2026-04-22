const { isValidObjectId } = require("mongoose");
const { ProductModule } = require("../models/ProductModule");
const { AppError } = require("../utils/AppError");

const DEFAULT_PRODUCT_MODULES = [
  { name: "Specifications", key: "specifications", order: 1 },
  { name: "Warranty", key: "warranty", order: 2 },
  { name: "Manufacturing", key: "manufacturing", order: 3 },
];

function normalizeField(field = {}) {
  return {
    name: String(field.name || "").trim(),
    key: String(field.key || "").trim().toLowerCase(),
    type: field.type || "text",
    required: Boolean(field.required),
    options: Array.isArray(field.options)
      ? field.options.map((item) => String(item).trim()).filter(Boolean)
      : [],
    helpText: String(field.helpText || "").trim(),
    order: Number.isFinite(Number(field.order)) ? Number(field.order) : 0,
  };
}

function normalizeModulePayload(payload = {}) {
  return {
    name: String(payload.name || "").trim(),
    key: String(payload.key || "").trim().toLowerCase(),
    fields: Array.isArray(payload.fields) ? payload.fields.map(normalizeField) : [],
    order: Number.isFinite(Number(payload.order)) ? Number(payload.order) : 0,
    isActive: payload.isActive !== false,
  };
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  return null;
}

function validateFieldValue(field, raw) {
  if ((raw === undefined || raw === null || raw === "") && field.required) {
    throw new AppError(`${field.name} is required`, 400, "VALIDATION_ERROR");
  }

  if (raw === undefined || raw === null || raw === "") return undefined;

  if (field.type === "number") {
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) throw new AppError(`${field.name} must be a number`, 400, "VALIDATION_ERROR");
    return numeric;
  }

  if (field.type === "boolean") {
    const bool = parseBoolean(raw);
    if (bool === null) throw new AppError(`${field.name} must be true or false`, 400, "VALIDATION_ERROR");
    return bool;
  }

  if (field.type === "multi-select") {
    const values = Array.isArray(raw) ? raw.map((item) => String(item).trim()).filter(Boolean) : [];
    for (const value of values) {
      if (Array.isArray(field.options) && field.options.length && !field.options.includes(value)) {
        throw new AppError(`${field.name} has an invalid option`, 400, "VALIDATION_ERROR");
      }
    }
    return values;
  }

  const value = String(raw).trim();
  if (Array.isArray(field.options) && field.options.length && !field.options.includes(value)) {
    throw new AppError(`${field.name} has an invalid option`, 400, "VALIDATION_ERROR");
  }
  return value;
}

async function listProductModules({ activeOnly = false } = {}) {
  await Promise.all(
    DEFAULT_PRODUCT_MODULES.map((moduleDef) =>
      ProductModule.updateOne(
        { key: moduleDef.key },
        {
          $setOnInsert: {
            ...moduleDef,
            isActive: true,
            fields: [],
          },
        },
        { upsert: true }
      )
    )
  );

  const query = activeOnly ? { isActive: true } : {};
  return await ProductModule.find(query).sort({ order: 1, name: 1 }).lean();
}

async function createProductModule(payload) {
  const normalized = normalizeModulePayload(payload);
  if (!normalized.name || !normalized.key) {
    throw new AppError("Module name and key are required", 400, "VALIDATION_ERROR");
  }
  return await ProductModule.create(normalized);
}

async function updateProductModule(moduleId, payload) {
  if (!isValidObjectId(moduleId)) throw new AppError("Module is invalid", 400, "VALIDATION_ERROR");
  const current = await ProductModule.findById(moduleId);
  if (!current) throw new AppError("Module not found", 404, "NOT_FOUND");

  const normalized = normalizeModulePayload({
    ...current.toObject(),
    ...payload,
  });

  Object.assign(current, normalized);
  await current.save();
  return current;
}

async function deleteProductModule(moduleId) {
  if (!isValidObjectId(moduleId)) throw new AppError("Module is invalid", 400, "VALIDATION_ERROR");
  const deleted = await ProductModule.findByIdAndDelete(moduleId);
  if (!deleted) throw new AppError("Module not found", 404, "NOT_FOUND");
  return deleted;
}

async function validateAndNormalizeExtraDetails(extraDetails = {}) {
  const modules = await listProductModules({ activeOnly: true });
  const byKey = new Map(modules.map((item) => [item.key, item]));
  const normalized = {};

  for (const [moduleKey, rawModuleValue] of Object.entries(extraDetails || {})) {
    const moduleDef = byKey.get(moduleKey);
    if (!moduleDef) continue;

    const moduleValue = rawModuleValue && typeof rawModuleValue === "object" ? rawModuleValue : {};
    const nextValue = {};

    for (const field of moduleDef.fields || []) {
      const value = validateFieldValue(field, moduleValue[field.key]);
      if (value !== undefined) nextValue[field.key] = value;
    }

    for (const field of moduleDef.fields || []) {
      if (field.required && nextValue[field.key] === undefined) {
        throw new AppError(`${moduleDef.name}: ${field.name} is required`, 400, "VALIDATION_ERROR");
      }
    }

    normalized[moduleKey] = nextValue;
  }

  return normalized;
}

module.exports = {
  listProductModules,
  createProductModule,
  updateProductModule,
  deleteProductModule,
  validateAndNormalizeExtraDetails,
};
