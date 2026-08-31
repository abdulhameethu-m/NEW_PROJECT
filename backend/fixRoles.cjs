const mongoose = require('mongoose');
require('dotenv').config();

async function fixRoles() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("No MongoDB URI found in .env");
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const Role = mongoose.models.Role || mongoose.model('Role', new mongoose.Schema({}, { strict: false }));
  
  const roles = await Role.find({});
  for (let role of roles) {
    if (!role.permissions) role.permissions = {};
    role.permissions.commission = { read: true, create: true, update: true, delete: true };
    role.permissions.escrowRefunds = { read: true, refund: true, reject: true };
    role.permissions.cancellationPolicies = { read: true, create: true, update: true, delete: true };
    role.permissions.codAdvance = { read: true, create: true, update: true, delete: true };
    role.permissions.invoices = { read: true, delete: true };
    role.permissions.influencers = { read: true, accept: true, delete: true };
    role.permissions.returns = { read: true, update: true };
    role.permissions.refunds = { read: true, refund: true };
    role.permissions.payments = { read: true, update: true };
    role.permissions.payouts = { read: true, approve: true, reject: true };
    role.permissions.financeInfluencers = { read: true, accept: true, delete: true };
    role.permissions.settlements = { read: true, settle: true, hold: true, release: true };

    await Role.updateOne({ _id: role._id }, { $set: { permissions: role.permissions } });
    console.log('Updated role:', role.name || role._id);
  }
  
  process.exit(0);
}

fixRoles().catch(console.error);
