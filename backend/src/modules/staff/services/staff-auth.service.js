const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { AppError } = require("../../../utils/AppError");
const {
  signStaffAccessToken,
  signStaffRefreshToken,
  verifyStaffRefreshToken,
} = require("../../../utils/jwt");
const { Staff } = require("../models/Staff");
const { StaffSession } = require("../models/StaffSession");
const { StaffLoginHistory } = require("../models/StaffLoginHistory");
const { StaffPasswordResetToken } = require("../models/StaffPasswordResetToken");
const { OTP } = require("../../../models/OTP");
const { normalizeStaff } = require("./staff.service");
const vendorModuleService = require("../../../services/vendorModule.service");
const emailService = require("../../../services/email.service");
const smsService = require("../../../services/sms.service");
const { logger } = require("../../../utils/logger");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a random OTP
 * @returns {string} OTP code
 */
function generateOTP() {
  const length = parseInt(process.env.OTP_LENGTH) || 6;
  return Math.random()
    .toString(10)
    .substring(2, 2 + length)
    .padStart(length, "0");
}

function normalizePasswordInput(password) {
  return String(password || "").trim();
}

function getRefreshExpiryDate() {
  const ttlDays = Number(process.env.STAFF_JWT_REFRESH_TTL_DAYS || 30);
  return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
}

async function buildStaffAuthPayload(staff) {
  const hydratedStaff = staff.roleId?.permissions
    ? staff
    : await Staff.findById(staff._id).populate("roleId").select("+password");

  if (!hydratedStaff) throw new AppError("Staff account not found", 404, "NOT_FOUND");

  return {
    staff: hydratedStaff,
    role: hydratedStaff.roleId,
    permissions: hydratedStaff.roleId?.permissions || {},
  };
}

async function createSessionTokens(staff, meta = {}) {
  const { role, permissions } = await buildStaffAuthPayload(staff);
  const enabledModules = await vendorModuleService.getGlobalModuleEnabledMap();

  const session = await StaffSession.create({
    staffId: staff._id,
    refreshTokenHash: "pending",
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
    expiresAt: getRefreshExpiryDate(),
    lastUsedAt: new Date(),
  });

  const refreshToken = signStaffRefreshToken({
    staff,
    sessionId: session._id,
    roleId: role?._id,
    permissions,
  });
  const accessToken = signStaffAccessToken({
    staff,
    sessionId: session._id,
    roleId: role?._id,
    permissions,
  });

  await StaffSession.findByIdAndUpdate(session._id, {
    refreshTokenHash: hashToken(refreshToken),
    lastUsedAt: new Date(),
  });

  return {
    token: accessToken,
    accessToken,
    refreshToken,
    user: {
      ...normalizeStaff({ ...staff.toObject(), roleId: role }),
      roleId: role?._id,
      permissions,
      enabledModules,
      authType: "staff",
    },
  };
}

async function recordLoginHistory(staffId, meta = {}, successful = true) {
  await StaffLoginHistory.create({
    staffId,
    loggedInAt: new Date(),
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    successful,
  });
}

async function login({ email, password }, meta = {}) {
  const normalizedPassword = normalizePasswordInput(password);
  const staff = await Staff.findOne({ email: email.toLowerCase() })
    .populate("roleId")
    .select("+password");

  if (!staff) throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  if (staff.status !== "active") throw new AppError("Staff account suspended", 403, "ACCOUNT_SUSPENDED");

  const passwordMatches = await bcrypt.compare(normalizedPassword, staff.password);
  if (!passwordMatches) {
    await recordLoginHistory(staff._id, meta, false);
    throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }

  staff.lastLogin = new Date();
  await staff.save();
  await recordLoginHistory(staff._id, meta, true);

  return createSessionTokens(staff, meta);
}

async function refreshSession(refreshToken, meta = {}) {
  if (!refreshToken) throw new AppError("Refresh token required", 401, "UNAUTHORIZED");

  let payload;
  try {
    payload = verifyStaffRefreshToken(refreshToken);
  } catch (error) {
    throw new AppError("Invalid or expired refresh token", 401, "UNAUTHORIZED");
  }

  const session = await StaffSession.findById(payload.sid);
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new AppError("Session expired", 401, "UNAUTHORIZED");
  }

  if (session.refreshTokenHash !== hashToken(refreshToken)) {
    await StaffSession.findByIdAndUpdate(session._id, { revokedAt: new Date() });
    throw new AppError("Session mismatch", 401, "UNAUTHORIZED");
  }

  const staff = await Staff.findById(payload.sub).populate("roleId").select("+password");
  if (!staff || staff.status !== "active") {
    throw new AppError("Account unavailable", 401, "UNAUTHORIZED");
  }

  const permissions = staff.roleId?.permissions || {};
  const enabledModules = await vendorModuleService.getGlobalModuleEnabledMap();
  const rotatedRefreshToken = signStaffRefreshToken({
    staff,
    sessionId: session._id,
    roleId: staff.roleId?._id,
    permissions,
  });
  const accessToken = signStaffAccessToken({
    staff,
    sessionId: session._id,
    roleId: staff.roleId?._id,
    permissions,
  });

  await StaffSession.findByIdAndUpdate(session._id, {
    refreshTokenHash: hashToken(rotatedRefreshToken),
    lastUsedAt: new Date(),
    userAgent: meta.userAgent || session.userAgent,
    ipAddress: meta.ipAddress || session.ipAddress,
  });

  return {
    token: accessToken,
    accessToken,
    refreshToken: rotatedRefreshToken,
    user: {
      ...normalizeStaff({ ...staff.toObject(), roleId: staff.roleId }),
      roleId: staff.roleId?._id,
      permissions,
      enabledModules,
      authType: "staff",
    },
  };
}

async function logout(refreshToken) {
  if (!refreshToken) return { loggedOut: true };

  try {
    const payload = verifyStaffRefreshToken(refreshToken);
    await StaffSession.findByIdAndUpdate(payload.sid, { revokedAt: new Date() });
  } catch (error) {
    return { loggedOut: true };
  }

  return { loggedOut: true };
}

async function me(staffId) {
  const staff = await Staff.findById(staffId).populate("roleId");
  if (!staff) throw new AppError("Staff account not found", 404, "NOT_FOUND");
  if (staff.status !== "active") throw new AppError("Staff account suspended", 403, "ACCOUNT_SUSPENDED");

  const permissions = staff.roleId?.permissions || {};
  const enabledModules = await vendorModuleService.getGlobalModuleEnabledMap();
  
  logger.debug("Staff permissions synced from role", {
    source: "staff-auth.service",
    event: "permission_sync",
    staffId: String(staff._id),
    roleId: staff.roleId?._id ? String(staff.roleId._id) : null,
    moduleCount: Object.keys(permissions).length,
    permissionCount: Object.values(permissions).reduce(
      (total, actions) => total + Object.values(actions || {}).filter(Boolean).length,
      0
    ),
  });

  return {
    ...normalizeStaff(staff),
    roleId: staff.roleId?._id,
    permissions,
    enabledModules,
    authType: "staff",
    syncedAt: new Date().toISOString(),
  };
}

async function requestPasswordReset(email) {
  const staff = await Staff.findOne({ email: email.toLowerCase() });
  if (!staff) return { requested: true };

  const rawToken = crypto.randomBytes(32).toString("hex");
  await StaffPasswordResetToken.create({
    staffId: staff._id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  return {
    requested: true,
    resetToken: process.env.NODE_ENV === "production" ? undefined : rawToken,
  };
}

async function resetPassword(token, password) {
  const normalizedPassword = normalizePasswordInput(password);
  const tokenHash = hashToken(token);
  const resetRecord = await StaffPasswordResetToken.findOne({
    tokenHash,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!resetRecord) throw new AppError("Invalid or expired reset token", 400, "INVALID_RESET_TOKEN");

  const staff = await Staff.findById(resetRecord.staffId).select("+password");
  if (!staff) throw new AppError("Staff account not found", 404, "NOT_FOUND");

  staff.password = await bcrypt.hash(normalizedPassword, 12);
  staff.passwordChangedAt = new Date();
  staff.forceLogoutAt = new Date();
  await staff.save();

  resetRecord.usedAt = new Date();
  await resetRecord.save();

  await StaffSession.updateMany(
    { staffId: staff._id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  return { reset: true };
}

/**
 * Request password reset OTP via email (Staff)
 * @param {string} identifier - Email or phone
 * @returns {Promise<object>} Result with OTP sent status
 */
async function requestPasswordResetOTP(identifier) {
  const id = String(identifier || "").trim();
  const isEmail = id.includes("@");

  // Find staff by email or phone
  const staff = isEmail
    ? await Staff.findOne({ email: id.toLowerCase() })
    : await Staff.findOne({ phone: id });

  // Return error if staff doesn't exist
  if (!staff) {
    throw new AppError("Invalid email or phone number", 400, "USER_NOT_FOUND");
  }

  // Determine which identifier to use
  let identifierForOTP = null;
  let otpDeliveryMethod = null;

  if (isEmail && staff.email) {
    identifierForOTP = staff.email;
    otpDeliveryMethod = "email";
  } else if (!isEmail && staff.phone) {
    identifierForOTP = staff.phone;
    otpDeliveryMethod = "sms";
  } else {
    throw new AppError(
      "No valid contact method found for this account",
      400,
      "NO_CONTACT_METHOD"
    );
  }

  // Generate OTP
  const rawOTP = generateOTP();
  const otpHash = hashToken(rawOTP);
  const otpExpiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;

  // Store OTP in database
  await OTP.create({
    userId: staff._id,
    email: staff.email,
    phone: staff.phone,
    otpHash,
    purpose: "password_reset",
    deliveryMethod: otpDeliveryMethod,
    expiresAt: new Date(Date.now() + otpExpiryMinutes * 60 * 1000),
  });

  // Send OTP via appropriate channel
  try {
    if (otpDeliveryMethod === "email") {
      await emailService.sendPasswordResetOTP(staff.email, rawOTP, staff.name);
    } else if (otpDeliveryMethod === "sms") {
      await smsService.sendPasswordResetOTP(staff.phone, rawOTP, staff.name);
    }
  } catch (error) {
    console.error(
      `Failed to send OTP via ${otpDeliveryMethod}:`,
      error.message
    );
    // Don't throw error, let the process continue
  }

  return {
    otpRequested: true,
    deliveryMethod: otpDeliveryMethod,
    message: `OTP sent via ${
      otpDeliveryMethod === "email" ? "email" : "SMS"
    }`,
  };
}

/**
 * Verify password reset OTP (Staff)
 * @param {string} email - Staff email or phone
 * @param {string} otp - OTP code
 * @returns {Promise<object>} Result with verification token
 */
async function verifyPasswordResetOTP(email, otp) {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const otpCode = String(otp || "").trim();

  if (!normalizedEmail || !otpCode) {
    throw new AppError("Email/Phone and OTP are required", 400, "VALIDATION_ERROR");
  }

  // Find staff by email or phone
  const isEmail = normalizedEmail.includes("@");
  const staff = isEmail
    ? await Staff.findOne({ email: normalizedEmail })
    : await Staff.findOne({ phone: normalizedEmail });

  if (!staff) {
    throw new AppError("Invalid email or phone number", 400, "USER_NOT_FOUND");
  }

  // Hash the provided OTP
  const otpHash = hashToken(otpCode);

  // Find matching OTP (for email or phone)
  const otpRecord = await OTP.findOne({
    userId: staff._id,
    otpHash,
    purpose: "password_reset",
    verifiedAt: null,
    expiresAt: { $gt: new Date() },
    $or: [
      { email: staff.email },
      { phone: staff.phone }
    ]
  });

  if (!otpRecord) {
    // Increment attempts
    await OTP.updateOne(
      {
        userId: staff._id,
        purpose: "password_reset",
        verifiedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { $inc: { attempts: 1 } }
    );

    throw new AppError("Invalid or expired OTP", 400, "INVALID_OTP");
  }

  // Check max attempts
  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    await OTP.deleteOne({ _id: otpRecord._id });
    throw new AppError(
      "OTP attempts exceeded. Please request a new OTP.",
      400,
      "OTP_MAX_ATTEMPTS_EXCEEDED"
    );
  }

  // Mark OTP as verified
  otpRecord.verifiedAt = new Date();
  await otpRecord.save();

  // Generate a temporary token for password reset (valid for 5 minutes)
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = hashToken(resetToken);

  // Store reset token
  await StaffPasswordResetToken.create({
    staffId: staff._id,
    tokenHash: resetTokenHash,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  });

  return {
    otpVerified: true,
    resetToken: process.env.NODE_ENV === "production" ? undefined : resetToken,
    message: "OTP verified successfully. Use the reset token to change your password.",
  };
}

module.exports = {
  login,
  refreshSession,
  logout,
  me,
  requestPasswordReset,
  resetPassword,
  requestPasswordResetOTP,
  verifyPasswordResetOTP,
  generateOTP,
};
