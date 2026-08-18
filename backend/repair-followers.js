const mongoose = require("mongoose");
const { connectDb } = require("./src/config/db");
const { InfluencerProfile, InfluencerFollower } = require("./src/modules/influencer/model");
const { config } = require("dotenv");

config();

async function repair() {
  await connectDb();
  const profiles = await InfluencerProfile.find().select("_id followers storeSlug");
  let fixedCount = 0;
  for (const profile of profiles) {
    const actualFollowers = await InfluencerFollower.countDocuments({ influencerId: profile._id });
    if (actualFollowers !== profile.followers) {
      console.log(`Fixing ${profile.storeSlug || profile._id}: ${profile.followers} -> ${actualFollowers}`);
      await InfluencerProfile.updateOne({ _id: profile._id }, { $set: { followers: actualFollowers } });
      fixedCount++;
    }
  }
  console.log(`Fixed ${fixedCount} profiles. Check complete.`);
  process.exit(0);
}

repair().catch(console.error);
