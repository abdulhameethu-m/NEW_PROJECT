const mongoose = require('mongoose');

async function removeBudgets() {
  await mongoose.connect('mongodb://127.0.0.1:27017/vest');
  const db = mongoose.connection.db;
  
  const result = await db.collection('campaigndynamicfieldconfigs').deleteMany({
    $or: [
      { fieldName: 'maximumBudget' },
      { fieldName: 'commissionCap' },
      { key: 'maximumBudget' },
      { key: 'commissionCap' }
    ]
  });
  
  console.log('Deleted fields:', result);
  
  await mongoose.connection.close();
}

removeBudgets().catch(console.error);
