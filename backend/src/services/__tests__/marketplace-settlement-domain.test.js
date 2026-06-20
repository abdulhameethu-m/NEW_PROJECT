const test = require("node:test");
const assert = require("node:assert/strict");
const settlementService = require("../marketplace-settlement.service");

test("direct platform collection keeps shipping and fee with platform", () => {
  const result = settlementService.calculate({
    itemAmount: 10000,
    shippingAmount: 100,
    platformFee: 200,
    commissionAmount: 1000,
    rules: { shippingSettlementTarget: "PLATFORM", platformFeeSettlementTarget: "PLATFORM", vendorCommissionEnabled: true, version: 1 },
  });
  assert.equal(result.vendorGross, 10000);
  assert.equal(result.vendorNet, 9000);
  assert.equal(result.platformTotal, 1300);
});

test("vendor-targeted shipping and fee are included in vendor gross", () => {
  const result = settlementService.calculate({
    itemAmount: 10000,
    shippingAmount: 100,
    platformFee: 200,
    commissionAmount: 1000,
    rules: { shippingSettlementTarget: "VENDOR", platformFeeSettlementTarget: "VENDOR", vendorCommissionEnabled: false, version: 2 },
  });
  assert.equal(result.vendorGross, 10300);
  assert.equal(result.vendorNet, 10300);
  assert.equal(result.platformTotal, 0);
});
