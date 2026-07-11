require("../config/env");

const mongoose = require("mongoose");
const { connectDb } = require("../config/db");
const { AffiliateLink } = require("../modules/commission/models");
const { logger } = require("../utils/logger");

function hasSameFields(index, fields) {
  const indexFields = Object.keys(index.key || {}).sort();
  return indexFields.length === fields.length && fields.every((field, position) => indexFields[position] === field);
}

async function ensureDeliverableAffiliateIndexes() {
  let indexes = await AffiliateLink.collection.indexes();
  const legacyFields = ["campaignId", "influencerId", "productId"].sort();
  const oldGlobalUnique = indexes.find(
    (index) => hasSameFields(index, legacyFields) && index.unique && !index.partialFilterExpression
  );

  if (oldGlobalUnique) {
    await AffiliateLink.collection.dropIndex(oldGlobalUnique.name);
    logger.info("affiliate_link_index_migrated", { droppedIndex: oldGlobalUnique.name });
    indexes = indexes.filter((index) => index.name !== oldGlobalUnique.name);
  }

  if (!indexes.some((index) => index.name === "deliverable_affiliate_link")) {
    await AffiliateLink.collection.createIndex(
      { campaignId: 1, deliverableId: 1, productId: 1 },
      {
        name: "deliverable_affiliate_link",
        unique: true,
        partialFilterExpression: { deliverableId: { $type: "objectId" } },
      }
    );
  }
}

async function main() {
  try {
    await connectDb();
    await ensureDeliverableAffiliateIndexes();
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

if (require.main === module) {
  main().catch((error) => {
    logger.error("script_error", { error: "Deliverable affiliate index migration failed", details: error.message });
    process.exitCode = 1;
  });
}

module.exports = { ensureDeliverableAffiliateIndexes };
