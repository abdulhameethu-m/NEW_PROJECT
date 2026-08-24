require('dotenv').config();
const mongoose = require('mongoose');

async function debugCOD() {
  await mongoose.connect(process.env.MONGODB_URI);
  const CODConfig = require('./src/models/CODConfig');
  const config = await CODConfig.findOne({});
  console.log("COD Config in Database:", JSON.stringify(config, null, 2));
  process.exit(0);
}
debugCOD().catch(console.error);
