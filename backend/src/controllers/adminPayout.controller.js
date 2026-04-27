const { ok } = require("../utils/apiResponse");
const { asyncHandler } = require("../utils/asyncHandler");
const payoutService = require("../services/payout.service");
const walletService = require("../services/wallet.service");
const ledgerService = require("../services/ledger.service");
const payoutAccountService = require("../services/payoutAccount.service");

const listPayoutRequests = asyncHandler(async (req, res) => {
  const result = await payoutService.listAdminPayoutRequests(req.query);
  return ok(res, result, "Payout requests retrieved");
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

const getVendorPayoutAccount = asyncHandler(async (req, res) => {
  const account = await payoutAccountService.getVendorAccountByVendorId(req.params.vendorId);
  return ok(res, account || null, "Vendor payout account retrieved");
});

const verifyVendorPayoutAccount = asyncHandler(async (req, res) => {
  const account = await payoutAccountService.verifyAccount(req.params.accountId, req.user, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  return ok(res, account, "Vendor payout account verified");
});

module.exports = {
  listPayoutRequests,
  getPayoutRequestById,
  approvePayoutRequest,
  rejectPayoutRequest,
  payPayoutRequest,
  getVendorWallet,
  getVendorLedger,
  getVendorPayoutAccount,
  verifyVendorPayoutAccount,
};
