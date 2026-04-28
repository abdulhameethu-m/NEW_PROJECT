const VendorPayoutAccount = require("../models/VendorPayoutAccount");
const vendorRepo = require("../repositories/vendor.repository");
const { AppError } = require("../utils/AppError");
const auditService = require("./audit.service");
const { getEncryptionService, EncryptionService } = require("../utils/encryption");

class PayoutAccountService {
  constructor() {
    this.encService = getEncryptionService();
  }

  async getVendorContext(userId) {
    const vendor = await vendorRepo.findByUserId(userId);
    if (!vendor) throw new AppError("Vendor profile not found", 404, "VENDOR_NOT_FOUND");
    return vendor;
  }

  async getActiveAccountForVendor(vendorId) {
    return await VendorPayoutAccount.findOne({ vendorId, isActive: true }).sort({
      createdAt: -1,
    });
  }

  async getVendorAccount(userId) {
    const vendor = await this.getVendorContext(userId);
    const account = await this.getActiveAccountForVendor(vendor._id);
    return account ? this.maskAccountData(account) : null;
  }

  /**
   * Mask sensitive account data for API responses
   * Never expose full account numbers or UPI IDs
   */
  maskAccountData(account) {
    if (!account) return null;

    const accountDoc = account.toObject ? account.toObject() : account;

    // Decrypt and mask account number
    let maskedAccountNumber = null;
    if (accountDoc.accountNumberEncrypted) {
      try {
        const decrypted = this.encService.decrypt(accountDoc.accountNumberEncrypted);
        maskedAccountNumber = EncryptionService.maskString(decrypted);
      } catch (error) {
        maskedAccountNumber = "XXXX****";
      }
    }

    // Decrypt and mask UPI ID
    let maskedUpiId = null;
    if (accountDoc.upiIdEncrypted) {
      try {
        const decrypted = this.encService.decrypt(accountDoc.upiIdEncrypted);
        maskedUpiId = EncryptionService.maskString(decrypted);
      } catch (error) {
        maskedUpiId = "XXXX****";
      }
    }

    return {
      _id: accountDoc._id,
      vendorId: accountDoc.vendorId,
      accountHolderName: accountDoc.accountHolderName,
      accountNumber: maskedAccountNumber,
      ifscCode: accountDoc.ifscCode,
      bankName: accountDoc.bankName,
      upiId: maskedUpiId,
      isActive: accountDoc.isActive,
      isVerified: accountDoc.isVerified,
      verificationStatus: accountDoc.verificationStatus,
      verifiedAt: accountDoc.verifiedAt,
      version: accountDoc.version,
      createdAt: accountDoc.createdAt,
      updatedAt: accountDoc.updatedAt,
    };
  }

  async listAdminAccounts(query = {}) {
    const normalizedPage = Math.max(Number(query.page) || 1, 1);
    const normalizedLimit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (normalizedPage - 1) * normalizedLimit;
    const filter = { isActive: true };

    if (query.verified === "true") filter.isVerified = true;
    if (query.verified === "false") filter.isVerified = false;
    if (query.verificationStatus) filter.verificationStatus = query.verificationStatus;
    if (query.vendorId) filter.vendorId = query.vendorId;

    const [accounts, total] = await Promise.all([
      VendorPayoutAccount.find(filter)
        .populate("vendorId", "companyName shopName supportEmail supportPhone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(normalizedLimit)
        .lean(),
      VendorPayoutAccount.countDocuments(filter),
    ]);

    // Mask account data in list
    const maskedAccounts = accounts.map((acc) => this.maskAccountData(acc));

    return {
      accounts: maskedAccounts,
      pagination: {
        total,
        page: normalizedPage,
        limit: normalizedLimit,
        pages: Math.ceil(total / normalizedLimit),
      },
    };
  }

  /**
   * Create or update vendor payout account
   * Encrypts sensitive fields and manages versioning
   */
  async upsertVendorAccount(userId, payload = {}, meta = {}) {
    const vendor = await this.getVendorContext(userId);

    const normalizedPayload = {
      accountHolderName: String(payload.accountHolderName || "").trim(),
      accountNumber: String(payload.accountNumber || "").trim(),
      ifscCode: String(payload.ifscCode || "").trim().toUpperCase(),
      bankName: String(payload.bankName || "").trim(),
      upiId: String(payload.upiId || "").trim().toLowerCase(),
    };

    // Validate that at least one payment method is provided
    const hasBankDetails =
      normalizedPayload.accountHolderName &&
      normalizedPayload.accountNumber &&
      normalizedPayload.ifscCode;
    const hasUpi = Boolean(normalizedPayload.upiId);

    if (!hasBankDetails && !hasUpi) {
      throw new AppError(
        "Provide either bank account details or UPI id",
        400,
        "PAYOUT_ACCOUNT_REQUIRED"
      );
    }

    // Get existing active account to create version history
    const existingAccount = await this.getActiveAccountForVendor(vendor._id);

    // Encrypt sensitive fields
    const encryptedData = {
      accountHolderName: normalizedPayload.accountHolderName,
      accountNumberEncrypted: normalizedPayload.accountNumber
        ? this.encService.encrypt(normalizedPayload.accountNumber)
        : "",
      ifscCode: normalizedPayload.ifscCode,
      bankName: normalizedPayload.bankName,
      upiIdEncrypted: normalizedPayload.upiId
        ? this.encService.encrypt(normalizedPayload.upiId)
        : "",
      isActive: true,
      isVerified: false,
      verificationStatus: "PENDING",
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: null,
      deactivatedAt: null,
      version: existingAccount ? existingAccount.version + 1 : 1,
      createdByVendor: userId,
      updateReason: payload.updateReason || "Vendor updated account",
    };

    // Deactivate existing active account
    if (existingAccount) {
      // Store previous version in history
      const previousVersion = {
        version: existingAccount.version,
        accountHolderName: existingAccount.accountHolderName,
        accountNumberEncrypted: existingAccount.accountNumberEncrypted,
        ifscCode: existingAccount.ifscCode,
        bankName: existingAccount.bankName,
        upiIdEncrypted: existingAccount.upiIdEncrypted,
        isVerified: existingAccount.isVerified,
        verifiedAt: existingAccount.verifiedAt,
        createdAt: existingAccount.createdAt,
      };

      await VendorPayoutAccount.updateMany(
        { vendorId: vendor._id, isActive: true },
        {
          $set: {
            isActive: false,
            deactivatedAt: new Date(),
          },
        }
      );

      encryptedData.previousVersions = [previousVersion, ...(existingAccount.previousVersions || [])];
    }

    const account = await VendorPayoutAccount.create({
      vendorId: vendor._id,
      ...encryptedData,
    });

    // Audit logging
    await auditService.log({
      actor: { _id: userId, role: "vendor" },
      action: existingAccount ? "vendor.payout_account.updated" : "vendor.payout_account.created",
      entityType: "VendorPayoutAccount",
      entityId: account._id,
      metadata: {
        vendorId: String(vendor._id),
        version: account.version,
        hasBank: hasBankDetails,
        hasUpi: hasUpi,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return this.maskAccountData(account);
  }

  /**
   * Admin verification of payout account
   */
  async verifyAccount(accountId, adminId, meta = {}) {
    const account = await VendorPayoutAccount.findById(accountId);
    if (!account) throw new AppError("Payout account not found", 404, "NOT_FOUND");

    if (account.isVerified) {
      throw new AppError("Account already verified", 400, "ALREADY_VERIFIED");
    }

    account.isVerified = true;
    account.verificationStatus = "VERIFIED";
    account.verifiedAt = new Date();
    account.verifiedBy = adminId;
    await account.save();

    // Audit logging
    await auditService.log({
      actor: { _id: adminId, role: "admin" },
      action: "admin.payout_account.verified",
      entityType: "VendorPayoutAccount",
      entityId: account._id,
      metadata: {
        vendorId: String(account.vendorId),
        version: account.version,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return this.maskAccountData(account);
  }

  /**
   * Admin rejection of payout account
   */
  async rejectAccount(accountId, adminId, reason, meta = {}) {
    const account = await VendorPayoutAccount.findById(accountId);
    if (!account) throw new AppError("Payout account not found", 404, "NOT_FOUND");

    if (account.verificationStatus === "VERIFIED") {
      throw new AppError("Cannot reject verified account", 400, "ALREADY_VERIFIED");
    }

    account.verificationStatus = "REJECTED";
    account.rejectionReason = String(reason || "").trim().slice(0, 500);
    await account.save();

    // Audit logging
    await auditService.log({
      actor: { _id: adminId, role: "admin" },
      action: "admin.payout_account.rejected",
      entityType: "VendorPayoutAccount",
      entityId: account._id,
      metadata: {
        vendorId: String(account.vendorId),
        reason: account.rejectionReason,
        version: account.version,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return this.maskAccountData(account);
  }

  async getVendorAccountByVendorId(vendorId, includeEncrypted = false) {
    const account = await this.getActiveAccountForVendor(vendorId);
    if (!account) return null;
    return includeEncrypted ? account : this.maskAccountData(account);
  }

  /**
   * Get account for payout processing (admin only)
   * Returns encrypted data that needs to be decrypted for actual payout
   */
  async getAccountForProcessing(vendorId) {
    const account = await this.getActiveAccountForVendor(vendorId);
    if (!account) throw new AppError("Payout account not found", 404, "NOT_FOUND");

    if (!account.isVerified) {
      throw new AppError("Payout account not verified", 400, "ACCOUNT_NOT_VERIFIED");
    }

    if (!account.isActive) {
      throw new AppError("Payout account is inactive", 400, "ACCOUNT_INACTIVE");
    }

    // Return with encrypted fields for secure processing
    return account;
  }

  /**
   * Decrypt account number (internal use only)
   */
  decryptAccountNumber(encryptedData) {
    if (!encryptedData) return null;
    try {
      return this.encService.decrypt(encryptedData);
    } catch (error) {
      throw new AppError("Failed to decrypt account number", 500, "DECRYPTION_ERROR");
    }
  }

  /**
   * Decrypt UPI ID (internal use only)
   */
  decryptUpiId(encryptedData) {
    if (!encryptedData) return null;
    try {
      return this.encService.decrypt(encryptedData);
    } catch (error) {
      throw new AppError("Failed to decrypt UPI ID", 500, "DECRYPTION_ERROR");
    }
  }
}

module.exports = new PayoutAccountService();
