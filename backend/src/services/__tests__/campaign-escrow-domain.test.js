const test = require("node:test");
const assert = require("node:assert/strict");

const { Campaign } = require("../../modules/campaign/model");
const { InfluencerLedger } = require("../../modules/commission/models");
const CampaignPaymentRelease = require("../../models/CampaignPaymentRelease");
const campaignEscrowService = require("../campaign-escrow.service");

function mockCampaignLookup(campaign) {
  const original = Campaign.findById;
  Campaign.findById = () => ({ lean: async () => campaign });
  return () => {
    Campaign.findById = original;
  };
}

test("fixed campaign cost keeps the creator budget fully escrowed", async () => {
  const restore = mockCampaignLookup({
    paymentType: "fixed",
    fixedFee: 10000,
    pricing: { fixedCost: 10000, currency: "INR" },
  });
  try {
    const cost = await campaignEscrowService.calculateCampaignCost("campaign-id");
    assert.deepEqual(cost, {
      budgetAmount: 10000,
      platformFeeAmount: 200,
      gatewayFeeAmount: 50,
      taxAmount: 45,
      totalAmount: 10295,
      currency: "INR",
    });
  } finally {
    restore();
  }
});

test("escrow pricing rejects non-fixed campaign models", async () => {
  const restore = mockCampaignLookup({
    paymentType: "commission",
    fixedFee: 10000,
    pricing: { fixedCost: 10000, currency: "INR" },
  });
  try {
    await assert.rejects(
      () => campaignEscrowService.calculateCampaignCost("campaign-id"),
      /not fixed payment/
    );
  } finally {
    restore();
  }
});

test("campaign releases use the influencer ledger and unique deliverable protection", () => {
  assert.equal(CampaignPaymentRelease.schema.path("walletTransactionId").options.ref, "InfluencerLedger");
  const uniqueIndex = CampaignPaymentRelease.schema.indexes().find(
    ([fields, options]) => fields["deliverables.deliverableId"] === 1 && options.unique
  );
  assert.ok(uniqueIndex);
  assert.ok(InfluencerLedger.schema.path("source").enumValues.includes("CAMPAIGN"));
});
