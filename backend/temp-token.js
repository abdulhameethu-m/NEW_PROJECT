const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const { User } = require('./src/models/User');
  const user = await User.findOne({ email: 'abdulhameethu.m@gmail.com' });
  const tokenService = require('./src/services/token.service');
  const token = tokenService.generateAuthToken(user);
  console.log(token);
  process.exit();
});
