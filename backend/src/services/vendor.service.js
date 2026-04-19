const { AppError } = require("../utils/AppError");
const vendorRepo = require("../repositories/vendor.repository");
const userRepo = require("../repositories/user.repository");
const { uploadMany } = require("../utils/upload");

async function ensureVendorProfile(userId) {
  const existing = await vendorRepo.findByUserId(userId);
  if (existing) return existing;
  return await vendorRepo.upsertByUserId(userId, { status: "draft", stepCompleted: 0 });
}

function bumpStep(existingStep, newStep) {
  return Math.max(Number(existingStep || 0), Number(newStep));
}

async function saveStep1(userId, payload) {
  const existing = await ensureVendorProfile(userId);

  if (payload.email) {
    const user = await userRepo.findById(userId);
    if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
    if (user.email !== payload.email.toLowerCase()) {
      throw new AppError("Email cannot be changed in onboarding", 400, "EMAIL_IMMUTABLE");
    }
  }

  if (payload.name || payload.phone) {
    await userRepo.updateById(userId, {
      ...(payload.name ? { name: payload.name } : {}),
      ...(payload.phone ? { phone: payload.phone } : {}),
    });
  }

  const update = {
    companyName: payload.companyName,
    address: payload.address,
    location: payload.location,
    stepCompleted: bumpStep(existing.stepCompleted, 1),
    status: existing.status === "rejected" ? "draft" : existing.status,
  };
  return await vendorRepo.upsertByUserId(userId, update);
}

async function saveStep2(userId, payload, files) {
  const existing = await ensureVendorProfile(userId);
  const uploaded = await uploadMany(files || [], { folder: "vendor_documents" });

  if (!payload.noGst && (!payload.gstNumber || payload.gstNumber.trim() === "")) {
    throw new AppError("GST number required or choose No GST", 400, "GST_REQUIRED");
  }

  const update = {
    gstNumber: payload.noGst ? null : payload.gstNumber,
    noGst: Boolean(payload.noGst),
    documents: uploaded.length ? [...(existing.documents || []), ...uploaded] : existing.documents,
    stepCompleted: bumpStep(existing.stepCompleted, 2),
    status: existing.status === "rejected" ? "draft" : existing.status,
  };
  return await vendorRepo.upsertByUserId(userId, update);
}

async function saveStep3(userId, payload) {
  const existing = await ensureVendorProfile(userId);
  const update = {
    bankDetails: payload.bankDetails,
    stepCompleted: bumpStep(existing.stepCompleted, 3),
    status: existing.status === "rejected" ? "draft" : existing.status,
  };
  return await vendorRepo.upsertByUserId(userId, update);
}

async function saveStep4AndSubmit(userId, payload, files) {
  const existing = await ensureVendorProfile(userId);

  const uploaded = await uploadMany(files || [], { folder: "vendor_shops" });
  if (uploaded.length < 4 || uploaded.length > 5) {
    throw new AppError("Upload 4 to 5 shop images", 400, "SHOP_IMAGES_COUNT");
  }

  const update = {
    shopName: payload.shopName,
    shopImages: uploaded,
    stepCompleted: bumpStep(existing.stepCompleted, 4),
    status: "pending",
    rejectionReason: null,
  };

  return await vendorRepo.upsertByUserId(userId, update);
}

async function getMe(userId) {
  const vendor = await vendorRepo.findByUserId(userId);
  if (!vendor) throw new AppError("Vendor profile not found", 404, "NOT_FOUND");
  return vendor;
}

module.exports = {
  saveStep1,
  saveStep2,
  saveStep3,
  saveStep4AndSubmit,
  getMe,
};

