const { AppError } = require("../utils/AppError");
const ShippingConfig = require("../models/ShippingConfig");
const { calculateCartWeight, validateAllItemsHaveWeight } = require("../utils/cartWeightCalculator");

/**
 * Shipping Pricing Service
 * 
 * Calculates shipping costs based on:
 * - Product weight (in kg)
 * - Location/Zone (Tamil Nadu zones)
 * - Admin-configured pricing rules
 */

class ShippingPricingService {
  /**
   * Determine zone based on shipping address
   * @param {Object} address - Shipping address object {city, state, district}
   * @returns {string} Zone: 'LOCAL', 'REGIONAL', or 'REMOTE'
   */
  determineZone(address) {
    // This is a basic implementation
    // Can be extended with postal code / pincode based zones
    
    if (!address) {
      return "REGIONAL"; // Default zone
    }

    const city = (address.city || "").toLowerCase().trim();
    const district = (address.district || "").toLowerCase().trim();

    // LOCAL zones (same city examples - customize as needed)
    const localCities = ["chennai", "coimbatore", "madurai"];
    if (localCities.includes(city)) {
      return "LOCAL";
    }

    // REMOTE zones (far districts - customize as needed)
    const remoteDistricts = ["nilgiris", "kanniyakumari"];
    if (remoteDistricts.includes(district)) {
      return "REMOTE";
    }

    // Default to REGIONAL
    return "REGIONAL";
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
  } = {}) {
    try {
      // Validate items have weight
      validateAllItemsHaveWeight(cartItems);

      // Calculate total weight
      const weight = calculateCartWeight(cartItems);

      // Determine zone
      const zone = this.determineZone(shippingAddress);

      // Find applicable shipping rule
      const rule = await ShippingConfig.findOne({
        state,
        zone,
        minWeight: { $lte: weight },
        maxWeight: { $gte: weight },
        isActive: true,
      }).sort({ sortOrder: 1 });

      // If rule not found, use fallback
      if (!rule) {
        return {
          cost: Math.round(fallbackCost * 100) / 100,
          weight: Math.round(weight * 100) / 100,
          zone,
          state,
          ruleApplied: false,
          fallbackApplied: true,
          note: "No shipping rule found, using fallback cost",
        };
      }

      // Calculate cost using rule
      const cost = rule.calculateCost(weight);

      return {
        cost: Math.round(cost * 100) / 100,
        weight: Math.round(weight * 100) / 100,
        zone,
        state,
        rule: {
          id: rule._id,
          baseWeight: rule.baseWeight,
          basePrice: rule.basePrice,
          pricePerKg: rule.pricePerKg,
        },
        ruleApplied: true,
        fallbackApplied: false,
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
  } = {}) {
    try {
      validateAllItemsHaveWeight(cartItems);

      const weight = calculateCartWeight(cartItems);
      const zone = this.determineZone(shippingAddress);

      // Find all applicable rules for the state
      const rules = await ShippingConfig.find({
        state,
        isActive: true,
      })
        .sort({ sortOrder: 1 })
        .lean();

      const result = [];

      for (const rule of rules) {
        if (weight >= rule.minWeight && weight <= rule.maxWeight) {
          const cost = rule.basePrice;
          if (weight > rule.baseWeight) {
            cost += (weight - rule.baseWeight) * rule.pricePerKg;
          }

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
      const zone = this.determineZone(shippingAddress);

      const rule = await ShippingConfig.findOne({
        state,
        zone,
        minWeight: { $lte: weight },
        maxWeight: { $gte: weight },
        isActive: true,
      }).sort({ sortOrder: 1 });

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
      const cost = rule.calculateCost(weight);
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
    const rules = await ShippingConfig.find({ isActive: true });

    if (rules.length === 0) {
      return {
        isValid: false,
        warning: "No active shipping rules configured",
        rulesCount: 0,
      };
    }

    const zones = new Set(rules.map((r) => r.zone));
    const states = new Set(rules.map((r) => r.state));

    return {
      isValid: true,
      rulesCount: rules.length,
      states: Array.from(states),
      zones: Array.from(zones),
    };
  }
}

module.exports = new ShippingPricingService();
