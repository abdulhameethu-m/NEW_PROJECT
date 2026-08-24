const axios = require('axios');
const mongoose = require("mongoose");
require("dotenv").config();
const { User } = require("./src/models/User");
const { signAccessToken } = require("./src/utils/jwt");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const admin = await User.findOne({ role: 'super_admin' }).lean();
  let token = "";
  if (admin) {
    token = signAccessToken(admin);
  } else {
    process.exit();
  }

  try {
    const response = await axios.get("http://localhost:5000/api/admin/returns", {
      headers: { Cookie: `accessToken=${token}` }
    });
    console.log("API returned length:", response.data.returns.length);
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("API Error:", error.response ? error.response.data : error.message);
  }
  process.exit();
}
run();
