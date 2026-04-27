const VendorPayoutAccount = require("../models/VendorPayoutAccount");
const vendorRepo = require("../repositories/vendor.repository");
const { AppError } = require("../utils/AppError");
const auditService = require("./audit.service");

class PayoutAccountService {
  async getVendorContext(userId) {
    const vendor = await vendorRepo.findByUserId(userId);
    if (!vendor) throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
    return vendor;
  }

  async getActiveAccountForVendor(vendorId) {
    return await VendorPayoutAccount.findOne({ vendorId, isActive: true }).sort({ createdAt: -1 });
  }

  async getVendorAccount(userId) {
    const vendor = await this.getVendorContext(userId);
    return await this.getActiveAccountForVendor(vendor._id);
  }

  async upsertVendorAccount(userId, payload = {}) {
    const vendor = await this.getVendorContext(userId);
    const normalizedPayload = {
      accountHolderName: String(payload.accountHolderName || "").trim(),
      accountNumber: String(payload.accountNumber || "").trim(),
      ifscCode: String(payload.ifscCode || "").trim().toUpperCase(),
      bankName: String(payload.bankName || "").trim(),
      upiId: String(payload.upiId || "").trim().toLowerCase(),
      isActive: true,
      isVerified: false,
      verifiedAt: null,
      verifiedBy: null,
      deactivatedAt: null,
    };

    const hasBankDetails = normalizedPayload.accountHolderName && normalizedPayload.accountNumber && normalizedPayload.ifscCode;
    const hasUpi = Boolean(normalizedPayload.upiId);
    if (!hasBankDetails && !hasUpi) {
      throw new AppError("Provide either bank account details or UPI id", 400, "PAYOUT_ACCOUNT_REQUIRED");
    }

    await VendorPayoutAccount.updateMany(
      { vendorId: vendor._id, isActive: true },
      { $set: { isActive: false, deactivatedAt: new Date() } }
    );

    const account = await VendorPayoutAccount.create({
      vendorId: vendor._id,
      ...normalizedPayload,
    });

    return account;
  }

  async verifyAccount(accountId, actor, meta) {
    const account = await VendorPayoutAccount.findById(accountId);
    if (!account) throw new AppError("Payout account not found", 404, "NOT_FOUND");

    account.isVerified = true;
    account.verifiedAt = new Date();
    account.verifiedBy = actor?.sub || actor?._id || undefined;
    await account.save();

    await auditService.log({
      actor,
      action: "admin.payout_account.verified",
      entityType: "VendorPayoutAccount",
      entityId: account._id,
      metadata: {
        vendorId: String(account.vendorId),
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return account;
  }

  async getVendorAccountByVendorId(vendorId) {
    return await this.getActiveAccountForVendor(vendorId);
  }
}

module.exports = new PayoutAccountService();
