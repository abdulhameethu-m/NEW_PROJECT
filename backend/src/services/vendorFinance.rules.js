const { AppError } = require("../utils/AppError");

function roundMoney(value) {
  const numeric = Number(value || 0);
  return Number(numeric.toFixed(2));
}

function assertMoneyAmount(amount, fieldName = "amount") {
  const numeric = roundMoney(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new AppError(`Invalid ${fieldName}`, 400, "VALIDATION_ERROR");
  }
  return numeric;
}

function buildWalletSnapshot(wallet = {}) {
  return {
    totalEarnings: roundMoney(wallet.totalEarnings),
    availableBalance: roundMoney(wallet.availableBalance),
    pendingBalance: roundMoney(wallet.pendingBalance),
    withdrawnAmount: roundMoney(wallet.withdrawnAmount),
  };
}

function calculateOrderSettlementAmount(order = {}) {
  if (order.vendorEarning != null) {
    return assertMoneyAmount(order.vendorEarning, "vendor earning");
  }

  const totalAmount = roundMoney(order.totalAmount);
  const commission = roundMoney(order.platformCommissionAmount);
  return assertMoneyAmount(totalAmount - commission, "vendor earning");
}

function applyOrderCredit(wallet = {}, amount) {
  const nextAmount = assertMoneyAmount(amount);
  return buildWalletSnapshot({
    totalEarnings: roundMoney(wallet.totalEarnings) + nextAmount,
    availableBalance: roundMoney(wallet.availableBalance) + nextAmount,
    pendingBalance: roundMoney(wallet.pendingBalance),
    withdrawnAmount: roundMoney(wallet.withdrawnAmount),
  });
}

function assertPayoutRequestAllowed({ wallet = {}, amount, minimumAmount = 500, hasPendingRequest = false } = {}) {
  const nextAmount = assertMoneyAmount(amount);
  if (nextAmount < roundMoney(minimumAmount)) {
    throw new AppError(`Minimum payout request amount is Rs. ${roundMoney(minimumAmount)}`, 400, "PAYOUT_MINIMUM_NOT_MET");
  }
  if (hasPendingRequest) {
    throw new AppError("A payout request is already pending", 409, "PAYOUT_REQUEST_ALREADY_PENDING");
  }
  if (roundMoney(wallet.availableBalance) < nextAmount) {
    throw new AppError("Requested amount exceeds available balance", 400, "INSUFFICIENT_WALLET_BALANCE");
  }
  return nextAmount;
}

function applyPayoutRequest(wallet = {}, amount) {
  const nextAmount = assertMoneyAmount(amount);
  return buildWalletSnapshot({
    totalEarnings: roundMoney(wallet.totalEarnings),
    availableBalance: roundMoney(wallet.availableBalance) - nextAmount,
    pendingBalance: roundMoney(wallet.pendingBalance) + nextAmount,
    withdrawnAmount: roundMoney(wallet.withdrawnAmount),
  });
}

function applyPayoutRejection(wallet = {}, amount) {
  const nextAmount = assertMoneyAmount(amount);
  if (roundMoney(wallet.pendingBalance) < nextAmount) {
    throw new AppError("Pending payout balance is insufficient for rejection", 409, "PAYOUT_PENDING_BALANCE_MISMATCH");
  }
  return buildWalletSnapshot({
    totalEarnings: roundMoney(wallet.totalEarnings),
    availableBalance: roundMoney(wallet.availableBalance) + nextAmount,
    pendingBalance: roundMoney(wallet.pendingBalance) - nextAmount,
    withdrawnAmount: roundMoney(wallet.withdrawnAmount),
  });
}

function applyPayoutPayment(wallet = {}, amount) {
  const nextAmount = assertMoneyAmount(amount);
  if (roundMoney(wallet.pendingBalance) < nextAmount) {
    throw new AppError("Pending payout balance is insufficient for payment", 409, "PAYOUT_PENDING_BALANCE_MISMATCH");
  }
  return buildWalletSnapshot({
    totalEarnings: roundMoney(wallet.totalEarnings),
    availableBalance: roundMoney(wallet.availableBalance),
    pendingBalance: roundMoney(wallet.pendingBalance) - nextAmount,
    withdrawnAmount: roundMoney(wallet.withdrawnAmount) + nextAmount,
  });
}

function assertVerifiedPayoutAccount(account) {
  if (!account || account.isActive !== true) {
    throw new AppError("Active payout account not found", 400, "PAYOUT_ACCOUNT_NOT_FOUND");
  }
  if (account.isVerified !== true) {
    throw new AppError("Payout account is not verified", 400, "PAYOUT_ACCOUNT_NOT_VERIFIED");
  }
  return account;
}

function assertPayoutRequestPayable(request) {
  if (!request) {
    throw new AppError("Payout request not found", 404, "NOT_FOUND");
  }
  if (request.status === "PAID") {
    throw new AppError("Payout has already been paid", 409, "PAYOUT_ALREADY_PAID");
  }
  if (request.status === "PROCESSING") {
    throw new AppError("Payout is already being processed", 409, "PAYOUT_ALREADY_PROCESSING");
  }
  if (request.status !== "APPROVED") {
    throw new AppError("Payout request must be approved before payment", 400, "INVALID_PAYOUT_STATUS");
  }
  return request;
}

function doesLedgerMatchWallet(wallet = {}, ledgerEntry = {}) {
  const snapshot = buildWalletSnapshot(wallet);
  const ledgerSnapshot = buildWalletSnapshot(ledgerEntry.walletSnapshot || {});
  return JSON.stringify(snapshot) === JSON.stringify(ledgerSnapshot);
}

module.exports = {
  roundMoney,
  assertMoneyAmount,
  buildWalletSnapshot,
  calculateOrderSettlementAmount,
  applyOrderCredit,
  assertPayoutRequestAllowed,
  applyPayoutRequest,
  applyPayoutRejection,
  applyPayoutPayment,
  assertVerifiedPayoutAccount,
  assertPayoutRequestPayable,
  doesLedgerMatchWallet,
};
