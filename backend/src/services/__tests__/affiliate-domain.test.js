const test = require("node:test");
const assert = require("node:assert/strict");
const {
  CampaignAffiliateClick,
  CampaignAffiliateAttribution,
  AffiliateConversion,
} = require("../../modules/commission/models");
const { TrackingSession } = require("../../modules/tracking/model");

test("affiliate engine uses canonical commission-owned collections", () => {
  assert.equal(CampaignAffiliateClick.collection.collectionName, "affiliate_clicks");
  assert.equal(CampaignAffiliateAttribution.collection.collectionName, "affiliate_attributions");
  assert.equal(AffiliateConversion.collection.collectionName, "affiliate_conversions");
  assert.ok(CampaignAffiliateClick.schema.path("trackingSessionId"));
  assert.ok(CampaignAffiliateClick.schema.path("trackingTokenId"));
  assert.ok(CampaignAffiliateAttribution.schema.path("expiresAt"));
  assert.ok(CampaignAffiliateAttribution.schema.path("orderId"));
  assert.ok(AffiliateConversion.schema.path("orderRevenue"));
  assert.ok(AffiliateConversion.schema.path("commissionAmount"));
});

test("tracking sessions keep attribution expiry and source fields", () => {
  assert.ok(TrackingSession.schema.path("expiresAt"));
  assert.ok(TrackingSession.schema.path("surface"));
  assert.ok(TrackingSession.schema.path("trackingTokenId"));
});
