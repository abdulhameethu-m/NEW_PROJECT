require("dotenv").config();

const mongoose = require("mongoose");
const { connectDb } = require("../config/db");
const PricingRule = require("../models/PricingRule");
const pricingCategoryService = require("../services/pricing-category.service");

async function main() {
  await connectDb();
  await pricingCategoryService.ensureDefaultPricingCategories();

  const rules = await PricingRule.find({});
  let updatedCount = 0;

  for (const rule of rules) {
    const resolvedCategory = await pricingCategoryService.resolveCategory({
      categoryId: rule.categoryId,
      categoryKey: rule.category,
      fallbackKey: "OTHER",
    });

    const needsUpdate =
      String(rule.categoryId || "") !== String(resolvedCategory._id) || rule.category !== resolvedCategory.key;

    if (!needsUpdate) continue;

    rule.category = resolvedCategory.key;
    rule.categoryId = resolvedCategory._id;
    await rule.save();
    updatedCount += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`Pricing category migration complete. Updated ${updatedCount} pricing rule(s).`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  // eslint-disable-next-line no-console
  console.error("Pricing category migration failed:", error);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    // ignore
  }
  process.exit(1);
});
