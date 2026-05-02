const { AppError } = require("../utils/AppError");
const vendorRepo = require("../repositories/vendor.repository");
const userRepo = require("../repositories/user.repository");
const payoutAccountService = require("./payoutAccount.service");
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

  // Save pickup locations if provided
  if (payload.pickupLocations && Array.isArray(payload.pickupLocations)) {
    const processedLocations = payload.pickupLocations
      .filter((loc) => loc && (loc.name || loc.addressLine1))
      .map((loc) => ({
        // Default location name to company name if not provided
        name: (loc.name && loc.name.trim()) ? loc.name : payload.companyName,
        phone: loc.phone || "",
        addressLine1: loc.addressLine1 || "",
        addressLine2: loc.addressLine2 || "",
        city: loc.city || "",
        state: loc.state || "",
        pincode: loc.pincode || "",
        country: loc.country || "India",
        latitude: Number.isFinite(Number(loc.latitude)) ? Number(loc.latitude) : undefined,
        longitude: Number.isFinite(Number(loc.longitude)) ? Number(loc.longitude) : undefined,
        isDefault: loc.isDefault || false,
      }));

    if (processedLocations.length > 0) {
      update.pickupLocations = processedLocations;
    }
  }

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
  
  // Create or update VendorPayoutAccount with bank details
  const bankDetails = payload.bankDetails || {};
  const payoutPayload = {
    accountHolderName: bankDetails.holderName || "",
    accountNumber: bankDetails.accountNumber || "",
    ifscCode: bankDetails.IFSC || "",
    bankName: bankDetails.bankName || "",
    upiId: payload.upiId || "",
  };
  
  // Only create payout account if at least some details are provided
  if (payoutPayload.accountHolderName || payoutPayload.accountNumber || payoutPayload.ifscCode || payoutPayload.upiId) {
    await payoutAccountService.upsertVendorAccount(userId, payoutPayload, {
      source: "vendor_onboarding_step3",
    });
  }
  
  // Update vendor profile (no longer storing bankDetails here)
  const update = {
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
    // Use provided shop name, or default to company name
    shopName: payload.shopName && payload.shopName.trim() ? payload.shopName : existing.companyName,
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

