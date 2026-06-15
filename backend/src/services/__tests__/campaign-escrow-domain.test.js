const test = require("node:test");
const assert = require("node:assert/strict");

process.env.RAZORPAY_KEY_ID ||= "rzp_test_CampaignEscrowTests";
process.env.RAZORPAY_KEY_SECRET ||= "campaignEscrowTestSecret123";

const { Campaign } = require("../../modules/campaign/model");
const { InfluencerLedger } = require("../../modules/commission/models");
const CampaignPaymentRelease = require("../../models/CampaignPaymentRelease");
const CampaignPaymentOrder = require("../../models/CampaignPaymentOrder");
const { AppError } = require("../../utils/AppError");
const { ApiError } = require("../../utils/ApiError");
const campaignEscrowService = require("../campaign-escrow.service");
const campaignFeeService = require("../campaign-fee.service");
const campaignPaymentService = require("../campaign-payment.service");

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
  const originalCalculate = campaignFeeService.calculateFundingSummary;
  campaignFeeService.calculateFundingSummary = async (budgetAmount, currency) => ({
    budgetAmount,
    escrowAmount: budgetAmount,
    platformFeeAmount: 250,
    gatewayFeeAmount: 75,
    taxAmount: 58.5,
    totalAmount: 10383.5,
    currency,
    feeLines: [{ feeCode: "platform_fee", amount: 250 }],
    feeConfigurationSnapshot: [{ feeCode: "platform_fee", amount: 250 }],
    feeSource: "Configured by Admin",
  });
  try {
    const cost = await campaignEscrowService.calculateCampaignCost("campaign-id");
    assert.deepEqual(cost, {
      budgetAmount: 10000,
      escrowAmount: 10000,
      platformFeeAmount: 250,
      gatewayFeeAmount: 75,
      taxAmount: 58.5,
      totalAmount: 10383.5,
      currency: "INR",
      feeLines: [{ feeCode: "platform_fee", amount: 250 }],
      feeConfigurationSnapshot: [{ feeCode: "platform_fee", amount: 250 }],
      feeSource: "Configured by Admin",
    });
  } finally {
    campaignFeeService.calculateFundingSummary = originalCalculate;
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

test("campaign gateway receipts are stable and payment order fields are uniquely indexed", () => {
  const { buildRazorpayReceipt } = campaignPaymentService.__testHelpers;
  const paymentOrderId = "507f1f77bcf86cd799439011";
  assert.equal(buildRazorpayReceipt(paymentOrderId), `campaign_${paymentOrderId}`);
  assert.equal(buildRazorpayReceipt(paymentOrderId), buildRazorpayReceipt(paymentOrderId));

  const receiptIndex = CampaignPaymentOrder.schema.indexes().find(
    ([fields, options]) => fields.razorpayReceipt === 1 && options.unique
  );
  assert.ok(receiptIndex);
});

test("campaign gateway timeout errors are retryable while rejected requests are definitive", () => {
  const { gatewayErrorDetails, isAmbiguousGatewayError } = campaignPaymentService.__testHelpers;
  assert.equal(isAmbiguousGatewayError({ code: "RAZORPAY_TIMEOUT" }), true);
  assert.equal(isAmbiguousGatewayError({ code: "ECONNRESET" }), true);
  assert.equal(isAmbiguousGatewayError({ response: { status: 502 } }), true);
  assert.equal(isAmbiguousGatewayError({ response: { status: 400 } }), false);
  assert.deepEqual(
    gatewayErrorDetails({ response: { status: 400, data: { error: { code: "BAD_REQUEST_ERROR", description: "Bad amount" } } } }),
    { code: "BAD_REQUEST_ERROR", message: "Bad amount", statusCode: 400 }
  );
});

test("campaign gateway responses must match amount, currency, receipt, and order shape", () => {
  const { validateGatewayOrder } = campaignPaymentService.__testHelpers;
  const paymentOrder = {
    totalAmount: 1530,
    currency: "INR",
    razorpayReceipt: "campaign_507f1f77bcf86cd799439011",
  };
  const validOrder = {
    id: "order_secure123",
    amount: 153000,
    currency: "INR",
    receipt: paymentOrder.razorpayReceipt,
  };
  assert.equal(validateGatewayOrder(validOrder, paymentOrder), validOrder);
  assert.throws(
    () => validateGatewayOrder({ ...validOrder, amount: 152999 }, paymentOrder),
    (error) => error instanceof AppError && error.code === "RAZORPAY_ORDER_MISMATCH"
  );
  assert.equal(new ApiError(504, "Gateway timeout", "RAZORPAY_TIMEOUT") instanceof AppError, true);
});
