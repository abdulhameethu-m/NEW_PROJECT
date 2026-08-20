const mongoose = require('mongoose');
require('dotenv').config();
const { Order } = require('./src/models/Order');
const { Product } = require('./src/models/Product');
const { Subcategory } = require('./src/models/Subcategory');
const { Category } = require('./src/models/Category');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const orderService = require('./src/services/order.service');

  const rawOrder = await Order.findOne({ orderNumber: 'ORD-1787156431099-WKR5ZU' }).lean();
  console.log('User ID:', rawOrder.userId);
  console.log('Order ID:', rawOrder._id);

  try {
    const res = await orderService.getForUser(rawOrder.userId, rawOrder._id);
    console.log('Result returnEligible:', res.returnEligible);
    console.log('Result returnEligibilityMessage:', res.returnEligibilityMessage);
  } catch(e) {
    console.log('Error inside service call:', e.stack);
  }
  process.exit();
});
