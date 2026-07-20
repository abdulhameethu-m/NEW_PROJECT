require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { connectDb } = require("../config/db");
const { User, USER_ROLES } = require("../models/User");

const ADMIN_ROLES = ["admin", "super_admin", "support_admin", "finance_admin"];

function requireEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${name} is required to seed the admin account.`);
  }
  return value;
}

function assertStrongPassword(password) {
  if (password.length < 8 || password.length > 128) {
    throw new Error("ADMIN_PASSWORD must be between 8 and 128 characters.");
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(password)) {
    throw new Error("ADMIN_PASSWORD must contain uppercase, lowercase, and number characters.");
  }
}

function resolveAdminRole() {
  const role = String(process.env.ADMIN_ROLE || "super_admin").trim();
  if (!USER_ROLES.includes(role) || !ADMIN_ROLES.includes(role)) {
    throw new Error(`ADMIN_ROLE must be one of: ${ADMIN_ROLES.join(", ")}.`);
  }
  return role;
}

async function seedAdmin() {
  const name = requireEnv("ADMIN_NAME");
  const phone = requireEnv("ADMIN_PHONE");
  const email = requireEnv("ADMIN_EMAIL").toLowerCase();
  const password = requireEnv("ADMIN_PASSWORD");
  const role = resolveAdminRole();
  const executedBy = String(process.env.BOOTSTRAP_EXECUTED_BY || "cli").trim() || "cli";

  assertStrongPassword(password);

  await connectDb();

  const hashedPassword = await bcrypt.hash(password, 12);
  const now = new Date();
  const existing = await User.findOne({
    $or: [{ email }, { phone }],
  }).select("+password");

  const payload = {
    name,
    email,
    phone,
    password: hashedPassword,
    role,
    roles: [role],
    status: "active",
    updatedAt: now,
  };

  if (existing) {
    existing.set(payload);
    await existing.save();
    console.log(`Admin account updated for ${email} by ${executedBy}.`);
    return;
  }

  await User.create({
    ...payload,
    createdAt: now,
  });
  console.log(`Admin account created for ${email} by ${executedBy}.`);
}

seedAdmin()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(`Admin seed failed: ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
