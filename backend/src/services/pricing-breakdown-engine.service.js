function toPlain(value) {
  if (!value) return {};
  return value.toObject ? value.toObject({ virtuals: true }) : value;
}

function roundMoney(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 100) / 100;
}

function compactObject(value = {}) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== "")
  );
}

function humanize(value = "") {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getChargeAmount(charge = {}) {
  return roundMoney(charge.amount ?? charge.calculatedAmount ?? charge.value ?? 0);
}

function getOrderCharges(order = {}) {
  const priceCharges = Array.isArray(order.priceBreakdown?.charges) ? order.priceBreakdown.charges : [];
  const snapshotCharges = Array.isArray(order.pricingSnapshot?.charges) ? order.pricingSnapshot.charges : [];
  const storedCharges = Array.isArray(order.chargesBreakdown) ? order.chargesBreakdown : [];
  return priceCharges.length ? priceCharges : snapshotCharges.length ? snapshotCharges : storedCharges;
}

function getMatchedShippingRule(charge = {}) {
  const metadata = charge.metadata || {};
  return (
    metadata.matchedRule ||
    metadata.configuredWeightRule ||
    metadata.weightRule ||
    metadata.rule ||
    {}
  );
}

function buildPricingSource(charge = {}) {
  return compactObject({
    configuredBy: "Pricing Configuration",
    configurationSource: "Admin Pricing",
    ruleName: charge.displayName || humanize(charge.key) || "Pricing rule",
    ruleId: charge.id || charge.ruleId || charge._id,
    calculationMethod: charge.type || charge.calculationMethod || "FIXED",
    priority: charge.priority ?? charge.sortOrder,
    status: charge.status || "Active",
    category: charge.category || "",
    paymentMethod: charge.paymentMethod || "ALL",
  });
}

function buildShippingSource(charge = {}, order = {}) {
  const metadata = charge.metadata || {};
  const rule = getMatchedShippingRule(charge);
  const state = metadata.state || rule.state || order.shippingAddress?.state || "";
  const district = metadata.district || rule.district || order.shippingAddress?.district || "";
  const zone = metadata.zone || rule.zone || "";
  const costBreakdown = metadata.costBreakdown || {};
  const dynamicExpansion = costBreakdown.dynamicExpansion || metadata.dynamicExpansion || {};
  const slab =
    rule.weightFrom !== undefined || rule.weightTo !== undefined
      ? `${rule.weightFrom ?? 0} kg - ${rule.weightTo ?? "open"} kg`
      : "";

  return compactObject({
    configuredBy: "Shipping Matrix",
    configurationSource: "Admin Shipping",
    ruleName: [state, district, zone].filter(Boolean).join(" / ") || "Shipping slab",
    ruleId: rule.id || rule._id || charge.id || charge.ruleId,
    calculationMethod: metadata.calculationMethod || costBreakdown.formula || "WEIGHT_SLAB",
    priority: rule.priority,
    status: rule.status || "Active",
    state,
    district,
    shippingZone: zone,
    shipmentWeight: metadata.weight || costBreakdown.weight,
    matchedWeightSlab: slab,
    fallbackApplied: metadata.fallbackApplied === true,
    dynamicExpansionApplied: metadata.dynamicExpansionApplied === true,
    expansionFormula: dynamicExpansion.formula || "",
    costFormula: costBreakdown.formula || "",
    settlementRecipient: rule.settlementRecipient || "",
  });
}

function buildChargeComponent(charge = {}, order = {}) {
  const isShipping = charge.key === "shipping_cost" || charge.category === "SHIPPING";
  return {
    key: charge.key || charge.id || "pricing_charge",
    label: charge.displayName || humanize(charge.key) || "Pricing charge",
    amount: getChargeAmount(charge),
    type: isShipping ? "SHIPPING" : "CHARGE",
    source: isShipping ? buildShippingSource(charge, order) : buildPricingSource(charge),
    metadata: charge.metadata || {},
  };
}

function buildCodAdvance(order = {}) {
  const advanceAmount = roundMoney(order.advanceAmount ?? order.codAdvance?.advanceAmount ?? 0);
  if (!(String(order.paymentMethod || "").toUpperCase() === "COD" && advanceAmount > 0)) return null;
  const remainingCODAmount = roundMoney(
    order.remainingCODAmount ?? order.codAdvance?.remainingCODAmount ?? Math.max(0, Number(order.totalAmount || 0) - advanceAmount)
  );

  return {
    enabled: true,
    advanceAmount,
    remainingCODAmount,
    paymentStatus: order.advancePaymentStatus || "",
    transactionId: order.advanceTransactionId || order.codAdvance?.razorpayPaymentId || "",
    paidAt: order.advancePaidAt || order.codAdvance?.paidAt || null,
    source: compactObject({
      configuredBy: "COD Advance Rules",
      configurationSource: "Admin Finance COD Advance",
      ruleName: order.codAdvance?.ruleName || "COD advance rule",
      ruleId: order.codAdvance?.ruleId,
      calculationMethod: "FIXED_ADVANCE_AMOUNT",
      status: order.codAdvance?.source || "Applied",
      state: order.codAdvance?.state || order.shippingAddress?.state || "",
      district: order.codAdvance?.district || order.shippingAddress?.district || "",
    }),
  };
}

function buildPayment(order = {}) {
  const paymentRecord = toPlain(order.paymentRecordId);
  return compactObject({
    method: order.paymentMethod || order.pricingSnapshot?.paymentMethod || order.priceBreakdown?.paymentMethod || "",
    mode: order.paymentMode || "",
    status: order.paymentStatus || "",
    transactionId: paymentRecord.razorpayPaymentId || order.advanceTransactionId || "",
    razorpayOrderId: paymentRecord.razorpayOrderId || order.advanceRazorpayOrderId || "",
    gatewayAmount: roundMoney(paymentRecord.amount || 0),
    refundedAmount: roundMoney(paymentRecord.refundedAmount || 0),
    refundStatus: paymentRecord.refundStatus || "",
  });
}

function buildTimeline(order = {}, breakdown = {}) {
  const events = [];
  const calculatedAt = order.priceBreakdown?.calculatedAt || order.pricingSnapshot?.calculatedAt || order.createdAt;
  if (calculatedAt) {
    events.push({
      key: "pricing_calculated",
      label: "Pricing calculated",
      timestamp: calculatedAt,
      source: "Unified Pricing Breakdown Engine",
      note: "Order subtotal, admin pricing charges, shipping, discounts, and payment totals were captured.",
    });
  }
  if (breakdown.shipping) {
    events.push({
      key: "shipping_priced",
      label: "Shipping rule applied",
      timestamp: calculatedAt || order.createdAt,
      source: "Admin Shipping",
      note: breakdown.shipping.source?.ruleName || "Shipping slab applied",
    });
  }
  if (breakdown.codAdvance?.enabled) {
    events.push({
      key: "cod_advance_applied",
      label: "COD advance applied",
      timestamp: breakdown.codAdvance.paidAt || calculatedAt || order.createdAt,
      source: "Admin Finance COD Advance",
      note: breakdown.codAdvance.source?.ruleName || "COD advance rule applied",
    });
  }
  if (order.refundSummary?.status && order.refundSummary.status !== "NONE") {
    events.push({
      key: "refund_priced",
      label: "Refund pricing calculated",
      timestamp: order.refundSummary.pendingSince || order.refundSummary.processedAt || order.updatedAt,
      source: "Cancellation Refund Engine",
      note: `Refund ${order.refundSummary.status}: ${roundMoney(order.refundSummary.amount)}`,
    });
  }
  return events;
}

class PricingBreakdownEngine {
  buildFromOrder(input = {}) {
    const order = toPlain(input);
    const charges = getOrderCharges(order).map((charge) => toPlain(charge));
    const subtotal = roundMoney(order.priceBreakdown?.subtotal ?? order.pricingSnapshot?.subtotal ?? order.subtotal);
    const shippingFee = roundMoney(order.shippingFee ?? order.priceBreakdown?.shippingFee);
    const taxAmount = roundMoney(order.taxAmount ?? order.priceBreakdown?.taxAmount);
    const discountAmount = roundMoney(order.discountAmount ?? order.priceBreakdown?.discountAmount);
    const currency = order.priceBreakdown?.currency || order.currency || "INR";
    const chargeComponents = charges.map((charge) => buildChargeComponent(charge, order));
    const hasShippingCharge = chargeComponents.some((component) => component.type === "SHIPPING");

    if (!hasShippingCharge && shippingFee > 0) {
      chargeComponents.push({
        key: "shipping_cost",
        label: "Shipping Fee",
        amount: shippingFee,
        type: "SHIPPING",
        source: buildShippingSource({ key: "shipping_cost", amount: shippingFee }, order),
        metadata: {},
      });
    }

    if (taxAmount > 0 && !chargeComponents.some((component) => component.key === "tax")) {
      chargeComponents.push({
        key: "tax",
        label: "Tax",
        amount: taxAmount,
        type: "TAX",
        source: compactObject({
          configuredBy: "Pricing Configuration",
          configurationSource: "Admin Pricing",
          ruleName: "Tax",
          calculationMethod: "CONFIGURED_TAX",
          status: "Active",
        }),
        metadata: {},
      });
    }

    const discounts = discountAmount > 0
      ? [
          {
            key: "discount",
            label: "Discount",
            amount: discountAmount,
            source: compactObject({
              configuredBy: "Pricing Configuration",
              configurationSource: "Admin Pricing",
              ruleName: "Discount",
              calculationMethod: "CONFIGURED_DISCOUNT",
              status: "Applied",
            }),
          },
        ]
      : [];

    const codAdvance = buildCodAdvance(order);
    const shipping = chargeComponents.find((component) => component.type === "SHIPPING") || null;
    const totalCharges = roundMoney(
      order.priceBreakdown?.chargesTotal ??
        order.pricingSnapshot?.chargesTotal ??
        order.chargesTotal ??
        chargeComponents.reduce((sum, component) => sum + Number(component.amount || 0), 0)
    );
    const grandTotal = roundMoney(order.priceBreakdown?.totalAmount ?? order.pricingSnapshot?.total ?? order.totalAmount);
    const components = [
      {
        key: "subtotal",
        label: "Subtotal",
        amount: subtotal,
        type: "SUBTOTAL",
        source: compactObject({
          configuredBy: "Order Items",
          configurationSource: "Order Snapshot",
          calculationMethod: "SUM_LINE_ITEMS",
          status: "Calculated",
        }),
        metadata: {
          itemCount: Array.isArray(order.items) ? order.items.length : 0,
        },
      },
      ...chargeComponents,
    ];

    const breakdown = {
      version: "pricing-breakdown-v1",
      currency,
      calculatedAt: order.priceBreakdown?.calculatedAt || order.pricingSnapshot?.calculatedAt || order.createdAt || null,
      subtotal,
      components,
      discounts,
      totalCharges,
      grandTotal,
      shipping,
      codAdvance,
      payment: buildPayment(order),
      refund: compactObject({
        status: order.refundSummary?.status || "",
        method: order.refundSummary?.method || "",
        grossAmount: roundMoney(order.refundSummary?.grossAmount || 0),
        deductionAmount: roundMoney(order.refundSummary?.deductionAmount || 0),
        amount: roundMoney(order.refundSummary?.amount || 0),
      }),
    };

    return {
      ...breakdown,
      timeline: buildTimeline(order, breakdown),
    };
  }

  attachToOrder(input = {}) {
    const order = toPlain(input);
    return {
      ...order,
      unifiedPricingBreakdown: this.buildFromOrder(order),
    };
  }
}

module.exports = new PricingBreakdownEngine();
