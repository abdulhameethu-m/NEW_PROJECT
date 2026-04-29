const { AppError } = require("../utils/AppError");
const PricingCategory = require("../models/PricingCategory");

const DEFAULT_CATEGORIES = [
  { key: "DELIVERY", name: "Delivery", description: "Delivery-related charges", isSystem: true, sortOrder: 10 },
  { key: "PLATFORM_FEE", name: "Platform Fee", description: "Platform service fees", isSystem: true, sortOrder: 20 },
  { key: "TAX", name: "Tax", description: "Tax and GST charges", isSystem: true, sortOrder: 30 },
  { key: "HANDLING", name: "Handling", description: "Handling-related charges", isSystem: true, sortOrder: 40 },
  { key: "PACKAGING", name: "Packaging", description: "Packaging charges", isSystem: true, sortOrder: 50 },
  { key: "DISCOUNT", name: "Discount", description: "Discount and promotional adjustments", isSystem: true, sortOrder: 60 },
  { key: "OTHER", name: "Other", description: "Other pricing adjustments", isSystem: true, sortOrder: 70 },
];

function normalizeKey(key) {
  return String(key || "")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase();
}

let defaultsInitialized = false;

async function ensureDefaultPricingCategories() {
  await Promise.all(
    DEFAULT_CATEGORIES.map((category) =>
      PricingCategory.updateOne(
        { key: category.key },
        {
          $setOnInsert: category,
        },
        { upsert: true }
      )
    )
  );

  defaultsInitialized = true;
  return listPricingCategories({ includeInactive: true });
}

async function ensureDefaultPricingCategoriesIfNeeded() {
  if (!defaultsInitialized) {
    await ensureDefaultPricingCategories();
  }
}

async function listPricingCategories({ includeInactive = true } = {}) {
  await ensureDefaultPricingCategoriesIfNeeded();
  const query = includeInactive ? {} : { isActive: true };
  return PricingCategory.find(query).sort({ sortOrder: 1, name: 1 }).lean();
}

async function getCategoryById(id) {
  await ensureDefaultPricingCategoriesIfNeeded();
  const category = await PricingCategory.findById(id);
  if (!category) {
    throw new AppError("Pricing category not found", 404, "NOT_FOUND");
  }
  return category;
}

async function getCategoryByKey(key) {
  await ensureDefaultPricingCategoriesIfNeeded();
  return PricingCategory.findOne({ key: normalizeKey(key) });
}

async function resolveCategory({ categoryId, categoryKey, fallbackKey = "OTHER" } = {}) {
  await ensureDefaultPricingCategoriesIfNeeded();

  if (categoryId) {
    const category = await PricingCategory.findById(categoryId);
    if (!category) {
      throw new AppError("Pricing category not found", 404, "NOT_FOUND");
    }
    return category;
  }

  const keyToUse = normalizeKey(categoryKey || fallbackKey);
  const category = await PricingCategory.findOne({ key: keyToUse });
  if (!category) {
    throw new AppError(`Pricing category "${keyToUse}" not found`, 404, "NOT_FOUND");
  }
  return category;
}

async function createPricingCategory(payload) {
  await ensureDefaultPricingCategoriesIfNeeded();

  const name = String(payload?.name || "").trim();
  const key = normalizeKey(payload?.key);
  const description = String(payload?.description || "").trim();
  const isActive = payload?.isActive !== undefined ? Boolean(payload.isActive) : true;
  const sortOrder = Number(payload?.sortOrder ?? 0);

  if (!name) throw new AppError("Category name is required", 400, "VALIDATION_ERROR");
  if (!key) throw new AppError("Category key is required", 400, "VALIDATION_ERROR");
  if (!Number.isFinite(sortOrder) || sortOrder < 0) {
    throw new AppError("sortOrder must be a non-negative number", 400, "VALIDATION_ERROR");
  }

  const existing = await PricingCategory.findOne({ key });
  if (existing) {
    throw new AppError(`Pricing category with key "${key}" already exists`, 409, "CONFLICT");
  }

  return PricingCategory.create({
    name,
    key,
    description,
    isActive,
    isSystem: false,
    sortOrder,
  });
}

async function updatePricingCategory(id, payload) {
  await ensureDefaultPricingCategoriesIfNeeded();
  const category = await getCategoryById(id);

  if (payload?.key !== undefined) {
    const nextKey = normalizeKey(payload.key);
    if (!nextKey) throw new AppError("Category key is required", 400, "VALIDATION_ERROR");
    if (category.isSystem && nextKey !== category.key) {
      throw new AppError("System category keys cannot be changed", 400, "VALIDATION_ERROR");
    }

    const conflict = await PricingCategory.findOne({ key: nextKey, _id: { $ne: id } });
    if (conflict) {
      throw new AppError(`Pricing category with key "${nextKey}" already exists`, 409, "CONFLICT");
    }
    category.key = nextKey;
  }

  if (payload?.name !== undefined) {
    const name = String(payload.name || "").trim();
    if (!name) throw new AppError("Category name is required", 400, "VALIDATION_ERROR");
    category.name = name;
  }

  if (payload?.description !== undefined) {
    category.description = String(payload.description || "").trim();
  }

  if (payload?.sortOrder !== undefined) {
    const sortOrder = Number(payload.sortOrder);
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      throw new AppError("sortOrder must be a non-negative number", 400, "VALIDATION_ERROR");
    }
    category.sortOrder = sortOrder;
  }

  if (payload?.isActive !== undefined) {
    category.isActive = Boolean(payload.isActive);
  }

  await category.save();
  return category;
}

async function deletePricingCategory(id) {
  await ensureDefaultPricingCategoriesIfNeeded();
  const category = await getCategoryById(id);
  if (category.isSystem) {
    throw new AppError("System pricing categories cannot be deleted", 400, "VALIDATION_ERROR");
  }

  await category.deleteOne();
  return category;
}

module.exports = {
  DEFAULT_CATEGORIES,
  normalizeKey,
  ensureDefaultPricingCategories,
  ensureDefaultPricingCategoriesIfNeeded,
  listPricingCategories,
  getCategoryById,
  getCategoryByKey,
  resolveCategory,
  createPricingCategory,
  updatePricingCategory,
  deletePricingCategory,
};
