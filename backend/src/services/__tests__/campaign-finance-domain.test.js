const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  CampaignFinanceSummary,
  CampaignFinanceOrder,
  CampaignFinanceVendorMetric,
  CampaignFinanceInfluencerMetric,
  CampaignFinanceAdminMetric,
} = require("../../modules/campaignFinance/model");

test("campaign finance uses isolated indexed read-model collections", () => {
  assert.equal(CampaignFinanceSummary.collection.collectionName, "campaign_finance_summary");
  assert.equal(CampaignFinanceOrder.collection.collectionName, "campaign_finance_orders");
  assert.equal(CampaignFinanceVendorMetric.collection.collectionName, "campaign_finance_vendor_metrics");
  assert.equal(CampaignFinanceInfluencerMetric.collection.collectionName, "campaign_finance_influencer_metrics");
  assert.equal(CampaignFinanceAdminMetric.collection.collectionName, "campaign_finance_admin_metrics");
  assert.ok(CampaignFinanceOrder.schema.path("influencerCommission"));
  assert.ok(CampaignFinanceOrder.schema.path("vendorNet"));
  assert.ok(CampaignFinanceSummary.schema.path("metrics"));
});

test("campaign finance exposes panel-specific APIs without replacing legacy finance APIs", () => {
  const app = fs.readFileSync(path.join(__dirname, "../../app.js"), "utf8");
  const vendorRoutes = fs.readFileSync(path.join(__dirname, "../../routes/vendor.routes.js"), "utf8");
  assert.match(app, /"\/api\/campaign-finance"/);
  assert.match(app, /"\/api\/campaigns\/:campaignId\/finance"/);
  assert.match(vendorRoutes, /"\/finance\/campaign-finance"/);
});
