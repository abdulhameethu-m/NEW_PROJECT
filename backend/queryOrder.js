require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const order = await mongoose.connection.collection('orders').findOne({ orderNumber: 'ORD-1787898148275-QIHNUW' });
  console.log(JSON.stringify(order, null, 2));
  process.exit();
}
run();
