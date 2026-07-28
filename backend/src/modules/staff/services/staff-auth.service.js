const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { Staff } = require("../models/Staff");
const { StaffSession } = require("../models/StaffSession");
const { AppError } = require("../../../utils/AppError");
const { normalizeStaff } = require("./staff.service");
const {
  signStaffAccessToken,
  signStaffRefreshToken,
  verifyStaffRefreshToken,
} = require("../../../utils/jwt");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getRefreshExpiryDate() {
  const days = Number(process.env.JWT_REFRESH_TTL_DAYS || 30);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function createSessionTokens(staff, meta = {}) {
  const session = new StaffSession({
    staffId: staff._id,
    refreshTokenHash: "pending",
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
    expiresAt: getRefreshExpiryDate(),
    lastUsedAt: new Date(),
  });
  await session.save();

  const refreshToken = signStaffRefreshToken({
    staff,
    sessionId: session._id,
    roleId: staff.roleId?._id || staff.roleId,
    permissions: staff.roleId?.permissions || {},
  });
  const accessToken = signStaffAccessToken({
    staff,
    sessionId: session._id,
    roleId: staff.roleId?._id || staff.roleId,
    permissions: staff.roleId?.permissions || {},
  });

  session.refreshTokenHash = hashToken(refreshToken);
  session.lastUsedAt = new Date();
  await session.save();

  return {
    accessToken,
    refreshToken,
    user: normalizeStaff(staff),
  };
}

async function login(credentials, meta = {}) {
  const { email, password } = credentials;
  if (!email || !password) {
    throw new AppError("Email and password are required", 400, "VALIDATION_ERROR");
  }

  const staff = await Staff.findOne({ email: email.toLowerCase() })
    .select("+password")
    .populate("roleId");
    
  if (!staff || staff.status !== "active") {
    throw new AppError("Invalid credentials", 401, "UNAUTHORIZED");
  }

  const isMatch = await bcrypt.compare(password, staff.password);
  if (!isMatch) {
    throw new AppError("Invalid credentials", 401, "UNAUTHORIZED");
  }

  staff.lastLogin = new Date();
  await staff.save();

  return createSessionTokens(staff, meta);
}

async function refreshSession(refreshToken, meta = {}) {
  if (!refreshToken) throw new AppError("Refresh token required", 401, "UNAUTHORIZED");

  let payload;
  try {
    payload = verifyStaffRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid refresh token", 401, "UNAUTHORIZED");
  }

  const session = await StaffSession.findById(payload.sid);
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new AppError("Session expired or revoked", 401, "UNAUTHORIZED");
  }

  if (session.refreshTokenHash !== hashToken(refreshToken)) {
    throw new AppError("Invalid refresh token", 401, "UNAUTHORIZED");
  }

  const staff = await Staff.findById(payload.sub).populate("roleId");
  if (!staff || staff.status !== "active") {
    throw new AppError("Staff not found or suspended", 401, "UNAUTHORIZED");
  }

  if (staff.forceLogoutAt && staff.forceLogoutAt > session.createdAt) {
    session.revokedAt = new Date();
    await session.save();
    throw new AppError("Session expired", 401, "UNAUTHORIZED");
  }

  const newRefreshToken = signStaffRefreshToken({
    staff,
    sessionId: session._id,
    roleId: staff.roleId?._id || staff.roleId,
    permissions: staff.roleId?.permissions || {},
  });
  const newAccessToken = signStaffAccessToken({
    staff,
    sessionId: session._id,
    roleId: staff.roleId?._id || staff.roleId,
    permissions: staff.roleId?.permissions || {},
  });

  session.refreshTokenHash = hashToken(newRefreshToken);
  session.lastUsedAt = new Date();
  if (meta.ipAddress) session.ipAddress = meta.ipAddress;
  if (meta.userAgent) session.userAgent = meta.userAgent;
  await session.save();

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: normalizeStaff(staff),
  };
}

async function logout(refreshToken) {
  if (!refreshToken) return { success: true };
  try {
    const payload = verifyStaffRefreshToken(refreshToken);
    await StaffSession.findByIdAndUpdate(payload.sid, {
      $set: { revokedAt: new Date() },
    });
  } catch {
    // Ignore invalid tokens on logout
  }
  return { success: true };
}

async function me(staffId) {
  const staff = await Staff.findById(staffId).populate("roleId");
  if (!staff) throw new AppError("Staff not found", 404, "NOT_FOUND");
  return { user: normalizeStaff(staff) };
}

async function requestPasswordReset(email) {
  // Can implement actual OTP/token sending if required
  return { success: true, message: "If an account exists, a reset link will be sent" };
}

async function requestPasswordResetOTP(identifier) {
  return { success: true, message: "OTP sent" };
}

async function verifyPasswordResetOTP(email, otp) {
  return { success: true, token: "dummy-reset-token" };
}

async function resetPassword(token, newPassword) {
  return { success: true };
}

module.exports = {
  login,
  refreshSession,
  logout,
  me,
  requestPasswordReset,
  requestPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPassword,
};