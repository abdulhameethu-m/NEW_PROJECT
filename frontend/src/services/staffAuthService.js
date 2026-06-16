import { staffHttp } from "./staffHttp";

export async function login(payload) {
  const { data } = await staffHttp.post("/api/staff/auth/login", payload);
  return data;
}

export async function logout() {
  const { data } = await staffHttp.post("/api/staff/auth/logout", {});
  return data;
}

export async function refreshSession() {
  const { data } = await staffHttp.post("/api/staff/auth/refresh", {});
  return data;
}

export async function me() {
  const { data } = await staffHttp.get("/api/staff/auth/me");
  return data;
}

// Alias for consistency
export const getMe = me;

/**
 * Request password reset for staff
 * @param {string} email - Staff email
 * @returns {Promise<Object>} {requested: true, resetToken?: string}
 */
export async function requestPasswordReset(email) {
  const { data } = await staffHttp.post("/api/staff/auth/password-reset/request", {
    email,
  });
  return data?.data || data;
}

/**
 * Reset staff password with token
 * @param {string} token - Reset token
 * @param {string} password - New password
 * @returns {Promise<Object>} {reset: true}
 */
export async function resetPassword(token, password) {
  const { data } = await staffHttp.post("/api/staff/auth/password-reset/confirm", {
    token,
    password,
  });
  return data?.data || data;
}

