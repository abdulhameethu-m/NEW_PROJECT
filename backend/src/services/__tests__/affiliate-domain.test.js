const test = require("node:test");
const assert = require("node:assert/strict");
const {
  AffiliateLink,
  CampaignAffiliateClick,
  CampaignAffiliateAttribution,
  AffiliateConversion,
  CommissionEarning,
} = require("../../modules/commission/models");
const { TrackingSession } = require("../../modules/tracking/model");
const { Reel } = require("../../modules/reel/model");

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

test("affiliate lifecycle is keyed by deliverable without invalidating legacy links", () => {
  assert.ok(AffiliateLink.schema.path("deliverableId"));
  assert.ok(CampaignAffiliateClick.schema.path("deliverableId"));
  assert.ok(CampaignAffiliateAttribution.schema.path("deliverableId"));
  assert.ok(AffiliateConversion.schema.path("deliverableId"));
  assert.ok(CommissionEarning.schema.path("deliverableId"));
  assert.ok(TrackingSession.schema.path("deliverableId"));
  assert.ok(Reel.schema.path("deliverableId"));

  const indexes = AffiliateLink.schema.indexes();
  assert.ok(indexes.some(([fields, options]) => fields.campaignId === 1 && fields.deliverableId === 1 && fields.productId === 1 && options.unique));
});

test("tracking sessions keep attribution expiry and source fields", () => {
  assert.ok(TrackingSession.schema.path("expiresAt"));
  assert.ok(TrackingSession.schema.path("surface"));
  assert.ok(TrackingSession.schema.path("trackingTokenId"));
});
