const { logger } = require("../utils/logger");
require("../config/env");

const { connectDb } = require("../config/db");
const ShippingWeightSlab = require("../models/ShippingWeightSlab");

async function main() {
  await connectDb();

  const payload = {
    state: "Tamil Nadu",
    district: "",
    zone: "LOCAL",
    weightFrom: 0.1,
    weightTo: 5,
    shippingCharge: 50,
    status: "active",
    description: "Sample local shipping slab seeded from script",
    priority: 0,
  };

  const existing = await ShippingWeightSlab.findOne({
    stateKey: ShippingWeightSlab.normalizeToken(payload.state),
    districtKey: "",
    zone: payload.zone,
    weightFrom: payload.weightFrom,
    weightTo: payload.weightTo,
  });

  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    logger.info("Shipping rule updated:", { value: existing._id.toString() });
    process.exit(0);
  }

  const created = await ShippingWeightSlab.create(payload);
  logger.info("Shipping rule created:", { value: created._id.toString() });
  process.exit(0);
}

main().catch((error) => {
  logger.error("script_error", { error: error });
  process.exit(1);
});
