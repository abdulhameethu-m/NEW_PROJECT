const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const { AppError } = require("../utils/AppError");
const payoutService = require("../services/payout.service");
const walletService = require("../services/wallet.service");
const ledgerService = require("../services/ledger.service");
const payoutAccountService = require("../services/payoutAccount.service");

const listPayoutRequests = asyncHandler(async (req, res) => {
  const result = await payoutService.listAdminPayoutRequests(req.query);
  return ok(res, result, "Payout requests retrieved");
});

/**
 * GET /admin/payout-accounts
 * List all vendor payout accounts with verification status
 */
const listPayoutAccounts = asyncHandler(async (req, res) => {
  const result = await payoutAccountService.listAdminAccounts(req.query);
  return ok(res, result, "Payout accounts retrieved");
});

const getPayoutRequestById = asyncHandler(async (req, res) => {
  const result = await payoutService.getPayoutRequestById(req.params.id);
  return ok(res, result, "Payout request retrieved");
});

const approvePayoutRequest = asyncHandler(async (req, res) => {
  const result = await payoutService.approvePayoutRequest(req.params.id, req.body, req.user, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  return ok(res, result, "Payout request approved");
});

const rejectPayoutRequest = asyncHandler(async (req, res) => {
  const result = await payoutService.rejectPayoutRequest(req.params.id, req.body, req.user, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  return ok(res, result, "Payout request rejected");
});

const payPayoutRequest = asyncHandler(async (req, res) => {
  const result = await payoutService.payPayoutRequest(req.params.id, req.body, req.user, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  return ok(res, result, "Payout processed");
});

const getVendorWallet = asyncHandler(async (req, res) => {
  const wallet = await walletService.getWalletForVendor(req.params.vendorId);
  const consistency = await walletService.assertLedgerConsistency(req.params.vendorId);
  return ok(res, { wallet, consistency }, "Vendor wallet retrieved");
});

const getVendorLedger = asyncHandler(async (req, res) => {
  const ledger = await ledgerService.listForVendorAdmin(req.params.vendorId, req.query);
  return ok(res, ledger, "Vendor ledger retrieved");
});

/**
 * GET /admin/vendors/:vendorId/payout-account
 * Get vendor's payout account details (masked)
 */
const getVendorPayoutAccount = asyncHandler(async (req, res) => {
  const account = await payoutAccountService.getVendorAccountByVendorId(req.params.vendorId);
  return ok(res, account || null, "Vendor payout account retrieved");
});

/**
 * POST /admin/payout-accounts/:accountId/verify
 * Admin verifies vendor payout account
 */
const verifyVendorPayoutAccount = asyncHandler(async (req, res) => {
  if (!req.params.accountId) {
    throw new AppError("Account ID is required", 400, "VALIDATION_ERROR");
  }

  const account = await payoutAccountService.verifyAccount(
    req.params.accountId,
    req.user.sub,
    {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }
  );
  return ok(res, account, "Vendor payout account verified");
});

/**
 * POST /admin/payout-accounts/:accountId/reject
 * Admin rejects vendor payout account
 * Body: { reason: string }
 */
const rejectVendorPayoutAccount = asyncHandler(async (req, res) => {
  if (!req.params.accountId) {
    throw new AppError("Account ID is required", 400, "VALIDATION_ERROR");
  }

  const reason = req.body?.reason;
  if (!reason || typeof reason !== "string") {
    throw new AppError("Rejection reason is required", 400, "VALIDATION_ERROR");
  }

  const account = await payoutAccountService.rejectAccount(
    req.params.accountId,
    req.user.sub,
    reason,
    {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }
  );
  return ok(res, account, "Vendor payout account rejected");
});

module.exports = {
  listPayoutAccounts,
  listPayoutRequests,
  getPayoutRequestById,
  approvePayoutRequest,
  rejectPayoutRequest,
  payPayoutRequest,
  getVendorWallet,
  getVendorLedger,
  getVendorPayoutAccount,
  verifyVendorPayoutAccount,
  rejectVendorPayoutAccount,
};
