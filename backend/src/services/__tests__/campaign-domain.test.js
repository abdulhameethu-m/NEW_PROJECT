const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Campaign } = require("../../modules/campaign/model");
const { FIXED_PAYMENT_WORKFLOW_STATUSES } = require("../../modules/shared/constants");
const campaignRuleEngine = require("../campaign-rule-engine.service");

test("campaign model supports influencer applications and deliverables", () => {
  assert.equal(Campaign.collection.collectionName, "campaigns");
  assert.ok(Campaign.schema.path("applications"));
  assert.ok(Campaign.schema.path("deliverables"));
  assert.ok(Campaign.schema.path("productIds"));
});

test("fixed campaigns expose the escrow workflow and content gate", () => {
  assert.ok(Campaign.schema.path("fixedPaymentWorkflow.status"));
  assert.ok(Campaign.schema.path("fixedPaymentWorkflow.contentEnabled"));
  assert.deepEqual(FIXED_PAYMENT_WORKFLOW_STATUSES, [
    "awaiting_acceptance",
    "accepted_awaiting_funding",
    "funding_pending",
    "funded",
    "content_in_progress",
    "vendor_approved",
    "partially_released",
    "fully_released",
    "refund_pending",
    "refunded",
    "completed",
    "cancelled",
  ]);
});

test("fixed escrow release is exposed only through the admin route", () => {
  const routes = fs.readFileSync(
    path.join(__dirname, "../../modules/campaign/escrow.routes.js"),
    "utf8"
  );
  assert.match(routes, /"\/admin\/release-payment\/:campaignId"[\s\S]*?adminAuth/);
  assert.doesNotMatch(routes, /"\/release-payment\/:campaignId"[\s\S]*?vendorAuth/);
});

test("captured checkout verification securely reconciles escrow funding without waiting for localhost webhooks", () => {
  const paymentService = fs.readFileSync(
    path.join(__dirname, "../campaign-payment.service.js"),
    "utf8"
  );
  assert.match(
    paymentService,
    /verifyPaymentSignature\([\s\S]*?processCapturedCampaignPayment\([\s\S]*?checkout-verified:/
  );
});

test("campaign rule engine blocks invalid campaign payment combinations", () => {
  assert.throws(
    () => campaignRuleEngine.evaluateCampaignRules({
      campaignType: "affiliate",
      paymentType: "fixed",
      productIds: ["product-1"],
      fixedFee: 1000,
    }),
    /does not allow fixed payment/
  );
  assert.throws(
    () => campaignRuleEngine.evaluateCampaignRules({
      campaignType: "ugc",
      paymentType: "hybrid",
      productIds: ["product-1"],
      fixedFee: 1000,
      commissionPercent: 10,
      attributionDays: 30,
    }),
    /does not allow hybrid payment/
  );
});

test("campaign rule engine enables affiliate infrastructure for every campaign payment model", () => {
  const commission = campaignRuleEngine.evaluateCampaignRules({
    campaignType: "affiliate",
    paymentType: "commission",
    productIds: ["product-1"],
    commissionPercent: 12,
    attributionDays: 60,
  });
  assert.equal(commission.affiliateInfrastructure.enabled, true);
  assert.equal(commission.attributionDays, 60);

  const freeProduct = campaignRuleEngine.evaluateCampaignRules({
    campaignType: "video",
    paymentType: "free_product",
    productIds: ["product-1"],
  });
  assert.equal(freeProduct.affiliateInfrastructure.enabled, true);
  assert.equal(freeProduct.affiliateInfrastructure.commissionLedger, false);
  assert.equal(freeProduct.attributionDays, 30);
});

test("hybrid campaigns require escrowed fixed rewards while retaining commission tracking", () => {
  const campaignService = fs.readFileSync(path.join(__dirname, "../../modules/campaign/service.js"), "utf8");
  const escrowService = fs.readFileSync(path.join(__dirname, "../campaign-escrow.service.js"), "utf8");
  const executionService = fs.readFileSync(path.join(__dirname, "../../modules/campaign/executionService.js"), "utf8");
  assert.match(campaignService, /\["fixed", "hybrid"\]\.includes\(pricing\.paymentType\)/);
  assert.match(escrowService, /function hasFixedRewardCampaign/);
  assert.match(escrowService, /paymentType: \{ \$in: \["fixed", "hybrid"\] \}/);
  assert.match(executionService, /\["fixed", "hybrid"\]\.includes\(campaign\.paymentType\)/);
  assert.match(executionService, /\["commission", "hybrid"\]\.includes\(campaign\.paymentType\)/);
});

test("hybrid campaign budget display uses the escrowed fixed reward, not its commission reserve", () => {
  const campaignService = fs.readFileSync(path.join(__dirname, "../../modules/campaign/service.js"), "utf8");
  const commerceService = fs.readFileSync(path.join(__dirname, "../../modules/influencerCommerce/service.js"), "utf8");
  assert.match(campaignService, /\["fixed", "hybrid"\]\.includes\(campaign\.paymentType\)[\s\S]*?pricing\.fixedCost/);
  assert.match(commerceService, /\["fixed", "hybrid"\]\.includes\(campaign\.paymentType\)[\s\S]*?campaign\.pricing\?\.fixedCost/);
});

test("campaign rule engine rejects vendor-defined custom attribution windows", () => {
  assert.throws(
    () => campaignRuleEngine.evaluateCampaignRules({
      campaignType: "live_commerce",
      paymentType: "commission",
      productIds: ["product-1"],
      commissionPercent: 8,
      attributionDays: 45,
    }),
    /Selected attribution window is not allowed/
  );
});
