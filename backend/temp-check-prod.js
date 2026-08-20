const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const { Product } = require('./src/models/Product');
  const { Subcategory } = require('./src/models/Subcategory');
  
  const p = await Product.findOne({ name: 'apple i phoneee' }).populate('subCategoryId').lean();
  console.log('Product Name:', p.name);
  console.log('Product Category:', p.categoryId);
  console.log('SubCategory:', p.subCategoryId?.name, p.subCategoryId?._id);
  process.exit();
});
