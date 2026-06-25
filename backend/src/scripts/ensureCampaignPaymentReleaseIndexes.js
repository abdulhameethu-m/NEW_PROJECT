require("../config/env");

const mongoose = require("mongoose");
const { connectDb } = require("../config/db");
const CampaignPaymentRelease = require("../models/CampaignPaymentRelease");
const { logger } = require("../utils/logger");

async function ensureCampaignPaymentReleaseIndexes() {
  const indexes = await CampaignPaymentRelease.collection.indexes();
  const legacyDeliverableIndex = indexes.find(
    (index) => index.name === "deliverableId_1" && index.key?.deliverableId === 1
  );
  if (legacyDeliverableIndex) {
    // Releases now store one or more IDs in deliverables.deliverableId. The
    // legacy unique index treats every new document's absent top-level field
    // as the same value and prevents every release after the first.
    await CampaignPaymentRelease.collection.dropIndex(legacyDeliverableIndex.name);
    logger.info("campaign_payment_release_index_migrated", { droppedIndex: legacyDeliverableIndex.name });
  }

  const hasReleaseKeyIndex = indexes.some(
    (index) => index.key?.releaseKey === 1 && index.unique && index.sparse
  );
  if (!hasReleaseKeyIndex) {
    await CampaignPaymentRelease.collection.createIndex(
      { releaseKey: 1 },
      { name: "releaseKey_1", unique: true, sparse: true }
    );
    logger.info("campaign_payment_release_index_created", { index: "releaseKey_1" });
  }
}

async function main() {
  try {
    await connectDb();
    await ensureCampaignPaymentReleaseIndexes();
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

if (require.main === module) {
  main().catch((error) => {
    logger.error("script_error", { error: "Campaign payment release index migration failed", details: error.message });
    process.exitCode = 1;
  });
}

module.exports = { ensureCampaignPaymentReleaseIndexes };
