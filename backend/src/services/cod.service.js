const crypto = require("crypto");
const { AppError } = require("../utils/AppError");
const CODConfig = require("../models/CODConfig");
const CODAdvanceRule = require("../models/CODAdvanceRule");
const Shipment = require("../models/Shipment");
const VendorOrder = require("../models/VendorOrder");
const { Order } = require("../models/Order");
const { Payment } = require("../models/Payment");
const { UserAddress } = require("../models/UserAddress");
const productRepo = require("../repositories/product.repository");
const userRepo = require("../repositories/user.repository");
const walletService = require("./wallet.service");
const { emitDomainEvent } = require("../modules/events/event-bus");

const COD_EVENTS = {
  COD_ORDER_PLACED: "COD_ORDER_PLACED",
  COD_COLLECTED: "COD_COLLECTED",
  SHIPMENT_CREATED: "SHIPMENT_CREATED",
  VENDOR_ORDER_CREATED: "VENDOR_ORDER_CREATED",
  SETTLEMENT_TRIGGERED: "SETTLEMENT_TRIGGERED",
};

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function normalizePostalCode(value = "") {
  return String(value || "").trim();
}

function normalizeState(value = "") {
  return String(value || "").trim().toLowerCase();
}

function normalizeLocation(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getRuleShippingZones(rule = {}) {
  const zones = Array.isArray(rule.shippingZones) ? rule.shippingZones : [];
  return zones.length ? zones : [rule.shippingZone].filter(Boolean);
}

function calculateRuleAmount({ type = "FIXED", value = 0, basis = 0, min = 0, max = 0 }) {
  const raw =
    String(type).toUpperCase() === "PERCENTAGE"
      ? (Number(basis || 0) * Number(value || 0)) / 100
      : Number(value || 0);
  let amount = roundMoney(Math.max(0, raw));
  if (Number(min || 0) > 0) amount = Math.max(amount, Number(min || 0));
  if (Number(max || 0) > 0) amount = Math.min(amount, Number(max || 0));
  return roundMoney(Math.min(amount, Number(basis || 0)));
}

function orderValueMatches(rule, orderValue) {
  const min = Number(rule?.minOrderValue || 0);
  const max = Number(rule?.maxOrderValue || 0);
  return Number(orderValue || 0) >= min && (max <= 0 || Number(orderValue || 0) <= max);
}

function resolveBestAdvanceRule(rules = [], { state = "", district = "", shippingZone = "", orderValue = 0 } = {}) {
  const normalizedState = normalizeLocation(state);
  const normalizedDistrict = normalizeLocation(district);
  const normalizedZone = normalizeLocation(shippingZone);
  const activeRules = (rules || [])
    .filter((rule) => rule?.isActive !== false && orderValueMatches(rule, orderValue))
    .sort((left, right) => Number(left.priority || 100) - Number(right.priority || 100));

  const districtRule = activeRules.find(
    (rule) =>
      normalizeLocation(rule.district) &&
      normalizeLocation(rule.district) === normalizedDistrict &&
      (!normalizeLocation(rule.state) || normalizeLocation(rule.state) === normalizedState)
  );
  if (districtRule) return { rule: districtRule, source: "DISTRICT" };

  const stateRule = activeRules.find(
    (rule) => normalizeLocation(rule.state) && normalizeLocation(rule.state) === normalizedState && !normalizeLocation(rule.district)
  );
  if (stateRule) return { rule: stateRule, source: "STATE" };

  const zoneRule = activeRules.find(
    (rule) => getRuleShippingZones(rule).some((zone) => normalizeLocation(zone) === normalizedZone)
  );
  if (zoneRule) return { rule: zoneRule, source: "SHIPPING_ZONE" };

  return { rule: null, source: "GLOBAL" };
}

function calculateCancellationDeduction({ config = {}, paymentMode = "COD", orderStatus = "", advancePaid = 0, orderAmount = 0 }) {
  const settings = config.cancellationCharges || {};
  if (!settings.isEnabled) return { enabled: false, deductionAmount: 0, refundableAmount: roundMoney(paymentMode === "COD" ? advancePaid : orderAmount) };
  if (paymentMode === "ONLINE" && !settings.onlineEnabled) {
    return { enabled: false, deductionAmount: 0, refundableAmount: roundMoney(orderAmount) };
  }

  const shipped = ["Shipped", "Out for Delivery", "Delivered"].includes(String(orderStatus || ""));
  if (shipped && !settings.applicableAfterShipment) {
    return { enabled: true, skipped: true, reason: "NOT_APPLICABLE_AFTER_SHIPMENT", deductionAmount: 0, refundableAmount: roundMoney(paymentMode === "COD" ? advancePaid : orderAmount) };
  }
  if (!shipped && !settings.applicableBeforeShipment) {
    return { enabled: true, skipped: true, reason: "NOT_APPLICABLE_BEFORE_SHIPMENT", deductionAmount: 0, refundableAmount: roundMoney(paymentMode === "COD" ? advancePaid : orderAmount) };
  }

  const basis = paymentMode === "COD" ? Number(advancePaid || 0) : Number(orderAmount || 0);
  const deductionAmount = calculateRuleAmount({
    type: settings.type,
    value: settings.amount,
    basis,
    min: settings.minimumDeduction,
    max: settings.maximumDeduction,
  });
  return {
    enabled: true,
    deductionAmount,
    refundableAmount: roundMoney(Math.max(0, basis - deductionAmount)),
    basis,
    type: settings.type,
  };
}

function buildSettlementRef(order) {
  return `cod_${String(order?._id || "")}_${crypto.randomBytes(4).toString("hex")}`;
}

class CODService {
  async resolveShippingAddress(userId, payload = {}) {
    if (payload.shippingAddress) return payload.shippingAddress;
    if (!payload.addressId) return null;

    const address = await UserAddress.findOne({ _id: payload.addressId, userId }).lean();
    if (!address) return null;

    return {
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
    };
  }

  async getConfig() {
    let config = await CODConfig.findOne({}).sort({ updatedAt: -1 });
    if (!config) {
      config = await CODConfig.create({});
    }
    return config;
  }

  async updateConfig(payload = {}, actorId = null) {
    const config = await this.getConfig();
    Object.assign(config, payload, { updatedBy: actorId || config.updatedBy });
    await config.save();
    
    // Clear checkout cache so the new COD settings are immediately reflected
    const checkoutService = require("./checkout.service");
    if (checkoutService && checkoutService.clearAllCaches) {
      checkoutService.clearAllCaches();
    }
    
    return config;
  }

  async listAdvanceRules(query = {}) {
    const filter = {};
    if (query.state) filter.state = new RegExp(`^${String(query.state).trim()}$`, "i");
    if (query.district) filter.district = new RegExp(`^${String(query.district).trim()}$`, "i");
    if (query.isActive !== undefined) filter.isActive = query.isActive === true || query.isActive === "true";
    return CODAdvanceRule.find(filter).sort({ priority: 1, updatedAt: -1 });
  }

  async createAdvanceRule(payload = {}, actorId = null) {
    return CODAdvanceRule.create({
      ...payload,
      createdBy: actorId || undefined,
      updatedBy: actorId || undefined,
    });
  }

  async updateAdvanceRule(ruleId, payload = {}, actorId = null) {
    const rule = await CODAdvanceRule.findByIdAndUpdate(
      ruleId,
      { $set: { ...payload, updatedBy: actorId || undefined } },
      { returnDocument: "after", runValidators: true }
    );
    if (!rule) throw new AppError("COD advance rule not found", 404, "COD_ADVANCE_RULE_NOT_FOUND");
    return rule;
  }

  async deleteAdvanceRule(ruleId, actorId = null) {
    const rule = await CODAdvanceRule.findByIdAndUpdate(
      ruleId,
      { $set: { isActive: false, updatedBy: actorId || undefined } },
      { returnDocument: "after" }
    );
    if (!rule) throw new AppError("COD advance rule not found", 404, "COD_ADVANCE_RULE_NOT_FOUND");
    return rule;
  }

  matchZoneRule(config, address = {}) {
    const postalCode = normalizePostalCode(address.postalCode);
    const state = normalizeState(address.state);
    return (config.zoneRules || []).find((rule) => {
      if (!rule.isActive) return false;
      const rulePostalCodes = Array.isArray(rule.postalCodes) ? rule.postalCodes.map(normalizePostalCode) : [];
      const ruleStates = Array.isArray(rule.states) ? rule.states.map(normalizeState) : [];
      return rulePostalCodes.includes(postalCode) || ruleStates.includes(state);
    }) || null;
  }

  getCodFeeFromCharges(charges = []) {
    return roundMoney(
      (charges || [])
        .filter((charge) => {
          const key = String(charge?.key || "").toLowerCase();
          const label = String(charge?.displayName || "").toLowerCase();
          return key.includes("cod") || label.includes("cod");
        })
        .reduce((sum, charge) => sum + Number(charge?.amount || 0), 0)
    );
  }

  async evaluateEligibility({ userId, address, cartItems = [], subtotal = 0, riskScore = null }) {
    const config = await this.getConfig();
    const reasons = [];

    if (!config.isEnabled) reasons.push("COD_DISABLED");
    if (!address?.postalCode) reasons.push("ADDRESS_REQUIRED");
    if (subtotal > Number(config.maxOrderValue || 0) && Number(config.maxOrderValue || 0) > 0) reasons.push("ORDER_VALUE_EXCEEDED");
    if (subtotal < Number(config.minOrderValue || 0)) reasons.push("ORDER_VALUE_BELOW_MINIMUM");

    const postalCode = normalizePostalCode(address?.postalCode);
    const state = normalizeState(address?.state);
    if ((config.restrictedPostalCodes || []).map(normalizePostalCode).includes(postalCode)) reasons.push("PINCODE_RESTRICTED");
    if ((config.restrictedStates || []).map(normalizeState).includes(state)) reasons.push("ZONE_RESTRICTED");

    const zoneRule = this.matchZoneRule(config, address);
    if (config.disabledForRemoteZones && zoneRule?.isRemote) reasons.push("REMOTE_ZONE_RESTRICTED");

    let effectiveRiskScore = Number.isFinite(Number(riskScore)) ? Number(riskScore) : 0;
    const user = userId ? await userRepo.findById(userId) : null;
    if (effectiveRiskScore === 0) {
      effectiveRiskScore = Number(user?.fraudScore || user?.riskScore || 0);
    }
    if (effectiveRiskScore > Number(config.maxRiskScore || 0)) reasons.push("HIGH_RISK_CUSTOMER");

    for (const item of cartItems) {
      const productId = item?.productId?._id || item?.productId;
      const sellerId = item?.sellerId?._id || item?.sellerId;
      if (productId && (config.restrictedProductIds || []).some((id) => String(id) === String(productId))) {
        reasons.push(`PRODUCT_RESTRICTED:${productId}`);
      }
      if (sellerId && (config.restrictedVendorIds || []).some((id) => String(id) === String(sellerId))) {
        reasons.push(`VENDOR_RESTRICTED:${sellerId}`);
      }

      if (productId && !sellerId) {
        const product = await productRepo.findById(productId);
        const resolvedSellerId = product?.sellerId || null;
        if (resolvedSellerId && (config.restrictedVendorIds || []).some((id) => String(id) === String(resolvedSellerId))) {
          reasons.push(`VENDOR_RESTRICTED:${resolvedSellerId}`);
        }
      }
    }

    return {
      codAvailable: reasons.length === 0,
      reasons,
      zoneRule,
      config,
      riskScore: effectiveRiskScore,
    };
  }

  async resolveAdvanceQuote({ address = {}, subtotal = 0, shippingFee = 0, orderTotal = 0, shippingZone = "" } = {}) {
    const config = await this.getConfig();
    const settings = config.advance || {};
    const basis = settings.includeShippingInBasis
      ? roundMoney(orderTotal || Number(subtotal || 0) + Number(shippingFee || 0))
      : roundMoney(subtotal);

    if (!settings.isEnabled) {
      return {
        enabled: false,
        advanceAmount: 0,
        remainingCODAmount: roundMoney(orderTotal || basis),
        basis,
        source: "DISABLED",
      };
    }

    const state = address.state || "";
    const district = address.district || address.city || "";
    const rules = await CODAdvanceRule.find({ isActive: true }).lean();
    const match = resolveBestAdvanceRule(rules, {
      state,
      district,
      shippingZone,
      orderValue: basis,
    });

    const rule = match.rule;
    const advanceType = rule?.advanceType || settings.defaultAdvanceType || "FIXED";
    const advanceValue = rule ? rule.advanceValue : settings.defaultAdvanceValue;
    const advanceAmount = calculateRuleAmount({
      type: advanceType,
      value: advanceValue,
      basis,
      min: settings.minAdvanceAmount,
      max: settings.maxAdvanceAmount,
    });
    const orderTotalValue = roundMoney(orderTotal || basis);

    return {
      enabled: true,
      advanceAmount,
      remainingCODAmount: roundMoney(Math.max(0, orderTotalValue - advanceAmount)),
      basis,
      orderTotal: orderTotalValue,
      source: match.source,
      ruleId: rule?._id || null,
      ruleName: rule?.name || "Global default",
      advanceType,
      advanceValue,
      state,
      district,
      tooltip:
        "You are paying only the advance amount now. The remaining amount must be paid to the delivery partner when the order is delivered.",
    };
  }

  async calculateCancellationRefund({ paymentMode = "COD", orderStatus = "", advancePaid = 0, orderAmount = 0 } = {}) {
    const config = await this.getConfig();
    return calculateCancellationDeduction({ config, paymentMode, orderStatus, advancePaid, orderAmount });
  }

  buildOrderPriceBreakdown({ pricingBreakdown = {}, subtotal = 0, shippingFee = 0, taxAmount = 0, discountAmount = 0, totalAmount = 0, paymentMethod = "COD", currency = "INR" }) {
    return {
      subtotal: roundMoney(subtotal),
      shippingFee: roundMoney(shippingFee),
      codFee: this.getCodFeeFromCharges(pricingBreakdown.charges || []),
      taxAmount: roundMoney(taxAmount),
      discountAmount: roundMoney(discountAmount),
      chargesTotal: roundMoney(pricingBreakdown.chargesTotal || 0),
      totalAmount: roundMoney(totalAmount),
      currency,
      paymentMethod,
      charges: pricingBreakdown.charges || [],
      calculatedAt: pricingBreakdown.calculatedAt ? new Date(pricingBreakdown.calculatedAt) : new Date(),
    };
  }

  async createShipmentRecord(order, { session = null } = {}) {
    const [shipment] = await Shipment.create(
      [
        {
          orderId: order._id,
          orderGroupId: order.orderGroupId || "",
          vendorId: order.sellerId?._id || order.sellerId,
          shipmentId: order.shipmentId || "",
          paymentMethod: order.paymentMethod,
          prepaid: order.paymentMethod === "ONLINE",
          shipmentStatus: "PENDING",
          shippingMode: order.shippingMode || "SELF",
          codAmountCollectable:
            order.paymentMethod === "COD"
              ? roundMoney(order.remainingCODAmount ?? order.codAdvance?.remainingCODAmount ?? order.totalAmount ?? 0)
              : 0,
          shippingAddressSnapshot: order.shippingAddress || {},
        },
      ],
      { session: session || undefined }
    );

    return shipment;
  }

  async createVendorOrderRecord(order, { session = null } = {}) {
    const [vendorOrder] = await VendorOrder.create(
      [
        {
          orderId: order._id,
          orderGroupId: order.orderGroupId || "",
          vendorId: order.sellerId?._id || order.sellerId,
          userId: order.userId?._id || order.userId,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          subtotal: order.subtotal,
          totalAmount: order.totalAmount,
          grossAmount: roundMoney(order.totalAmount || order.subtotal || 0),
          commissionAmount: roundMoney(order.platformCommissionAmount || 0),
          vendorNetAmount: roundMoney(order.vendorEarning || 0),
          codAmount:
            order.paymentMethod === "COD"
              ? roundMoney(order.remainingCODAmount ?? order.codAdvance?.remainingCODAmount ?? order.totalAmount ?? 0)
              : 0,
          shipmentId: order.shipmentId || "",
          settlementStatus:
            order.paymentMethod === "COD" ? "PENDING_COLLECTION" : "NOT_APPLICABLE",
          vendorSettlementStatus:
            order.paymentMethod === "COD" ? "PENDING_COLLECTION" : "NOT_APPLICABLE",
        },
      ],
      { session: session || undefined }
    );

    return vendorOrder;
  }

  async syncShipmentForOrder(order, changes = {}, { session = null } = {}) {
    return await Shipment.findOneAndUpdate(
      { orderId: order._id },
      { $set: changes },
      { returnDocument: "after", session: session || undefined }
    );
  }

  async collectPayment({ orderId, orderGroupId, actor = "SYSTEM", collectedAmount = null, reference = "", actorId = null }) {
    const query = orderId ? { _id: orderId } : { orderGroupId };
    const orders = await Order.find(query);
    if (!orders.length) {
      throw new AppError("COD order not found", 404, "COD_ORDER_NOT_FOUND");
    }

    const totalCollectable = roundMoney(
      orders.reduce(
        (sum, order) => sum + Number(order.remainingCODAmount ?? order.codAdvance?.remainingCODAmount ?? order.totalAmount ?? 0),
        0
      )
    );
    const amountToCollect = roundMoney(collectedAmount == null ? totalCollectable : collectedAmount);
    if (amountToCollect !== totalCollectable) {
      throw new AppError("Collected amount does not match COD payable total", 400, "COD_AMOUNT_MISMATCH");
    }

    const paymentRecordId = orders[0].paymentRecordId;
    const payment = paymentRecordId ? await Payment.findById(paymentRecordId) : null;
    const config = await this.getConfig();
    const holdDays = Number(config.vendorHoldDays || 0);
    const holdUntil = new Date(Date.now() + holdDays * 24 * 60 * 60 * 1000);

    for (const order of orders) {
      order.paymentStatus = "Paid";
      order.paymentCapturedAt = new Date();
      order.settlementStatus = "COLLECTED";
      order.cod.status = "collected";
      order.remainingCollected = true;
      order.cod.collectedAt = new Date();
      order.cod.collectedBy = String(actor || "SYSTEM");
      order.cod.collectedReference = String(reference || "");
      order.cod.holdUntil = holdUntil;
      order.payoutEligibleAt = holdUntil;
      if (order.attribution && !order.attribution.lockedAt) {
        order.attribution.lockedAt = new Date();
      }
      order.timeline = Array.isArray(order.timeline) ? order.timeline : [];
      order.timeline.push({
        status: "Placed",
        note: "COD payment collected",
        timestamp: new Date(),
      });
      await order.save();

      await VendorOrder.findOneAndUpdate(
        { orderId: order._id },
        {
          $set: {
            paymentStatus: "Paid",
            settlementStatus: "COLLECTED",
            vendorSettlementStatus: "COLLECTED",
          },
        }
      );

      await this.syncShipmentForOrder(order, {
        shipmentStatus: order.status === "Delivered" ? "DELIVERED" : "READY",
        codAmountCollectable: 0,
      });
    }

    if (payment) {
      payment.status = "PAID";
      payment.paidAt = new Date();
      payment.codDetails.status = "collected";
      payment.codDetails.collectedAt = new Date();
      payment.codDetails.collectedAmount = amountToCollect;
      payment.codDetails.collectedBy = actor;
      payment.codDetails.collectionReference = reference;
      await payment.save();
    }

    await emitDomainEvent(COD_EVENTS.COD_COLLECTED, {
      orderGroupId: orders[0].orderGroupId,
      paymentRecordId,
      amount: amountToCollect,
      actor,
      actorId,
    }).catch(() => {});

    await emitDomainEvent(COD_EVENTS.SETTLEMENT_TRIGGERED, {
      orderGroupId: orders[0].orderGroupId,
      orderIds: orders.map((order) => order._id),
      holdUntil,
    }).catch(() => {});

    return {
      orderGroupId: orders[0].orderGroupId,
      amountCollected: amountToCollect,
      orders,
      payment,
      holdUntil,
    };
  }

  async cancelCodOrder(orderId, { reason = "COD order cancelled" } = {}) {
    const order = await Order.findById(orderId);
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    if (order.paymentMethod !== "COD") throw new AppError("Order is not COD", 400, "INVALID_PAYMENT_METHOD");

    order.status = "Cancelled";
    order.paymentStatus = "Failed";
    order.cancelledAt = new Date();
    order.cancelReason = reason;
    order.settlementStatus = "CANCELLED";
    order.cod.status = "cancelled";
    order.timeline = Array.isArray(order.timeline) ? order.timeline : [];
    order.timeline.push({
      status: "Cancelled",
      note: reason,
      timestamp: new Date(),
    });
    await order.save();

    await VendorOrder.findOneAndUpdate(
      { orderId: order._id },
      { $set: { paymentStatus: "Failed", settlementStatus: "CANCELLED", vendorSettlementStatus: "CANCELLED" } }
    );
    await this.syncShipmentForOrder(order, { shipmentStatus: "CANCELLED", codAmountCollectable: 0 });

    if (order.paymentRecordId) {
      await Payment.findByIdAndUpdate(order.paymentRecordId, {
        $set: {
          status: "FAILED",
          "codDetails.status": "cancelled",
        },
      });
    }

    return order;
  }

  async settleCollectedOrder(orderId) {
    const order = await Order.findById(orderId);
    if (!order) throw new AppError("Order not found", 404, "NOT_FOUND");
    if (order.paymentMethod !== "COD") return { skipped: true, reason: "NOT_COD" };
    if (order.cod?.status !== "collected") return { skipped: true, reason: "NOT_COLLECTED" };

    const result = await walletService.settleOrderEarning(orderId);
    if (result?.skipped) return result;
    const settlementRef = buildSettlementRef(order);

    await Order.updateOne(
      { _id: orderId },
      { $set: { settlementStatus: "SETTLED" } }
    );
    await VendorOrder.updateOne(
      { orderId },
      { $set: { settlementStatus: "SETTLED", vendorSettlementStatus: "SETTLED" } }
    );
    if (result.ledgerEntry?._id) {
      const Ledger = require("../models/Ledger").Ledger;
      await Ledger.updateOne(
        { _id: result.ledgerEntry._id },
        {
          $set: {
            source: "COD_SETTLEMENT",
            codFee: this.getCodFeeFromCharges(order.priceBreakdown?.charges || order.chargesBreakdown || []),
            settlementRef,
          },
        }
      );
    }

    return { settled: true, settlementRef, result };
  }

  async getAnalytics({ days = 30 } = {}) {
    const start = new Date(Date.now() - Number(days || 30) * 24 * 60 * 60 * 1000);
    const orders = await Order.find({
      paymentMethod: "COD",
      createdAt: { $gte: start },
    }).select("status paymentStatus cod totalAmount createdAt");

    const total = orders.length;
    const collected = orders.filter((order) => order.cod?.status === "collected").length;
    const failed = orders.filter((order) => order.cod?.status === "failed" || order.status === "Cancelled").length;
    const rto = orders.filter((order) => order.status === "Returned").length;

    return {
      totalOrders: total,
      totalAmount: roundMoney(orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)),
      collectedOrders: collected,
      failedOrders: failed,
      returnedOrders: rto,
      successRate: total ? roundMoney((collected / total) * 100) : 0,
      failureRate: total ? roundMoney((failed / total) * 100) : 0,
      rtoPercentage: total ? roundMoney((rto / total) * 100) : 0,
    };
  }
}

module.exports = new CODService();
module.exports.COD_EVENTS = COD_EVENTS;
module.exports._private = {
  calculateRuleAmount,
  resolveBestAdvanceRule,
  getRuleShippingZones,
  calculateCancellationDeduction,
};
