const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const userService = require('./src/services/user.service');
  
  try {
    const res = await userService.getOrder('6a730661107ee92890f85325', '6a85d7cf4029bae6d51c148f');
    console.log('--- Verification Result ---');
    console.log('returnEligible:', res.returnEligible);
    console.log('returnEligibilityMessage:', res.returnEligibilityMessage);
  } catch(e) {
    console.log('Error inside service call:', e.stack);
  }
  process.exit();
});
