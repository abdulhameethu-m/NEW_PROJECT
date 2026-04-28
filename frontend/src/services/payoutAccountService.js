import * as api from "./api";

/**
 * Payout Account Service
 * Handles all payout account operations for vendors and admins
 */

// VENDOR ENDPOINTS

/**
 * Get vendor's active payout account (masked)
 */
export async function getVendorPayoutAccount() {
  return api.get("/vendor/payout-account");
}

/**
 * Create or update vendor payout account
 * @param {Object} data - { accountHolderName, accountNumber, ifscCode, bankName, upiId }
 */
export async function updateVendorPayoutAccount(data) {
  return api.put("/vendor/payout-account", data);
}

// ADMIN ENDPOINTS

/**
 * List all payout accounts with filters (admin)
 * @param {Object} query - { page, limit, verified, verificationStatus, vendorId }
 */
export async function listPayoutAccounts(query = {}) {
  return api.get("/admin/payout-accounts", { params: query });
}

/**
 * Get vendor's payout account details (admin view, masked)
 * @param {string} vendorId
 */
export async function getVendorPayoutAccountAdmin(vendorId) {
  return api.get(`/admin/vendors/${vendorId}/payout-account`);
}

/**
 * Verify vendor payout account (admin action)
 * @param {string} accountId
 */
export async function verifyPayoutAccount(accountId) {
  return api.post(`/admin/payout-accounts/${accountId}/verify`);
}

/**
 * Reject vendor payout account (admin action)
 * @param {string} accountId
 * @param {string} reason - Rejection reason
 */
export async function rejectPayoutAccount(accountId, reason) {
  return api.post(`/admin/payout-accounts/${accountId}/reject`, { reason });
}
