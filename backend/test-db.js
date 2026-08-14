const mongoose = require('mongoose');
const { HomepageContainer } = require('./src/models/HomepageContainer');

require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/uchooseme');
  const containers = await HomepageContainer.find({ status: 'ACTIVE' }).lean();
  console.log(JSON.stringify(containers, null, 2));
  process.exit(0);
}
test();
