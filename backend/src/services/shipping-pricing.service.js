const { AppError } = require("../utils/AppError");
const ShippingConfig = require("../models/ShippingConfig");
const { calculateCartWeight, validateAllItemsHaveWeight } = require("../utils/cartWeightCalculator");
const {
  resolveZone,
  getZoneConfig,
} = require("./shipping-zone-config.service");

/**
 * Shipping Pricing Service
 * 
 * Calculates shipping costs based on:
 * - Product weight (in kg)
 * - Location/Zone (Tamil Nadu zones)
 * - Admin-configured pricing rules
 */

class ShippingPricingService {
  constructor() {
    this.cacheTtlMs = 60 * 1000;
    this.rulesCache = new Map();
  }

  clearCache() {
    this.rulesCache.clear();
  }

  async determineZone(address) {
    const result = await resolveZone(address || {});
    return result.zone;
  }

  async getCachedRules(state) {
    const cacheKey = String(state || "").trim().toLowerCase() || "all states";
    const cached = this.rulesCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.rules;
    }

    const escapedState = String(state || "")
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rules = await ShippingConfig.find({
      isActive: true,
      $or: [{ state: new RegExp(`^${escapedState}$`, "i") }, { state: "All States" }],
    })
      .sort({ sortOrder: 1, minWeight: 1, createdAt: 1 })
      .lean();

    this.rulesCache.set(cacheKey, {
      rules,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return rules;
  }

  getRuleCandidates(rules, { state, weight, orderTotal = 0 }) {
    const normalizedState = String(state || "").trim().toLowerCase();
    const candidates = rules.filter((rule) => {
      const normalizedRuleState = String(rule.state || "").trim().toLowerCase();
      const matchesState = normalizedRuleState === normalizedState || normalizedRuleState === "all states";
      const matchesWeight = weight >= rule.minWeight && weight <= rule.maxWeight;
      const matchesMinOrderValue = Number(rule.minOrderValue || 0) <= Number(orderTotal || 0);
      return matchesState && matchesWeight && matchesMinOrderValue;
    });

    candidates.sort((left, right) => {
      const leftStatePriority = String(left.state || "").trim().toLowerCase() === normalizedState ? 0 : 1;
      const rightStatePriority = String(right.state || "").trim().toLowerCase() === normalizedState ? 0 : 1;
      if (leftStatePriority !== rightStatePriority) {
        return leftStatePriority - rightStatePriority;
      }
      if ((left.sortOrder || 0) !== (right.sortOrder || 0)) {
        return (left.sortOrder || 0) - (right.sortOrder || 0);
      }
      return left.minWeight - right.minWeight;
    });

    return candidates;
  }

  findApplicableRule(rules, { state, zone, weight, orderTotal = 0 }) {
    const candidates = this.getRuleCandidates(rules, { state, weight, orderTotal });
    const exactZoneMatches = candidates.filter((rule) => rule.zone === zone);
    if (exactZoneMatches.length > 0) {
      return {
        rule: exactZoneMatches[0],
        matchType: "exact_zone",
      };
    }

    const exactStateCandidates = candidates.filter(
      (rule) => String(rule.state || "").trim().toLowerCase() === String(state || "").trim().toLowerCase()
    );

    if (exactStateCandidates.length === 1) {
      return {
        rule: exactStateCandidates[0],
        matchType: "zone_fallback_single_state_rule",
      };
    }

    if (candidates.length === 1) {
      return {
        rule: candidates[0],
        matchType: "zone_fallback_single_global_rule",
      };
    }

    return {
      rule: null,
      matchType: "no_match",
    };
  }

  calculateRuleCost(rule, weight, orderTotal = 0) {
    if (!rule) {
      return 0;
    }

    if (Number(rule.freeShippingThreshold || 0) > 0 && Number(orderTotal || 0) >= Number(rule.freeShippingThreshold || 0)) {
      return 0;
    }

    if (typeof rule.calculateCost === "function") {
      return rule.calculateCost(weight);
    }

    if (weight <= rule.baseWeight) {
      return rule.basePrice;
    }

    const extraWeight = weight - rule.baseWeight;
    return rule.basePrice + extraWeight * rule.pricePerKg;
  }

  buildCostBreakdown(rule, weight, orderTotal = 0) {
    if (!rule) {
      return null;
    }

    const roundedWeight = Math.round(Number(weight || 0) * 100) / 100;
    const baseWeight = Number(rule.baseWeight || 0);
    const basePrice = Number(rule.basePrice || 0);
    const pricePerKg = Number(rule.pricePerKg || 0);
    const extraWeight = Math.max(0, roundedWeight - baseWeight);
    const extraCost = Math.round(extraWeight * pricePerKg * 100) / 100;
    const weightBasedCost = Math.round((basePrice + extraCost) * 100) / 100;
    const freeShippingThreshold = Number(rule.freeShippingThreshold || 0);
    const freeShippingApplied =
      freeShippingThreshold > 0 && Number(orderTotal || 0) >= freeShippingThreshold;

    return {
      baseWeight,
      basePrice,
      extraWeight: Math.round(extraWeight * 100) / 100,
      pricePerKg,
      extraCost,
      weightBasedCost,
      freeShippingThreshold,
      freeShippingApplied,
      freeShippingDiscount: freeShippingApplied ? weightBasedCost : 0,
      finalCost: freeShippingApplied ? 0 : weightBasedCost,
    };
  }

  /**
   * Calculate shipping cost for an order
   * @param {Object} options
   *   - cartItems: Array of items with product data
   *   - shippingAddress: Address object {city, state, district}
   *   - state: State name (default: "Tamil Nadu")
   *   - fallbackCost: Cost to use if no rule found
   * @returns {Promise<Object>} {cost, weight, zone, ruleApplied}
   */
  async calculateShippingCost({
    cartItems,
    shippingAddress,
    state = "Tamil Nadu",
    fallbackCost = 0,
    orderTotal = 0,
  } = {}) {
    try {
      // Validate items have weight
      validateAllItemsHaveWeight(cartItems);

      // Calculate total weight
      const weight = calculateCartWeight(cartItems);

      // Determine zone
      const derivedState = String(shippingAddress?.state || state || "Tamil Nadu").trim() || "Tamil Nadu";
      const zoneResult = await resolveZone({
        ...shippingAddress,
        state: derivedState,
      });
      const zone = zoneResult.zone;

      // Find applicable shipping rule
      const rules = await this.getCachedRules(derivedState);
      const { rule, matchType } = this.findApplicableRule(rules, {
        state: derivedState,
        zone,
        weight,
        orderTotal,
      });

      // If rule not found, use fallback
      if (!rule) {
        return {
          cost: Math.round(fallbackCost * 100) / 100,
          weight: Math.round(weight * 100) / 100,
          zone,
          state: derivedState,
          ruleApplied: false,
          fallbackApplied: true,
          matchType,
          note: "No shipping rule found, using fallback cost",
        };
      }

      // Calculate cost using rule
      const costBreakdown = this.buildCostBreakdown(rule, weight, orderTotal);
      const cost = costBreakdown?.finalCost ?? this.calculateRuleCost(rule, weight, orderTotal);

      return {
        cost: Math.round(cost * 100) / 100,
        weight: Math.round(weight * 100) / 100,
        zone,
        state: derivedState,
        rule: {
          id: rule._id,
          state: rule.state,
          baseWeight: rule.baseWeight,
          basePrice: rule.basePrice,
          pricePerKg: rule.pricePerKg,
          minOrderValue: rule.minOrderValue || 0,
          freeShippingThreshold: rule.freeShippingThreshold || 0,
        },
        costBreakdown,
        ruleApplied: true,
        fallbackApplied: false,
        matchType,
        matchedOn: zoneResult.matchedOn,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Shipping calculation error: ${error.message}`,
        500,
        "SHIPPING_CALCULATION_ERROR"
      );
    }
  }

  /**
   * Calculate shipping for multiple zones (useful for split shipments)
   * @param {Object} options
   * @returns {Promise<Array>} Array of shipping calculations per zone
   */
  async calculateShippingByZone({
    cartItems,
    shippingAddress,
    state = "Tamil Nadu",
    orderTotal = 0,
  } = {}) {
    try {
      validateAllItemsHaveWeight(cartItems);

      const weight = calculateCartWeight(cartItems);
      const derivedState = String(shippingAddress?.state || state || "Tamil Nadu").trim() || "Tamil Nadu";
      const zone = await this.determineZone({ ...shippingAddress, state: derivedState });

      const rules = await this.getCachedRules(derivedState);

      const result = [];

      for (const rule of rules) {
        if (rule.zone === zone && weight >= rule.minWeight && weight <= rule.maxWeight) {
          const cost = this.calculateRuleCost(rule, weight, orderTotal);

          result.push({
            zone: rule.zone,
            weight,
            cost: Math.round(cost * 100) / 100,
            rule: {
              id: rule._id,
              baseWeight: rule.baseWeight,
              basePrice: rule.basePrice,
              pricePerKg: rule.pricePerKg,
            },
          });
        }
      }

      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Zone shipping calculation error: ${error.message}`,
        500
      );
    }
  }

  /**
   * Check if free shipping applies
   * @param {Object} options
   * @returns {Promise<Object>} {isFree, reason, cost}
   */
  async checkFreeShipping({
    cartItems,
    orderTotal,
    shippingAddress,
    state = "Tamil Nadu",
  } = {}) {
    try {
      validateAllItemsHaveWeight(cartItems);

      const weight = calculateCartWeight(cartItems);
      const derivedState = String(shippingAddress?.state || state || "Tamil Nadu").trim() || "Tamil Nadu";
      const zone = await this.determineZone({ ...shippingAddress, state: derivedState });

      const rules = await this.getCachedRules(derivedState);
      const { rule } = this.findApplicableRule(rules, {
        state: derivedState,
        zone,
        weight,
        orderTotal,
      });

      if (!rule) {
        return { isFree: false, reason: "No shipping rule found" };
      }

      // Check free shipping threshold
      if (rule.freeShippingThreshold > 0 && orderTotal >= rule.freeShippingThreshold) {
        return {
          isFree: true,
          reason: "Free shipping threshold reached",
          threshold: rule.freeShippingThreshold,
          cost: 0,
        };
      }

      // Not free
      const cost = this.calculateRuleCost(rule, weight, orderTotal);
      return {
        isFree: false,
        reason: "Order value below free shipping threshold",
        cost,
        thresholdNeeded: rule.freeShippingThreshold - orderTotal,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Free shipping check error: ${error.message}`,
        500
      );
    }
  }

  /**
   * Get all available rules for admin reference
   * @param {Object} options
   * @returns {Promise<Array>} All active shipping rules
   */
  async getAllRules({ state = "Tamil Nadu", activeOnly = true } = {}) {
    const query = { state };
    if (activeOnly) {
      query.isActive = true;
    }

    return ShippingConfig.find(query)
      .sort({ zone: 1, sortOrder: 1 })
      .lean();
  }

  /**
   * Validate shipping configuration
   * Ensures at least one rule exists for key scenarios
   * @returns {Promise<Object>} Validation result
   */
  async validateConfiguration() {
    const [rules, zoneConfig] = await Promise.all([
      ShippingConfig.find({ isActive: true }),
      getZoneConfig(),
    ]);

    if (rules.length === 0) {
      return {
        isValid: false,
        warning: "No active shipping rules configured",
        rulesCount: 0,
        zoneStatesCount: zoneConfig.states.length,
      };
    }

    const zones = new Set(rules.map((r) => r.zone));
    const states = new Set(rules.map((r) => r.state));

    return {
      isValid: true,
      rulesCount: rules.length,
      states: Array.from(states),
      zones: Array.from(zones),
      zoneStatesCount: zoneConfig.states.length,
    };
  }
}

module.exports = new ShippingPricingService();
