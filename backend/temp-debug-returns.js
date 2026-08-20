const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const orderService = require('./src/services/order.service');
  const { Order } = require('./src/models/Order');
  
  const rawOrder = await Order.findOne({ orderNumber: 'ORD-1787156431099-WKR5ZU' }).lean();
  console.log('Order found:', rawOrder.orderNumber);
  
  try {
    const order = await orderService.getForUser(rawOrder.userId, rawOrder._id);
    console.log('--- Result ---');
    console.log('returnEligible:', order.returnEligible);
    console.log('returnEligibilityMessage:', order.returnEligibilityMessage);
  } catch (err) {
    console.error('Error:', err);
  }
  
  process.exit(0);
});
