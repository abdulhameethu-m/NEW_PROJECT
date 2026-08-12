const mongoose = require('mongoose');
require('dotenv').config({ path: 'e:/GRM/PROJ/NEW_PROJECT/backend/.env' });
const influencerService = require('e:/GRM/PROJ/NEW_PROJECT/backend/src/modules/influencer/service.js');
const { InfluencerProfile } = require('e:/GRM/PROJ/NEW_PROJECT/backend/src/modules/influencer/model.js');

async function testService() {
  await mongoose.connect('mongodb://127.0.0.1:27017/amazon_likee');
  
  const profile = await InfluencerProfile.findOne().lean();
  if (!profile) return console.log("No profile");
  
  const payload = {
    accountDetails: JSON.stringify({
      additionalBankAccounts: [{
        payoutMethod: "bank_transfer",
        accountHolderName: "TEST ACCOUNT FROM SCRIPT",
        bankName: "TEST BANK",
        branchName: "TEST BRANCH",
        isPrimary: false
      }]
    })
  };
  
  try {
    await influencerService.updateSettings(profile.userId, payload);
    const settings = await influencerService.getSettings(profile.userId);
    console.log("Fetched additionalBankAccounts:", JSON.stringify(settings.paymentProfile.additionalBankAccounts, null, 2));
  } catch (err) {
    console.error(err);
  }
  
  mongoose.disconnect();
}
testService();
