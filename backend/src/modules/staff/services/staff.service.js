const bcrypt = require("bcryptjs");
const { Staff } = require("../models/Staff");
const { StaffSession } = require("../models/StaffSession");
const { Role } = require("../models/Role");
const { AppError } = require("../../../utils/AppError");

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
    permissions: staff.roleId?.permissions || {},
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

async function listStaff() {
  const staff = await Staff.find().populate("roleId").sort({ createdAt: -1 });
  return staff.map(normalizeStaff);
}

async function createStaff(payload) {
  const { name, email, phone, roleId, status, password } = payload;
  
  if (!name || !email || !phone || !roleId || !password) {
    throw new AppError("Missing required fields", 400, "VALIDATION_ERROR");
  }

  const existingEmail = await Staff.findOne({ email: email.toLowerCase() });
  if (existingEmail) throw new AppError("Email already in use", 400, "DUPLICATE_EMAIL");
  
  const existingPhone = await Staff.findOne({ phone });
  if (existingPhone) throw new AppError("Phone already in use", 400, "DUPLICATE_PHONE");

  const roleExists = await Role.findById(roleId);
  if (!roleExists) throw new AppError("Role not found", 400, "INVALID_ROLE");

  const hashedPassword = await bcrypt.hash(password, 12);

  const staff = new Staff({
    name,
    email: email.toLowerCase(),
    phone,
    roleId,
    status: status || "active",
    password: hashedPassword,
  });

  await staff.save();
  await staff.populate("roleId");
  
  return normalizeStaff(staff);
}

async function updateStaff(staffId, payload) {
  const { name, email, phone, roleId, status, password } = payload;
  
  const staff = await Staff.findById(staffId);
  if (!staff) throw new AppError("Staff not found", 404, "NOT_FOUND");

  if (email && email.toLowerCase() !== staff.email) {
    const existing = await Staff.findOne({ email: email.toLowerCase() });
    if (existing) throw new AppError("Email already in use", 400, "DUPLICATE_EMAIL");
    staff.email = email.toLowerCase();
  }

  if (phone && phone !== staff.phone) {
    const existing = await Staff.findOne({ phone });
    if (existing) throw new AppError("Phone already in use", 400, "DUPLICATE_PHONE");
    staff.phone = phone;
  }

  if (roleId && String(roleId) !== String(staff.roleId)) {
    const roleExists = await Role.findById(roleId);
    if (!roleExists) throw new AppError("Role not found", 400, "INVALID_ROLE");
    staff.roleId = roleId;
  }

  if (name) staff.name = name;
  if (status) staff.status = status;

  if (password) {
    staff.password = await bcrypt.hash(password, 12);
    staff.passwordChangedAt = new Date();
    staff.forceLogoutAt = new Date();
  }

  await staff.save();
  await staff.populate("roleId");

  return normalizeStaff(staff);
}

async function deleteStaff(staffId) {
  const staff = await Staff.findById(staffId);
  if (!staff) throw new AppError("Staff not found", 404, "NOT_FOUND");
  
  await StaffSession.deleteMany({ staffId });
  await staff.deleteOne();
  
  return { success: true };
}

async function forceLogoutStaff(staffId) {
  const staff = await Staff.findById(staffId);
  if (!staff) throw new AppError("Staff not found", 404, "NOT_FOUND");
  
  staff.forceLogoutAt = new Date();
  await staff.save();
  
  await StaffSession.updateMany(
    { staffId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  return { success: true };
}

module.exports = {
  normalizeStaff,
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  forceLogoutStaff,
};