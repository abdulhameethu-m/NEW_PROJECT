const { logger } = require("../../utils/logger");
const assert = require("node:assert/strict");

const ShippingWeightSlab = require("../../models/ShippingWeightSlab");
const { calculateCartWeight } = require("../../utils/cartWeightCalculator");
const { resolveZoneFromMatrix } = require("../shipping-zone-config.service");
const shippingPricingService = require("../shipping-pricing.service");

function runTest(name, fn) {
  try {
    fn();
    logger.info("script_output", { value: `PASS ${name}` });
  } catch (error) {
    logger.error("script_error", { error: `FAIL ${name}` });
    throw error;
  }
}

runTest("cart weight uses structured product weight and quantity", () => {
  const total = calculateCartWeight([
    { quantity: 2, product: { name: "Product A", weight: { value: 0.5, unit: "kg" } } },
    { quantity: 1, product: { name: "Product B", weight: { value: 1, unit: "kg" } } },
  ]);

  assert.equal(total, 2);
});

runTest("zone matrix resolves by district before defaulting", () => {
  const result = resolveZoneFromMatrix(
    {
      states: [
        {
          state: "Tamil Nadu",
          defaultZone: "REGIONAL",
          zones: {
            LOCAL: { cities: ["chennai"], districts: [], pincodes: [] },
            REGIONAL: { cities: ["salem"], districts: [], pincodes: [] },
            REMOTE: { cities: [], districts: ["nilgiris"], pincodes: ["643001"] },
          },
        },
      ],
    },
    {
      state: "Tamil Nadu",
      district: "Nilgiris",
      postalCode: "600001",
    }
  );

  assert.equal(result.zone, "REMOTE");
  assert.equal(result.matchedOn, "district");
});

runTest("shipping slab matches weights inside configured range", () => {
  const rule = new ShippingWeightSlab({
    state: "Tamil Nadu",
    zone: "LOCAL",
    weightFrom: 0.1,
    weightTo: 5,
    shippingCharge: 50,
  });

  assert.equal(rule.matchesWeight(0.5), true);
  assert.equal(rule.matchesWeight(5.1), false);
});

runTest("shipping slab stores fixed charge without per-kg formula", () => {
  const rule = new ShippingWeightSlab({
    state: "Tamil Nadu",
    zone: "LOCAL",
    weightFrom: 0.1,
    weightTo: 5,
    shippingCharge: 90,
  });

  assert.equal(rule.shippingCharge, 90);
});

runTest("cart weight preserves gram precision in kg values", () => {
  const total = calculateCartWeight([
    { quantity: 1, product: { name: "Product A", weight: { value: 0.1, unit: "kg" } } },
    { quantity: 1, product: { name: "Product B", weight: { value: 0.25, unit: "kg" } } },
  ]);

  assert.equal(total, 0.35);
});

runTest("dynamic weight expansion repeats the last configured shipping price per started kg", () => {
  const expansion = shippingPricingService.buildDynamicExpansion({
    slab: { weightTo: 1, shippingCharge: 50 },
    weight: 2.5,
  });

  assert.equal(expansion.additionalWeightBlocks, 2);
  assert.equal(expansion.finalCost, 150);
});

runTest("dynamic weight expansion uses the final configured slab price", () => {
  const expansion = shippingPricingService.buildDynamicExpansion({
    slab: { weightTo: 3, shippingCharge: 20 },
    weight: 8,
  });

  assert.equal(expansion.additionalWeightBlocks, 5);
  assert.equal(expansion.finalCost, 120);
});

logger.info("script_output", { value: "All shipping domain checks passed." });
