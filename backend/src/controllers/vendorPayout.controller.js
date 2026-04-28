const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const walletService = require("../services/wallet.service");
const payoutService = require("../services/payout.service");
const payoutAccountService = require("../services/payoutAccount.service");
const ledgerService = require("../services/ledger.service");

const getWallet = asyncHandler(async (req, res) => {
  const wallet = await walletService.getWalletForVendorUser(req.user.sub);
  const consistency = await walletService.assertLedgerConsistency(wallet.vendorId);
  return ok(res, { wallet, consistency }, "Vendor wallet retrieved");
});

const getLedger = asyncHandler(async (req, res) => {
  const vendor = await walletService.getVendorContext(req.user.sub);
  const ledger = await ledgerService.listForVendor(vendor._id, req.query);
  return ok(res, ledger, "Vendor ledger retrieved");
});

const requestPayout = asyncHandler(async (req, res) => {
  const result = await payoutService.requestVendorPayout(req.user.sub, req.body, req.user, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  return ok(res, result, "Payout request submitted");
});

const listPayoutRequests = asyncHandler(async (req, res) => {
  const result = await payoutService.listVendorPayoutRequests(req.user.sub, req.query);
  return ok(res, result, "Payout requests retrieved");
});

/**
 * GET /vendor/payout-account
 * Get vendor's active payout account (masked)
 */
const getPayoutAccount = asyncHandler(async (req, res) => {
  const account = await payoutAccountService.getVendorAccount(req.user.sub);
  return ok(res, account || null, "Vendor payout account retrieved");
});

/**
 * POST/PUT /vendor/payout-account
 * Create or update vendor payout account
 * Accepts: accountHolderName, accountNumber, ifscCode, bankName, upiId
 */
const upsertPayoutAccount = asyncHandler(async (req, res) => {
  const account = await payoutAccountService.upsertVendorAccount(
    req.user.sub,
    req.body,
    {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }
  );
  return ok(res, account, "Vendor payout account updated");
});

module.exports = {
  getWallet,
  getLedger,
  requestPayout,
  listPayoutRequests,
  getPayoutAccount,
  upsertPayoutAccount,
};
