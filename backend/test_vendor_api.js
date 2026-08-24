const axios = require('axios');
const mongoose = require("mongoose");
require("dotenv").config();
const { User } = require("./src/models/User");
const { signAccessToken } = require("./src/utils/jwt");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const vendor = await User.findOne({ email: 'abi@gmail.com' }).lean();
  let token = "";
  if (vendor) {
    token = signAccessToken(vendor);
  } else {
    process.exit();
  }

  try {
    const response = await axios.get("http://localhost:5000/api/vendor/returns", {
      headers: { Cookie: `accessToken=${token}` }
    });
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("API Error:", error.response ? error.response.data : error.message);
  }
  process.exit();
}
run();
