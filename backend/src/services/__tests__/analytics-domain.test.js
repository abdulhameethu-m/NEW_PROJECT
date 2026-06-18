const { logger } = require("../../utils/logger");
const assert = require("node:assert/strict");
const {
  AnalyticsEvent,
  CampaignMetrics,
  VendorMetrics,
  InfluencerMetrics,
  AdminMetrics,
} = require("../../modules/analytics/models");
const { __private__ } = require("../../modules/analytics/service");

function runTest(name, fn) {
  try {
    fn();
    logger.info("script_output", { value: `PASS ${name}` });
  } catch (error) {
    logger.error("script_error", { error: `FAIL ${name}` });
    throw error;
  }
}

runTest("unified analytics models use required production collections", () => {
  assert.equal(AnalyticsEvent.collection.collectionName, "analytics_events");
  assert.equal(CampaignMetrics.collection.collectionName, "campaign_metrics");
  assert.equal(VendorMetrics.collection.collectionName, "vendor_metrics");
  assert.equal(InfluencerMetrics.collection.collectionName, "influencer_metrics");
  assert.equal(AdminMetrics.collection.collectionName, "admin_metrics");
});

runTest("campaign metrics schema covers revenue, attribution, commission, escrow, and delivery fields", () => {
  [
    "clicks",
    "orders",
    "revenue",
    "commissionGenerated",
    "commissionApproved",
    "commissionPaid",
    "escrow",
    "released",
    "unreleased",
    "refund",
    "conversionRate",
    "averageOrderValue",
    "roi",
    "deliverablesSubmitted",
    "deliverablesApproved",
    "productsDelivered",
  ].forEach((field) => assert.ok(CampaignMetrics.schema.path(field), `${field} should exist`));
});

runTest("payment model rollup keeps model-specific revenue and earnings", () => {
  const totals = __private__.totalsFromCampaignMetrics([
    { paymentModel: "fixed", orders: 1, revenue: 1000, released: 400, totalEarnings: 400, state: "completed" },
    { paymentModel: "commission", orders: 2, revenue: 2000, commissionApproved: 150, totalEarnings: 150, state: "tracking_active" },
  ]);
  assert.equal(totals.campaignCount, 2);
  assert.equal(totals.orders, 3);
  assert.equal(totals.revenue, 3000);
  assert.equal(totals.completedCampaigns, 1);
  assert.equal(totals.activeCampaigns, 1);
  assert.equal(totals.paymentModelBreakdown.fixed.revenue, 1000);
  assert.equal(totals.paymentModelBreakdown.commission.earnings, 150);
});

logger.info("script_output", { value: "Unified analytics domain checks passed." });
