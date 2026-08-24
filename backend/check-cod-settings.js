const mongoose = require("mongoose");
require("dotenv").config();
const { CodSettings } = require("./src/models/CodSettings");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const s = await CodSettings.findOne();
    console.log(s);
  } finally {
    process.exit();
  }
}
run();
