require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../config/db");

async function dropCollectionIfExists(db, name) {
  const collections = await db.listCollections({ name }).toArray();
  if (!collections.length) {
    console.log(`skip ${name}: not found`);
    return;
  }
  await db.dropCollection(name);
  console.log(`dropped ${name}`);
}

async function main() {
  await connectDB();
  const db = mongoose.connection.db;

  await Promise.all([
    db.collection("campaigns").updateMany({}, {
      $unset: {
        "marketplace.requirements": "",
        "contractSnapshot.requirements": "",
        "termsFrozen.requirementsSnapshot": "",
        requirementsSnapshot: "",
      },
    }),
    dropCollectionIfExists(db, "influencer_requirements"),
    dropCollectionIfExists(db, "influencer_requirement_fields"),
  ]);

  console.log("Influencer requirements cleanup complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
