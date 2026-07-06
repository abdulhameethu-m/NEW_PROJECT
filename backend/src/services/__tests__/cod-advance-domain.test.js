const assert = require("assert");
const codService = require("../cod.service");

const {
  calculateRuleAmount,
  resolveBestAdvanceRule,
  calculateCancellationDeduction,
} = codService._private;

function run() {
  assert.equal(
    calculateRuleAmount({ type: "FIXED", value: 200, basis: 1100 }),
    200,
    "fixed Tamil Nadu advance should be 200"
  );
  assert.equal(
    calculateRuleAmount({ type: "FIXED", value: 300, basis: 1100 }),
    300,
    "fixed Kerala advance should be 300"
  );

  const rules = [
    {
      name: "Tamil Nadu",
      state: "Tamil Nadu",
      district: "",
      advanceType: "FIXED",
      advanceValue: 200,
      priority: 20,
      isActive: true,
    },
    {
      name: "Coimbatore override",
      state: "Tamil Nadu",
      district: "Coimbatore",
      advanceType: "FIXED",
      advanceValue: 350,
      priority: 10,
      isActive: true,
    },
  ];
  const districtMatch = resolveBestAdvanceRule(rules, {
    state: "Tamil Nadu",
    district: "Coimbatore",
    orderValue: 1100,
  });
  assert.equal(districtMatch.source, "DISTRICT");
  assert.equal(districtMatch.rule.advanceValue, 350);

  const stateMatch = resolveBestAdvanceRule(rules, {
    state: "Tamil Nadu",
    district: "Madurai",
    orderValue: 1100,
  });
  assert.equal(stateMatch.source, "STATE");
  assert.equal(stateMatch.rule.advanceValue, 200);

  const globalMatch = resolveBestAdvanceRule(rules, {
    state: "Goa",
    district: "Panaji",
    orderValue: 1100,
  });
  assert.equal(globalMatch.source, "GLOBAL");
  assert.equal(globalMatch.rule, null);

  const zoneMatch = resolveBestAdvanceRule(
    [
      {
        name: "Tamil Nadu shipping zones",
        shippingZones: ["LOCAL", "REGIONAL"],
        advanceType: "FIXED",
        advanceValue: 250,
        priority: 30,
        isActive: true,
      },
    ],
    {
      shippingZone: "REGIONAL",
      orderValue: 1100,
    }
  );
  assert.equal(zoneMatch.source, "SHIPPING_ZONE");
  assert.equal(zoneMatch.rule.advanceValue, 250);

  const fixedRefund = calculateCancellationDeduction({
    config: {
      cancellationCharges: {
        isEnabled: true,
        type: "FIXED",
        amount: 50,
        applicableBeforeShipment: true,
      },
    },
    paymentMode: "COD",
    orderStatus: "Placed",
    advancePaid: 200,
  });
  assert.equal(fixedRefund.deductionAmount, 50);
  assert.equal(fixedRefund.refundableAmount, 150);

  const percentageRefund = calculateCancellationDeduction({
    config: {
      cancellationCharges: {
        isEnabled: true,
        type: "PERCENTAGE",
        amount: 20,
        applicableBeforeShipment: true,
      },
    },
    paymentMode: "COD",
    orderStatus: "Placed",
    advancePaid: 300,
  });
  assert.equal(percentageRefund.deductionAmount, 60);
  assert.equal(percentageRefund.refundableAmount, 240);

  const onlineRefund = calculateCancellationDeduction({
    config: {
      cancellationCharges: {
        isEnabled: true,
        onlineEnabled: true,
        type: "FIXED",
        amount: 100,
        applicableBeforeShipment: true,
      },
    },
    paymentMode: "ONLINE",
    orderStatus: "Placed",
    orderAmount: 1100,
  });
  assert.equal(onlineRefund.deductionAmount, 100);
  assert.equal(onlineRefund.refundableAmount, 1000);
}

run();
