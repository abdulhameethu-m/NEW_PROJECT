import { api, refreshAuthSessionRequest } from "./api";

export async function register({ name, email, phone, password, role }) {
  const { data } = await api.post("/api/auth/register", {
    name,
    email,
    phone,
    password,
    role,
  });
  return data;
}

export async function login({ identifier, password }) {
  const { data } = await api.post("/api/auth/login", {
    identifier,
    password,
  });
  return data;
}

export async function getMe() {
  const { data } = await api.get("/api/auth/me");
  return data;
}

export async function refreshSession() {
  const { data } = await refreshAuthSessionRequest();
  return data;
}

export async function logout() {
  const { data } = await api.post("/api/auth/logout", {});
  return data;
}

export async function logoutAll() {
  const { data } = await api.post("/api/auth/logout-all");
  return data;
}

export async function updateThemePreference(theme) {
  const { data } = await api.patch("/api/auth/preferences/theme", { theme });
  return data;
}

/**
 * POST-LOGIN MERGE
 * Merge guest cart and wishlist data after successful login
 * @param {Array} guestCartItems - Cart items from localStorage
 * @param {Array} guestWishlistItems - Wishlist items from localStorage
 * @returns {Promise<Object>} {cartMerge, wishlistMerge}
 */
export async function mergeGuestData(guestCartItems = [], guestWishlistItems = []) {
  const { data } = await api.post("/api/auth/merge-guest-data", {
    guestCartItems,
    guestWishlistItems,
  });
  return data?.data || data;
}

/**
 * Request password reset
 * Sends a password reset token to the user's email/phone
 * @param {string} identifier - Email or phone number
 * @returns {Promise<Object>} {requested: true, resetToken?: string}
 */
export async function requestPasswordReset(identifier) {
  const { data } = await api.post("/api/auth/password-reset/request", {
    identifier,
  });
  return data?.data || data;
}

/**
 * Reset password with token
 * @param {string} token - Reset token from email
 * @param {string} password - New password
 * @returns {Promise<Object>} {reset: true}
 */
export async function resetPassword(token, password) {
  const { data } = await api.post("/api/auth/password-reset/confirm", {
    token,
    password,
  });
  return data?.data || data;
}

/**
 * Find user for forgot username recovery
 * Returns user's name, email, and phone (masked)
 * @param {string} identifier - Email or phone number
 * @returns {Promise<Object>} User details
 */
export async function findUserForRecovery(identifier) {
  const { data } = await api.post("/api/auth/forgot-username", {
    identifier,
  });
  return data?.data || data;
}


