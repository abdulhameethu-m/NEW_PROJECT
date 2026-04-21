const bcrypt = require("bcryptjs");
const { AppError } = require("../../../utils/AppError");
const { Staff } = require("../models/Staff");
const { Role } = require("../models/Role");
const { StaffSession } = require("../models/StaffSession");

function normalizePasswordInput(password) {
  return String(password || "").trim();
}

function normalizeStaff(staffDoc) {
  const staff = staffDoc.toObject ? staffDoc.toObject() : staffDoc;
  return {
    _id: staff._id,
    name: staff.name,
    email: staff.email,
    phone: staff.phone,
    status: staff.status,
    lastLogin: staff.lastLogin,
    createdAt: staff.createdAt,
    updatedAt: staff.updatedAt,
    role: staff.roleId && typeof staff.roleId === "object"
      ? {
          _id: staff.roleId._id,
          name: staff.roleId.name,
          description: staff.roleId.description,
          permissions: staff.roleId.permissions,
        }
      : staff.roleId,
  };
}

async function assertUniqueStaff({ email, phone, excludeId } = {}) {
  const queryExclusion = excludeId ? { _id: { $ne: excludeId } } : {};

  if (email) {
    const existingEmail = await Staff.findOne({ email: email.toLowerCase(), ...queryExclusion });
    if (existingEmail) throw new AppError("Email already in use", 409, "EMAIL_EXISTS");
  }

  if (phone) {
    const existingPhone = await Staff.findOne({ phone, ...queryExclusion });
    if (existingPhone) throw new AppError("Phone already in use", 409, "PHONE_EXISTS");
  }
}

async function assertRoleExists(roleId) {
  const role = await Role.findById(roleId);
  if (!role) throw new AppError("Assigned role not found", 404, "ROLE_NOT_FOUND");
  return role;
}

async function listStaff() {
  const staff = await Staff.find()
    .populate("roleId")
    .sort({ createdAt: -1 });
  return staff.map(normalizeStaff);
}

async function getStaffById(staffId) {
  const staff = await Staff.findById(staffId).populate("roleId").select("+password");
  if (!staff) throw new AppError("Staff account not found", 404, "NOT_FOUND");
  return staff;
}

async function createStaff(payload) {
  await assertUniqueStaff({ email: payload.email, phone: payload.phone });
  await assertRoleExists(payload.roleId);

  const passwordHash = await bcrypt.hash(normalizePasswordInput(payload.password), 12);
  const staff = await Staff.create({
    name: payload.name.trim(),
    email: payload.email.toLowerCase(),
    phone: payload.phone.trim(),
    password: passwordHash,
    roleId: payload.roleId,
    status: payload.status || "active",
    passwordChangedAt: new Date(),
  });

  const hydrated = await Staff.findById(staff._id).populate("roleId");
  return normalizeStaff(hydrated);
}

async function updateStaff(staffId, payload) {
  const staff = await Staff.findById(staffId).select("+password");
  if (!staff) throw new AppError("Staff account not found", 404, "NOT_FOUND");

  await assertUniqueStaff({
    email: payload.email,
    phone: payload.phone,
    excludeId: staffId,
  });

  if (payload.roleId) {
    await assertRoleExists(payload.roleId);
    staff.roleId = payload.roleId;
  }

  if (payload.name !== undefined) staff.name = payload.name.trim();
  if (payload.email !== undefined) staff.email = payload.email.toLowerCase();
  if (payload.phone !== undefined) staff.phone = payload.phone.trim();
  if (payload.status !== undefined) {
    staff.status = payload.status;
    if (payload.status === "suspended") {
      staff.forceLogoutAt = new Date();
      await StaffSession.updateMany(
        { staffId: staff._id, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    }
  }
  if (payload.password) {
    staff.password = await bcrypt.hash(normalizePasswordInput(payload.password), 12);
    staff.passwordChangedAt = new Date();
    staff.forceLogoutAt = new Date();
    await StaffSession.updateMany(
      { staffId: staff._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }

  await staff.save();
  const hydrated = await Staff.findById(staff._id).populate("roleId");
  return normalizeStaff(hydrated);
}

async function deleteStaff(staffId) {
  const staff = await Staff.findById(staffId);
  if (!staff) throw new AppError("Staff account not found", 404, "NOT_FOUND");
  await StaffSession.updateMany(
    { staffId: staff._id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  await staff.deleteOne();
  return { _id: staffId };
}

async function forceLogoutStaff(staffId) {
  const staff = await Staff.findById(staffId);
  if (!staff) throw new AppError("Staff account not found", 404, "NOT_FOUND");

  const now = new Date();
  staff.forceLogoutAt = now;
  await staff.save();
  await StaffSession.updateMany({ staffId, revokedAt: null }, { $set: { revokedAt: now } });

  return { forced: true };
}

module.exports = {
  normalizeStaff,
  listStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  forceLogoutStaff,
};
