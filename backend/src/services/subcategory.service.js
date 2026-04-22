const { isValidObjectId } = require("mongoose");
const { Category } = require("../models/Category");
const { Subcategory } = require("../models/Subcategory");
const { AppError } = require("../utils/AppError");

function normalizeCode(input = "", fallbackName = "") {
  const requested = String(input || "").trim();
  if (requested) {
    return requested.toUpperCase();
  }
  return String(fallbackName || "").trim().charAt(0).toUpperCase();
}

async function assertCategoryExists(categoryId) {
  if (!isValidObjectId(categoryId)) {
    throw new AppError("Category is invalid", 400, "VALIDATION_ERROR");
  }
  const category = await Category.findById(categoryId).select("_id name").lean();
  if (!category) {
    throw new AppError("Category not found", 404, "NOT_FOUND");
  }
  return category;
}

async function ensureUniqueInCategory({ name, code, categoryId, excludeId }) {
  const nameMatch = await Subcategory.findOne({
    categoryId,
    name,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  })
    .select("_id")
    .lean();

  if (nameMatch) {
    throw new AppError("Subcategory name already exists in this category", 409, "CONFLICT");
  }

  const codeMatch = await Subcategory.findOne({
    categoryId,
    code,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  })
    .select("_id")
    .lean();

  if (codeMatch) {
    throw new AppError("Subcategory code already exists in this category", 409, "CONFLICT");
  }
}

async function createSubcategory(payload) {
  const name = String(payload.name || "").trim();
  const categoryId = payload.categoryId;
  const code = normalizeCode(payload.code, name);
  const status = payload.status === "disabled" ? "disabled" : "active";

  if (!name) {
    throw new AppError("Subcategory name is required", 400, "VALIDATION_ERROR");
  }
  if (!code) {
    throw new AppError("Subcategory code is required", 400, "VALIDATION_ERROR");
  }

  await assertCategoryExists(categoryId);
  await ensureUniqueInCategory({ name, code, categoryId });

  return await Subcategory.create({ name, code, categoryId, status });
}

async function listAdminSubcategories() {
  return await Subcategory.find({})
    .populate("categoryId", "name")
    .sort({ createdAt: -1 })
    .lean();
}

async function updateSubcategory(subcategoryId, payload) {
  if (!isValidObjectId(subcategoryId)) {
    throw new AppError("Subcategory is invalid", 400, "VALIDATION_ERROR");
  }

  const current = await Subcategory.findById(subcategoryId);
  if (!current) {
    throw new AppError("Subcategory not found", 404, "NOT_FOUND");
  }

  const nextName = payload.name !== undefined ? String(payload.name || "").trim() : current.name;
  const nextCategoryId = payload.categoryId || current.categoryId;
  const nextCode =
    payload.code !== undefined
      ? normalizeCode(payload.code, nextName)
      : current.code;
  const nextStatus = payload.status || current.status;

  if (!nextName) {
    throw new AppError("Subcategory name is required", 400, "VALIDATION_ERROR");
  }
  if (!nextCode) {
    throw new AppError("Subcategory code is required", 400, "VALIDATION_ERROR");
  }

  await assertCategoryExists(nextCategoryId);
  await ensureUniqueInCategory({
    name: nextName,
    code: nextCode,
    categoryId: nextCategoryId,
    excludeId: current._id,
  });

  current.name = nextName;
  current.code = nextCode;
  current.categoryId = nextCategoryId;
  current.status = nextStatus === "disabled" ? "disabled" : "active";
  await current.save();
  return current;
}

async function deleteSubcategory(subcategoryId) {
  if (!isValidObjectId(subcategoryId)) {
    throw new AppError("Subcategory is invalid", 400, "VALIDATION_ERROR");
  }
  const deleted = await Subcategory.findByIdAndDelete(subcategoryId);
  if (!deleted) {
    throw new AppError("Subcategory not found", 404, "NOT_FOUND");
  }
  return deleted;
}

async function setSubcategoryStatus(subcategoryId, status) {
  if (!isValidObjectId(subcategoryId)) {
    throw new AppError("Subcategory is invalid", 400, "VALIDATION_ERROR");
  }

  const subcategory = await Subcategory.findById(subcategoryId);
  if (!subcategory) {
    throw new AppError("Subcategory not found", 404, "NOT_FOUND");
  }

  subcategory.status = status === "disabled" ? "disabled" : "active";
  await subcategory.save();
  return subcategory;
}

async function listActiveByCategory(categoryId) {
  await assertCategoryExists(categoryId);
  return await Subcategory.find({ categoryId, status: "active" }).sort({ name: 1 }).lean();
}

async function getSubcategoryById(subcategoryId) {
  if (!isValidObjectId(subcategoryId)) {
    throw new AppError("Subcategory is invalid", 400, "VALIDATION_ERROR");
  }
  const subcategory = await Subcategory.findById(subcategoryId).lean();
  if (!subcategory) {
    throw new AppError("Subcategory not found", 404, "NOT_FOUND");
  }
  return subcategory;
}

module.exports = {
  createSubcategory,
  listAdminSubcategories,
  updateSubcategory,
  deleteSubcategory,
  setSubcategoryStatus,
  listActiveByCategory,
  getSubcategoryById,
};
