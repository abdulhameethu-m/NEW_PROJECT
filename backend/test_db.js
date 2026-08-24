const mongoose = require("mongoose");
require("dotenv").config();
const { User } = require("./src/models/User");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({ name: { $regex: /abi/i } }).lean();
  console.log("Found users matching abi:", users.length);
  users.forEach(u => {
    console.log("ID:", u._id, "Email:", u.email, "Role:", u.role, "VendorId:", u.vendorId);
  });
  process.exit();
}
run();
