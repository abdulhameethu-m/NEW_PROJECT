const test = require("node:test");
const assert = require("node:assert/strict");

const CampaignFeeConfiguration = require("../../models/CampaignFeeConfiguration");
const CampaignDeliverableFunding = require("../../models/CampaignDeliverableFunding");
const CampaignEscrowLedger = require("../../models/CampaignEscrowLedger");
const PlatformRevenueTransaction = require("../../models/PlatformRevenueTransaction");
const feeService = require("../campaign-fee.service");

test("campaign funding models use isolated fixed-campaign collections", () => {
  assert.equal(CampaignFeeConfiguration.collection.collectionName, "campaign_fee_configurations");
  assert.equal(CampaignDeliverableFunding.collection.collectionName, "campaign_deliverable_funding");
  assert.equal(CampaignEscrowLedger.collection.collectionName, "campaign_escrow_ledger");
  assert.equal(PlatformRevenueTransaction.collection.collectionName, "platform_revenue_transactions");
});

test("fixed campaign accounting separates platform revenue and gateway expense", () => {
  assert.ok(CampaignEscrowLedger.schema.path("entryType").enumValues.includes("platform_revenue"));
  assert.ok(CampaignEscrowLedger.schema.path("entryType").enumValues.includes("gateway_expense"));
  assert.ok(CampaignEscrowLedger.schema.path("entryType").enumValues.includes("tax_collected"));
  assert.equal(PlatformRevenueTransaction.schema.path("paymentModel").enumValues.includes("fixed"), true);
  assert.equal(CampaignFeeConfiguration.schema.path("paymentModel").enumValues.includes("hybrid"), true);
  const idempotencyIndex = PlatformRevenueTransaction.schema.indexes().find(
    ([fields, options]) => fields.idempotencyKey === 1 && options.unique
  );
  assert.ok(idempotencyIndex);
});

test("fee calculator supports percentage, fixed, and hybrid admin rules", () => {
  const { feeAmount, describe } = feeService.__private__;
  assert.equal(feeAmount({ feeType: "percentage", percentageValue: 2 }, 3000), 60);
  assert.equal(feeAmount({ feeType: "fixed", fixedValue: 50 }, 3000), 50);
  assert.equal(
    feeAmount({ feeType: "hybrid", percentageValue: 2, fixedValue: 100 }, 3000),
    160
  );
  assert.equal(describe({ feeType: "hybrid", percentageValue: 2, fixedValue: 100 }), "2% + INR 100");
});

test("funding summary includes every active configuration with the same fee code", async () => {
  const original = feeService.activeConfigurations;
  feeService.activeConfigurations = async () => new Map([
    ["platform_fee", [
      { _id: "fee-1", feeName: "Platform Fee", feeCode: "platform_fee", feeType: "percentage", percentageValue: 2, calculationBase: "campaign_budget" },
      { _id: "fee-2", feeName: "Commission for Platform", feeCode: "platform_fee", feeType: "percentage", percentageValue: 5, calculationBase: "campaign_budget" },
    ]],
  ]);
  try {
    const summary = await feeService.calculateFundingSummary(1500);
    assert.equal(summary.platformFeeAmount, 105);
    assert.equal(summary.totalAmount, 1605);
    assert.deepEqual(summary.feeLines.map((line) => line.feeName), [
      "Platform Fee",
      "Commission for Platform",
    ]);
    assert.deepEqual(summary.feeLines.map((line) => line.amount), [30, 75]);
    assert.deepEqual(summary.feeLines.map((line) => line.paymentModel), ["all", "all"]);
  } finally {
    feeService.activeConfigurations = original;
  }
});

test("deliverable funding tracks allocation, release, refund, and remaining amounts", () => {
  const funding = new CampaignDeliverableFunding({
    campaignId: "507f1f77bcf86cd799439011",
    escrowWalletId: "507f1f77bcf86cd799439012",
    allocationKey: "0001",
    deliverableType: "reel",
    deliverableName: "Reel #1",
    allocatedAmount: 1500,
    releasedAmount: 500,
    refundedAmount: 250,
    remainingAmount: 750,
    status: "partially_released",
  });
  assert.equal(
    funding.allocatedAmount,
    funding.releasedAmount + funding.refundedAmount + funding.remainingAmount
  );
});
