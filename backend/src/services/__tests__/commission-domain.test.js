const { logger } = require("../../utils/logger");
const assert = require("node:assert/strict");
const commissionRuleService = require("../commission-rule.service");
const {
  CampaignCommissionRule,
  AffiliateLink,
  CampaignAffiliateClick,
  CampaignAffiliateAttribution,
  AffiliateConversion,
  CommissionEarning,
  CommissionWalletTransaction,
  CampaignBudgetTracker,
} = require("../../modules/commission/models");

function runTest(name, fn) {
  try {
    fn();
    logger.info("script_output", { value: `PASS ${name}` });
  } catch (error) {
    logger.error("script_error", { error: `FAIL ${name}` });
    throw error;
  }
}

runTest("percentage commission computes expected net", () => {
  const result = commissionRuleService.calculateFromRule({
    subtotal: 1000,
    rule: {
      _id: "rule1",
      name: "Default 10%",
      appliesTo: "global",
      priority: 0,
      type: "percentage",
      value: 10,
    },
  });
  assert.equal(result.commissionAmount, 100);
  assert.equal(result.vendorNetAmount, 900);
});

runTest("fixed commission computes expected net", () => {
  const result = commissionRuleService.calculateFromRule({
    subtotal: 500,
    rule: {
      _id: "rule2",
      name: "Flat 50",
      appliesTo: "vendor",
      priority: 1,
      type: "fixed",
      value: 50,
    },
  });
  assert.equal(result.commissionAmount, 50);
  assert.equal(result.vendorNetAmount, 450);
});

runTest("commission cannot exceed subtotal", () => {
  assert.throws(
    () =>
      commissionRuleService.calculateFromRule({
        subtotal: 200,
        rule: {
          _id: "rule3",
          name: "Too high fixed",
          appliesTo: "product",
          priority: 5,
          type: "fixed",
          value: 500,
        },
      }),
    /cannot exceed item subtotal/i
  );
});

runTest("commission campaign workflow models use required production collections", () => {
  assert.equal(CampaignCommissionRule.collection.collectionName, "campaign_commission_rules");
  assert.equal(AffiliateLink.collection.collectionName, "affiliate_links");
  assert.equal(CampaignAffiliateClick.collection.collectionName, "affiliate_clicks");
  assert.equal(CampaignAffiliateAttribution.collection.collectionName, "affiliate_attributions");
  assert.equal(AffiliateConversion.collection.collectionName, "affiliate_conversions");
  assert.equal(CommissionEarning.collection.collectionName, "commission_earnings");
  assert.equal(CommissionWalletTransaction.collection.collectionName, "commission_wallet_transactions");
  assert.equal(CampaignBudgetTracker.collection.collectionName, "campaign_budget_trackers");
});

runTest("campaign commission rules and trackers keep dynamic caps and windows", () => {
  assert.ok(CampaignCommissionRule.schema.path("commissionPercentage"));
  assert.ok(CampaignCommissionRule.schema.path("deliverableCommissionRates"));
  assert.ok(CampaignCommissionRule.schema.path("deliverableCommissionRates.commissionPercentage"));
  assert.ok(CampaignCommissionRule.schema.path("attributionWindowDays"));
  assert.ok(CampaignCommissionRule.schema.path("maxCampaignBudget"));
  assert.ok(CampaignCommissionRule.schema.path("commissionCap"));
  assert.ok(CampaignCommissionRule.schema.path("returnWindowDays"));
  assert.ok(CampaignBudgetTracker.schema.path("remainingBudget"));
  assert.ok(CampaignBudgetTracker.schema.path("remainingCap"));
});

logger.info("script_output", { value: "All commission domain checks passed." });

