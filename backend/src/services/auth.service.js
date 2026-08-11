const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { AppError } = require("../utils/AppError");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const userRepo = require("../repositories/user.repository");
const sessionRepo = require("../repositories/session.repository");
const auditService = require("./audit.service");
const { isInfluencerCommerceEnabled } = require("./influencer-commerce-config.service");
const { PasswordResetToken } = require("../models/PasswordResetToken");
const { OTP } = require("../models/OTP");
const emailService = require("./email.service");
const smsService = require("./sms.service");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a random OTP
 * @returns {string} OTP code
 */
function generateOTP() {
  const length = parseInt(process.env.OTP_LENGTH) || 6;
  const max = 10 ** length;
  return String(crypto.randomInt(0, max)).padStart(length, "0");
}

function assertStrongPassword(password) {
  const normalizedPassword = String(password || "");
  if (normalizedPassword.length < 8) {
    throw new AppError("Password must be at least 8 characters", 400, "VALIDATION_ERROR");
  }
  if (normalizedPassword.length > 128) {
    throw new AppError("Password must not exceed 128 characters", 400, "VALIDATION_ERROR");
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(normalizedPassword)) {
    throw new AppError("Password must contain uppercase, lowercase, and number characters", 400, "VALIDATION_ERROR");
  }
  return normalizedPassword;
}

function normalizeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    roles: Array.from(new Set([user.role, ...(user.roles || [])].filter(Boolean))),
    status: user.status,
    avatarUrl: user.avatarUrl || null,
    preferences: user.preferences || {
      theme: "light",
      notificationPreferences: {
        orderUpdates: true,
        deliveryAlerts: true,
        paymentAlerts: true,
        promotions: false,
      },
    },
    createdAt: user.createdAt,
  };
}

function getConfiguredAdminLogin(identifier, password) {
  const configuredEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const configuredPassword = String(process.env.ADMIN_PASSWORD || "");
  const id = String(identifier || "").trim().toLowerCase();
  if (!configuredEmail || !configuredPassword || id !== configuredEmail || password !== configuredPassword) {
    return null;
  }
  return {
    email: configuredEmail,
    password: configuredPassword,
    name: String(process.env.ADMIN_NAME || "Platform Admin").trim() || "Platform Admin",
    phone: String(process.env.ADMIN_PHONE || "9999999999").trim() || "9999999999",
    role: String(process.env.ADMIN_ROLE || "super_admin").trim() || "super_admin",
  };
}

async function createConfiguredAdminUser(configuredAdmin) {
  const hashed = await bcrypt.hash(configuredAdmin.password, 12);
  return userRepo.createUser({
    name: configuredAdmin.name,
    email: configuredAdmin.email,
    phone: configuredAdmin.phone,
    password: hashed,
    role: configuredAdmin.role,
    roles: [configuredAdmin.role],
    status: "active",
  });
}

async function repairConfiguredAdminPassword(user, configuredAdmin) {
  const hashed = await bcrypt.hash(configuredAdmin.password, 12);
  user.password = hashed;
  user.name = user.name || configuredAdmin.name;
  user.phone = user.phone || configuredAdmin.phone;
  user.role = configuredAdmin.role;
  user.roles = Array.from(new Set([configuredAdmin.role, ...(user.roles || [])].filter(Boolean)));
  user.status = "active";
  await user.save();
}

function getRefreshExpiryDate() {
  const ttlDays = Number(process.env.JWT_REFRESH_TTL_DAYS || 7);
  return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
}

function getCurrentSessionId(refreshToken) {
  if (!refreshToken) return null;
  try {
    return verifyRefreshToken(refreshToken).sid || null;
  } catch {
    return null;
  }
}

function inferBrowser(userAgent = "") {
  if (/edg\//i.test(userAgent)) return "Microsoft Edge";
  if (/chrome|crios/i.test(userAgent)) return "Chrome";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  if (/safari/i.test(userAgent) && !/chrome|crios|android/i.test(userAgent)) return "Safari";
  return "Unknown browser";
}

function inferOs(userAgent = "") {
  if (/windows/i.test(userAgent)) return "Windows";
  if (/android/i.test(userAgent)) return "Android";
  if (/iphone|ipad|ios/i.test(userAgent)) return "iOS";
  if (/mac os|macintosh/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Unknown OS";
}

function serializeSession(session, currentSessionId = null) {
  const userAgent = session.userAgent || "";
  const browser = inferBrowser(userAgent);
  const os = inferOs(userAgent);
  const lastActivity = session.lastUsedAt || session.updatedAt || session.createdAt;
  return {
    _id: session._id,
    deviceId: String(session._id),
    deviceName: `${browser} on ${os}`,
    browser,
    os,
    userAgent,
    ipAddress: session.ipAddress || null,
    location: null,
    lastActivity,
    lastUsedAt: lastActivity,
    expiresAt: session.expiresAt,
    isActive: !session.revokedAt && session.expiresAt > new Date(),
    current: String(session._id) === String(currentSessionId),
    createdAt: session.createdAt,
  };
}

async function createSessionTokens(user, meta = {}) {
  const session = await sessionRepo.create({
    userId: user._id,
    refreshTokenHash: "pending",
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
    expiresAt: getRefreshExpiryDate(),
    lastUsedAt: new Date(),
  });

  const refreshToken = signRefreshToken({ user, sessionId: session._id });
  const accessToken = signAccessToken(user);

  await sessionRepo.updateById(session._id, {
    refreshTokenHash: hashToken(refreshToken),
    lastUsedAt: new Date(),
  });

  return {
    token: accessToken,
    accessToken,
    refreshToken,
    user: normalizeUser(user),
  };
}

async function assertInfluencerAccessAllowed(role) {
  if (role !== "influencer") return;
  const enabled = await isInfluencerCommerceEnabled();
  if (!enabled) {
    throw new AppError(
      "Influencer registrations are paused by the platform administrator.",
      403,
      "INFLUENCER_COMMERCE_DISABLED"
    );
  }
}

async function register({ name, email, phone, password, role }, meta = {}) {
  const normalizedEmail = email ? String(email).toLowerCase() : undefined;
  const normalizedPassword = assertStrongPassword(password);

  await assertInfluencerAccessAllowed(role);

  if (["vendor", "influencer"].includes(role) && !normalizedEmail) {
    throw new AppError("Email is required for vendors and influencers", 400, "VALIDATION_ERROR");
  }

  if (normalizedEmail) {
    const existing = await userRepo.findByEmail(normalizedEmail);
    if (existing) throw new AppError("Email already in use", 409, "EMAIL_EXISTS");
  }

  const existingPhone = await userRepo.findByPhone(phone);
  if (existingPhone) throw new AppError("Phone already in use", 409, "PHONE_EXISTS");

  const hashed = await bcrypt.hash(normalizedPassword, 12);
  const user = await userRepo.createUser({
    name,
    email: normalizedEmail,
    phone: String(phone).trim(),
    password: hashed,
    role,
    roles: [role],
    status: "active",
  });

  const auth = await createSessionTokens(user, meta);
  await auditService.log({
    actor: { _id: user._id, role: user.role },
    action: "auth.register",
    entityType: "User",
    entityId: user._id,
    metadata: { role: user.role },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
  return auth;
}

async function login({ identifier, password }, meta = {}) {
  const id = String(identifier || "").trim();
  const isEmail = id.includes("@");
  const configuredAdmin = getConfiguredAdminLogin(id, password);

  let user = isEmail
    ? await userRepo.findByEmail(id, { includePassword: true })
    : await userRepo.findByPhone(id, { includePassword: true });

  if (!user && configuredAdmin) {
    user = await createConfiguredAdminUser(configuredAdmin);
  }
  if (!user) throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  if (user.status !== "active") throw new AppError("Account disabled", 403, "ACCOUNT_DISABLED");

  let ok = await bcrypt.compare(password, user.password);
  if (!ok && configuredAdmin) {
    await repairConfiguredAdminPassword(user, configuredAdmin);
    ok = true;
  }
  if (!ok) throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");

  await assertInfluencerAccessAllowed(user.role);

  const auth = await createSessionTokens(user, meta);
  await auditService.log({
    actor: { _id: user._id, role: user.role },
    action: "auth.login",
    entityType: "User",
    entityId: user._id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
  return auth;
}

async function refreshSession(refreshToken, meta = {}) {
  if (!refreshToken) throw new AppError("Refresh token required", 401, "UNAUTHORIZED");

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new AppError("Invalid or expired refresh token", 401, "UNAUTHORIZED");
  }

  const session = await sessionRepo.findById(payload.sid);
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new AppError("Session expired", 401, "UNAUTHORIZED");
  }

  const incomingHash = hashToken(refreshToken);
  if (session.refreshTokenHash !== incomingHash || String(session.userId) !== String(payload.sub)) {
    await sessionRepo.revokeById(payload.sid);
    throw new AppError("Session mismatch", 401, "UNAUTHORIZED");
  }

  const user = await userRepo.findById(payload.sub);
  if (!user || user.status !== "active") {
    throw new AppError("Account unavailable", 401, "UNAUTHORIZED");
  }

  await assertInfluencerAccessAllowed(user.role);

  const rotatedRefreshToken = signRefreshToken({ user, sessionId: session._id });
  const accessToken = signAccessToken(user);
  await sessionRepo.updateById(session._id, {
    refreshTokenHash: hashToken(rotatedRefreshToken),
    lastUsedAt: new Date(),
    userAgent: meta.userAgent || session.userAgent,
    ipAddress: meta.ipAddress || session.ipAddress,
  });

  await auditService.log({
    actor: { _id: user._id, role: user.role },
    action: "auth.refresh",
    entityType: "Session",
    entityId: session._id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return {
    token: accessToken,
    accessToken,
    refreshToken: rotatedRefreshToken,
    user: normalizeUser(user),
  };
}

async function logout(refreshToken, actor, meta = {}) {
  if (!refreshToken) return { loggedOut: true };

  try {
    const payload = verifyRefreshToken(refreshToken);
    await sessionRepo.revokeById(payload.sid);
    await auditService.log({
      actor: actor || { _id: payload.sub, role: payload.role },
      action: "auth.logout",
      entityType: "Session",
      entityId: payload.sid,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  } catch (error) {
    return { loggedOut: true };
  }

  return { loggedOut: true };
}

async function logoutAll(userId, meta = {}) {
  const user = await userRepo.findById(userId);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");

  await sessionRepo.revokeAllForUser(userId);
  await auditService.log({
    actor: { _id: user._id, role: user.role },
    action: "auth.logout_all",
    entityType: "User",
    entityId: user._id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
  return { loggedOut: true };
}

async function listSessions(userId, refreshToken) {
  const currentSessionId = getCurrentSessionId(refreshToken);
  const sessions = await sessionRepo.listActiveForUser(userId);
  return sessions.map((session) => serializeSession(session, currentSessionId));
}

async function revokeSession(userId, sessionId, meta = {}) {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new AppError("Session not found", 404, "NOT_FOUND");
  }

  const session = await sessionRepo.findById(sessionId);
  if (!session || String(session.userId) !== String(userId) || session.revokedAt) {
    throw new AppError("Session not found", 404, "NOT_FOUND");
  }

  await sessionRepo.revokeById(sessionId);
  await auditService.log({
    actor: { _id: userId, role: meta.role },
    action: "auth.session.revoked",
    entityType: "Session",
    entityId: sessionId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  const current = String(sessionId) === String(getCurrentSessionId(meta.refreshToken));
  return { _id: sessionId, revoked: true, current };
}

async function me(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  return normalizeUser(user);
}

async function updateThemePreference(userId, theme, meta = {}) {
  if (!["light", "dark"].includes(theme)) {
    throw new AppError("Theme must be 'light' or 'dark'", 400, "VALIDATION_ERROR");
  }

  const user = await userRepo.findById(userId);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");

  const updated = await userRepo.updateById(userId, {
    "preferences.theme": theme,
  });

  await auditService.log({
    actor: { _id: user._id, role: user.role },
    action: "auth.theme.updated",
    entityType: "User",
    entityId: user._id,
    metadata: { theme },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return normalizeUser(updated);
}

async function requestPasswordReset(identifier) {
  const id = String(identifier || "").trim();
  const isEmail = id.includes("@");

  const user = isEmail
    ? await userRepo.findByEmail(id)
    : await userRepo.findByPhone(id);

  // Always return success to prevent user enumeration
  if (!user) {
    return { requested: true };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  await PasswordResetToken.create({
    userId: user._id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });

  return {
    requested: true,
    resetToken: process.env.NODE_ENV === "production" ? undefined : rawToken,
  };
}

async function resetPassword(token, password) {
  const normalizedPassword = assertStrongPassword(password);

  const tokenHash = hashToken(token);
  const resetRecord = await PasswordResetToken.findOne({
    tokenHash,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!resetRecord) {
    throw new AppError("Invalid or expired reset token", 400, "INVALID_RESET_TOKEN");
  }

  const user = await userRepo.findById(resetRecord.userId, { includePassword: true });
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");

  const hashed = await bcrypt.hash(normalizedPassword, 12);
  await userRepo.updateById(user._id, {
    password: hashed,
    passwordChangedAt: new Date(),
  });

  resetRecord.usedAt = new Date();
  await resetRecord.save();

  // Revoke all sessions for the user
  await sessionRepo.revokeAllForUser(user._id);

  await auditService.log({
    actor: { _id: user._id, role: user.role },
    action: "auth.password.reset",
    entityType: "User",
    entityId: user._id,
  });

  return { reset: true };
}

async function findUserByEmailOrPhone(identifier) {
  const id = String(identifier || "").trim();
  const isEmail = id.includes("@");

  const user = isEmail
    ? await userRepo.findByEmail(id)
    : await userRepo.findByPhone(id);

  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
  };
}

/**
 * Request password reset OTP via email or SMS
 * @param {string} identifier - Email or phone number
 * @returns {Promise<object>} Result with OTP sent status
 */
async function requestPasswordResetOTP(identifier) {
  const id = String(identifier || "").trim();
  const isEmail = id.includes("@");

  // Find user by email or phone
  const user = isEmail
    ? await userRepo.findByEmail(id)
    : await userRepo.findByPhone(id);

  if (!user) {
    return {
      otpRequested: true,
      deliveryMethod: isEmail ? "email" : "sms",
      message: `If an account exists, an OTP will be sent via ${isEmail ? "email" : "SMS"}.`,
    };
  }

  // Determine which identifier to use
  let identifierForOTP = null;
  let otpDeliveryMethod = null;

  if (isEmail && user.email) {
    identifierForOTP = user.email;
    otpDeliveryMethod = "email";
  } else if (!isEmail && user.phone) {
    identifierForOTP = user.phone;
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

  await OTP.deleteMany({
    userId: user._id,
    purpose: "password_reset",
    verifiedAt: null,
  });

  await OTP.create({
    userId: user._id,
    email: user.email,
    phone: user.phone,
    otpHash,
    purpose: "password_reset",
    deliveryMethod: otpDeliveryMethod,
    expiresAt: new Date(Date.now() + otpExpiryMinutes * 60 * 1000),
  });

  // Send OTP via appropriate channel
  try {
    if (otpDeliveryMethod === "email") {
      await emailService.sendPasswordResetOTP(user.email, rawOTP, user.name);
    } else if (otpDeliveryMethod === "sms") {
      await smsService.sendPasswordResetOTP(user.phone, rawOTP, user.name);
    }
  } catch (error) {
    console.error(
      `Failed to send OTP via ${otpDeliveryMethod}:`,
      error.message
    );
    // Don't throw error, let the process continue
    // User can try again
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
 * Verify password reset OTP
 * @param {string} email - User email or phone
 * @param {string} otp - OTP code
 * @returns {Promise<object>} Result with verification token
 */
async function verifyPasswordResetOTP(email, otp) {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const otpCode = String(otp || "").trim();

  if (!normalizedEmail || !otpCode) {
    throw new AppError("Email/Phone and OTP are required", 400, "VALIDATION_ERROR");
  }

  // Find user by email or phone
  const isEmail = normalizedEmail.includes("@");
  const user = isEmail
    ? await userRepo.findByEmail(normalizedEmail)
    : await userRepo.findByPhone(normalizedEmail);

  if (!user) {
    throw new AppError("Invalid email or phone number", 400, "USER_NOT_FOUND");
  }

  // Hash the provided OTP
  const otpHash = hashToken(otpCode);

  // Find matching OTP (for email or phone)
  const otpRecord = await OTP.findOne({
    userId: user._id,
    otpHash,
    purpose: "password_reset",
    verifiedAt: null,
    expiresAt: { $gt: new Date() },
    $or: [
      { email: user.email },
      { phone: user.phone }
    ]
  });

  if (!otpRecord) {
    // Increment attempts
    await OTP.updateOne(
      {
        userId: user._id,
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

  // Store reset token (reuse PasswordResetToken model)
  await PasswordResetToken.create({
    userId: user._id,
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
  register,
  login,
  refreshSession,
  logout,
  logoutAll,
  listSessions,
  revokeSession,
  me,
  updateThemePreference,
  requestPasswordReset,
  resetPassword,
  findUserByEmailOrPhone,
  requestPasswordResetOTP,
  verifyPasswordResetOTP,
  generateOTP,
};
