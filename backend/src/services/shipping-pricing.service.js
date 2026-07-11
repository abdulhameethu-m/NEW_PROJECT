const { AppError } = require("../utils/AppError");
const ShippingWeightSlab = require("../models/ShippingWeightSlab");
const { calculateCartWeight, validateAllItemsHaveWeight } = require("../utils/cartWeightCalculator");
const { resolveZone, getZoneConfig } = require("./shipping-zone-config.service");

function normalizeToken(value = "") {
  return ShippingWeightSlab.normalizeToken(value);
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

class ShippingPricingService {
  constructor() {
    this.cacheTtlMs = 60 * 1000;
    this.slabCache = new Map();
  }

  clearCache() {
    this.slabCache.clear();
  }

  roundWeight(value) {
    return Math.round(Number(value || 0) * 1000) / 1000;
  }

  buildCacheKey({ stateKey, districtKey, zone, weight }) {
    return [stateKey, districtKey || "-", zone, this.roundWeight(weight)].join("|");
  }

  buildRuleQuery({ stateKey, districtKey, zone }) {
    return {
      stateKey,
      zone,
      status: "active",
      $or: [{ districtKey }, { districtKey: "" }, { districtKey: { $exists: false } }],
    };
  }

  async determineZone(address) {
    const result = await resolveZone(address || {});
    return result.zone;
  }

  async findApplicableSlab({ state, district, zone, weight }) {
    const stateKey = normalizeToken(state);
    const districtKey = normalizeToken(district);
    const normalizedZone = String(zone || "").trim().toUpperCase();
    const roundedWeight = this.roundWeight(weight);

    if (!stateKey) {
      throw new AppError("Shipping state is required", 400, "SHIPPING_STATE_REQUIRED");
    }
    if (!normalizedZone) {
      throw new AppError("Shipping zone could not be resolved", 400, "SHIPPING_ZONE_REQUIRED");
    }

    const cacheKey = this.buildCacheKey({ stateKey, districtKey, zone: normalizedZone, weight: roundedWeight });
    const cached = this.slabCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.slab;
    }

    const slab = await ShippingWeightSlab.findOne({
      ...this.buildRuleQuery({ stateKey, districtKey, zone: normalizedZone }),
      weightFrom: { $lte: roundedWeight },
      weightTo: { $gte: roundedWeight },
    })
      .sort({ districtKey: districtKey ? -1 : 1, priority: 1, weightFrom: 1, createdAt: 1 })
      .lean();

    this.slabCache.set(cacheKey, {
      slab,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return slab;
  }

  async getFallbackSlab({ state, district, zone }) {
    const stateKey = normalizeToken(state);
    const districtKey = normalizeToken(district);
    const normalizedZone = String(zone || "").trim().toUpperCase();

    if (!stateKey) {
      throw new AppError("Shipping state is required", 400, "SHIPPING_STATE_REQUIRED");
    }
    if (!normalizedZone) {
      throw new AppError("Shipping zone could not be resolved", 400, "SHIPPING_ZONE_REQUIRED");
    }

    const query = {
      ...this.buildRuleQuery({ stateKey, districtKey, zone: normalizedZone }),
      isFallback: true,
    };

    const fallbackSlab = await ShippingWeightSlab.findOne(query)
      .sort({ districtKey: -1, priority: 1, createdAt: 1 })
      .lean();

    if (fallbackSlab) return fallbackSlab;

    const parentDistrictQuery = {
      ...this.buildRuleQuery({ stateKey, districtKey: "", zone: normalizedZone }),
      isFallback: true,
    };

    return ShippingWeightSlab.findOne(parentDistrictQuery)
      .sort({ priority: 1, createdAt: 1 })
      .lean();
  }

  buildRulePayload(slab) {
    if (!slab) return null;
    return {
      id: slab._id,
      state: slab.state,
      district: slab.district || "",
      zone: slab.zone,
      weightFrom: slab.weightFrom,
      weightTo: slab.weightTo,
      shippingCharge: slab.shippingCharge,
      priority: slab.priority || 0,
      settlementRecipient: slab.settlementRecipient || "ADMIN",
    };
  }

  buildCostBreakdown(slab, weight, dynamicExpansion = null) {
    if (!slab) return null;
    return {
      weight: this.roundWeight(weight),
      weightFrom: slab.weightFrom,
      weightTo: slab.weightTo,
      shippingCharge: roundMoney(slab.shippingCharge),
      finalCost: roundMoney(dynamicExpansion?.finalCost ?? slab.shippingCharge),
      formula: dynamicExpansion ? "DYNAMIC_WEIGHT_EXPANSION" : "WEIGHT_SLAB",
      dynamicExpansion,
    };
  }

  buildDynamicExpansion({ slab, weight }) {
    const roundedWeight = this.roundWeight(weight);
    const highestConfiguredWeight = Number(slab.weightTo);
    const baseShippingPrice = roundMoney(slab.shippingCharge);
    const remainingWeight = Math.max(0, roundedWeight - highestConfiguredWeight);
    const additionalWeightBlocks = Math.max(0, Math.ceil(remainingWeight));
    const finalCost = roundMoney(baseShippingPrice + additionalWeightBlocks * baseShippingPrice);

    return {
      highestConfiguredWeight: this.roundWeight(highestConfiguredWeight),
      highestShippingPrice: baseShippingPrice,
      remainingWeight: this.roundWeight(remainingWeight),
      additionalWeightBlocks,
      finalCost,
      formula: `${baseShippingPrice} + (${additionalWeightBlocks} × ${baseShippingPrice})`,
    };
  }

  async calculateShipping({
    weight,
    state = "Tamil Nadu",
    district = "",
    zone,
    fallbackCost = 0,
    matchedOn,
  } = {}) {
    const roundedWeight = this.roundWeight(weight);
    const derivedState = String(state || "").trim();
    const derivedDistrict = String(district || "").trim();
    const normalizedZone = String(zone || "").trim().toUpperCase();

    if (!Number.isFinite(roundedWeight) || roundedWeight <= 0) {
      throw new AppError("Shipping weight must be greater than zero", 400, "INVALID_SHIPPING_WEIGHT");
    }

    const exactSlab = await this.findApplicableSlab({
      state: derivedState,
      district: derivedDistrict,
      zone: normalizedZone,
      weight: roundedWeight,
    });

    if (exactSlab) {
      return {
        cost: roundMoney(exactSlab.shippingCharge),
        weight: roundedWeight,
        zone: normalizedZone,
        state: derivedState,
        district: derivedDistrict,
        rule: this.buildRulePayload(exactSlab),
        slab: this.buildRulePayload(exactSlab),
        matchedRule: this.buildRulePayload(exactSlab),
        configuredWeightRule: this.buildRulePayload(exactSlab),
        calculationMethod: "EXACT_RULE",
        costBreakdown: this.buildCostBreakdown(exactSlab, roundedWeight),
        ruleApplied: true,
        fallbackApplied: false,
        dynamicExpansionApplied: false,
        matchType: exactSlab.districtKey ? "district_zone_weight_slab" : "state_zone_weight_slab",
        matchedOn,
      };
    }

    const fallbackSlab = await this.getFallbackSlab({
      state: derivedState,
      district: derivedDistrict,
      zone: normalizedZone,
    });

    if (!fallbackSlab) {
      throw new AppError(
        "No fallback shipping rule configured.",
        400,
        "NO_FALLBACK_SHIPPING_RULE"
      );
    }

    const dynamicExpansion = this.buildDynamicExpansion({ slab: fallbackSlab, weight: roundedWeight });

    return {
      cost: dynamicExpansion.finalCost,
      weight: roundedWeight,
      zone: normalizedZone,
      state: derivedState,
      district: derivedDistrict,
      rule: this.buildRulePayload(fallbackSlab),
      slab: this.buildRulePayload(fallbackSlab),
      matchedRule: this.buildRulePayload(fallbackSlab),
      configuredWeightRule: this.buildRulePayload(fallbackSlab),
      calculationMethod: "FALLBACK_EXPANSION",
      costBreakdown: this.buildCostBreakdown(fallbackSlab, roundedWeight, dynamicExpansion),
      ruleApplied: true,
      fallbackApplied: true,
      dynamicExpansionApplied: true,
      matchType: fallbackSlab.districtKey ? "district_zone_fallback_expansion" : "state_zone_fallback_expansion",
      matchedOn,
      note: "No exact weight slab matched; extended pricing from the configured fallback rule",
    };
  }

  async calculateShippingCost({
    cartItems,
    shippingAddress,
    state = "Tamil Nadu",
    district,
    fallbackCost = 0,
  } = {}) {
    try {
      validateAllItemsHaveWeight(cartItems);
      const weight = calculateCartWeight(cartItems);
      const derivedState = String(shippingAddress?.state || state || "").trim();
      const derivedDistrict = String(
        shippingAddress?.district || district || shippingAddress?.city || ""
      ).trim();

      const zoneResult = await resolveZone({
        ...shippingAddress,
        state: derivedState,
        district: derivedDistrict,
      });

      return await this.calculateShipping({
        state: derivedState,
        district: derivedDistrict,
        zone: zoneResult.zone,
        weight,
        fallbackCost,
        matchedOn: zoneResult.matchedOn,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Shipping calculation error: ${error.message}`, 500, "SHIPPING_CALCULATION_ERROR");
    }
  }

  async calculateShippingByZone({ cartItems, shippingAddress, state = "Tamil Nadu" } = {}) {
    try {
      validateAllItemsHaveWeight(cartItems);
      const weight = calculateCartWeight(cartItems);
      const derivedState = String(shippingAddress?.state || state || "").trim();
      const derivedDistrict = String(shippingAddress?.district || shippingAddress?.city || "").trim();
      const zone = await this.determineZone({ ...shippingAddress, state: derivedState, district: derivedDistrict });
      const result = await this.calculateShipping({ state: derivedState, district: derivedDistrict, zone, weight });

      return result.ruleApplied
        ? [
            {
              zone,
              weight: this.roundWeight(weight),
              cost: result.cost,
              rule: result.rule,
              calculationMethod: result.calculationMethod,
              costBreakdown: result.costBreakdown,
            },
          ]
        : [];
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Zone shipping calculation error: ${error.message}`, 500);
    }
  }

  async checkFreeShipping({ cartItems, shippingAddress, state = "Tamil Nadu" } = {}) {
    const result = await this.calculateShippingCost({ cartItems, shippingAddress, state });
    return {
      isFree: result.cost === 0,
      reason: result.cost === 0 ? "Matched zero-value weight slab" : "Matched paid weight slab",
      cost: result.cost,
    };
  }

  async getAllRules({ state = "Tamil Nadu", activeOnly = true } = {}) {
    const query = {};
    if (state) query.stateKey = normalizeToken(state);
    if (activeOnly) query.status = "active";
    return ShippingWeightSlab.find(query).sort({ zone: 1, priority: 1, weightFrom: 1 }).lean();
  }

  async validateConfiguration() {
    const [rules, zoneConfig] = await Promise.all([
      ShippingWeightSlab.find({ status: "active" }).lean(),
      getZoneConfig(),
    ]);

    if (rules.length === 0) {
      return {
        isValid: false,
        warning: "No active shipping weight slabs configured",
        rulesCount: 0,
        zoneStatesCount: zoneConfig.states.length,
      };
    }

    return {
      isValid: true,
      rulesCount: rules.length,
      states: Array.from(new Set(rules.map((rule) => rule.state))),
      districts: Array.from(new Set(rules.map((rule) => rule.district).filter(Boolean))),
      zones: Array.from(new Set(rules.map((rule) => rule.zone))),
      zoneStatesCount: zoneConfig.states.length,
    };
  }
}

module.exports = new ShippingPricingService();
