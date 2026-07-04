const { AppError } = require("../utils/AppError");
const ShippingWeightSlab = require("../models/ShippingWeightSlab");
const shippingZoneConfigService = require("./shipping-zone-config.service");
const auditService = require("./audit.service");
const notificationService = require("./notification.service");

function clearShippingCaches() {
  const shippingPricingService = require("./shipping-pricing.service");
  shippingPricingService.clearCache();
  shippingZoneConfigService.clearZoneConfigCache();
}

function normalizeToken(value = "") {
  return ShippingWeightSlab.normalizeToken(value);
}

function normalizeStatus(value) {
  return String(value || "active").trim().toLowerCase() === "inactive" ? "inactive" : "active";
}

function normalizeSlabPayload(data = {}) {
  const payload = {
    state: String(data.state || "").trim(),
    district: String(data.district || "").trim(),
    zone: String(data.zone || "").trim().toUpperCase(),
    weightFrom: Number(data.weightFrom),
    weightTo: Number(data.weightTo),
    shippingCharge: Number(data.shippingCharge),
    priority: Number(data.priority ?? data.sortOrder ?? 0),
    status: data.isActive === false ? "inactive" : normalizeStatus(data.status),
    description: String(data.description ?? data.notes ?? "").trim(),
    settlementRecipient: data.settlementRecipient === "VENDOR" ? "VENDOR" : "ADMIN",
  };

  if (!payload.state) throw new AppError("State is required", 400, "VALIDATION_ERROR");
  if (!ShippingWeightSlab.ZONES.includes(payload.zone)) {
    throw new AppError("Zone must be LOCAL, REGIONAL, or REMOTE", 400, "VALIDATION_ERROR");
  }
  if (!Number.isFinite(payload.weightFrom) || payload.weightFrom < 0) {
    throw new AppError("Weight from must be a positive number", 400, "VALIDATION_ERROR");
  }
  if (!Number.isFinite(payload.weightTo) || payload.weightTo <= 0) {
    throw new AppError("Weight to must be greater than zero", 400, "VALIDATION_ERROR");
  }
  if (payload.weightFrom >= payload.weightTo) {
    throw new AppError("Weight from must be less than weight to", 400, "VALIDATION_ERROR");
  }
  if (!Number.isFinite(payload.shippingCharge) || payload.shippingCharge < 0) {
    throw new AppError("Shipping charge must be a positive number", 400, "VALIDATION_ERROR");
  }
  if (!Number.isFinite(payload.priority)) payload.priority = 0;

  return payload;
}

async function recordConfigChange({ action, entityId, metadata, actorId, title, message }) {
  await auditService
    .log({
      actor: { _id: actorId, role: "admin" },
      action,
      entityType: "ShippingWeightSlab",
      entityId,
      metadata,
    })
    .catch(() => {});

  await notificationService
    .notifyOperations(
      {
        module: "SHIPPING",
        subModule: "SHIPPING_CONFIGURATION",
        type: "CONFIGURATION",
        title,
        message,
        referenceId: entityId,
        meta: metadata,
      },
      "settings.update"
    )
    .catch(() => {});
}

class ShippingConfigAdminService {
  normalizeValidationError(error) {
    if (error instanceof AppError) throw error;
    if (error?.name === "ValidationError") {
      const messages =
        error?.errors && typeof error.errors === "object"
          ? Object.values(error.errors).map((err) => err.message).filter(Boolean)
          : [];
      throw new AppError(messages.length ? messages.join(", ") : error.message || "Validation failed", 400, "VALIDATION_ERROR");
    }
    throw error;
  }

  async assertNoOverlap(payload, excludeId = null) {
    const query = {
      stateKey: normalizeToken(payload.state),
      districtKey: normalizeToken(payload.district),
      zone: payload.zone,
      weightFrom: { $lt: payload.weightTo },
      weightTo: { $gt: payload.weightFrom },
    };
    if (excludeId) query._id = { $ne: excludeId };

    const overlap = await ShippingWeightSlab.findOne(query).lean();
    if (overlap) {
      throw new AppError(
        "A shipping weight slab already overlaps this state, district, zone, and weight range",
        409,
        "SHIPPING_SLAB_OVERLAP"
      );
    }
  }

  async createRule(data, actorId) {
    const payload = normalizeSlabPayload(data);
    await this.assertNoOverlap(payload);
    try {
      const rule = await ShippingWeightSlab.create({ ...payload, createdBy: actorId, updatedBy: actorId });
      clearShippingCaches();
      await recordConfigChange({
        action: "shipping.weight_slab.created",
        entityId: rule._id,
        metadata: rule.toObject(),
        actorId,
        title: "Shipping weight slab created",
        message: `${rule.state} ${rule.district || "all districts"} ${rule.zone} slab was created.`,
      });
      return rule;
    } catch (error) {
      this.normalizeValidationError(error);
    }
  }

  async getAllRules({ state, district, zone, activeOnly = false, page = 1, limit = 50 } = {}) {
    const query = {};
    if (state) query.stateKey = normalizeToken(state);
    if (district) query.districtKey = normalizeToken(district);
    if (zone) query.zone = String(zone).trim().toUpperCase();
    if (activeOnly) query.status = "active";

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const skip = (safePage - 1) * safeLimit;

    const [rules, total] = await Promise.all([
      ShippingWeightSlab.find(query)
        .sort({ state: 1, district: 1, zone: 1, priority: 1, weightFrom: 1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      ShippingWeightSlab.countDocuments(query),
    ]);

    return {
      data: rules,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getRule(ruleId) {
    const rule = await ShippingWeightSlab.findById(ruleId);
    if (!rule) throw new AppError("Shipping slab not found", 404, "NOT_FOUND");
    return rule;
  }

  async updateRule(ruleId, updates, actorId) {
    const current = await this.getRule(ruleId);
    const payload = normalizeSlabPayload({ ...current.toObject(), ...updates });
    await this.assertNoOverlap(payload, ruleId);

    try {
      const rule = await ShippingWeightSlab.findByIdAndUpdate(
        ruleId,
        { ...payload, updatedBy: actorId },
        { returnDocument: "after", runValidators: true }
      );
      clearShippingCaches();
      await recordConfigChange({
        action: "shipping.weight_slab.updated",
        entityId: rule._id,
        metadata: rule.toObject(),
        actorId,
        title: "Shipping weight slab updated",
        message: `${rule.state} ${rule.district || "all districts"} ${rule.zone} slab was updated.`,
      });
      return rule;
    } catch (error) {
      this.normalizeValidationError(error);
    }
  }

  async deleteRule(ruleId, actorId) {
    const rule = await ShippingWeightSlab.findByIdAndDelete(ruleId);
    if (!rule) throw new AppError("Shipping slab not found", 404, "NOT_FOUND");
    clearShippingCaches();
    await recordConfigChange({
      action: "shipping.weight_slab.deleted",
      entityId: rule._id,
      metadata: rule.toObject(),
      actorId,
      title: "Shipping weight slab deleted",
      message: `${rule.state} ${rule.district || "all districts"} ${rule.zone} slab was deleted.`,
    });
    return rule;
  }

  async bulkUpdateRules(ruleIds, updates, actorId) {
    if (!Array.isArray(ruleIds) || ruleIds.length === 0) {
      throw new AppError("Rule IDs array is required", 400, "VALIDATION_ERROR");
    }
    const allowed = {};
    if (updates.status !== undefined || updates.isActive !== undefined) {
      allowed.status = updates.isActive === false ? "inactive" : normalizeStatus(updates.status);
    }
    if (updates.priority !== undefined) allowed.priority = Number(updates.priority);
    if (actorId) allowed.updatedBy = actorId;

    const result = await ShippingWeightSlab.updateMany({ _id: { $in: ruleIds } }, allowed, { runValidators: true });
    clearShippingCaches();
    return { modified: result.modifiedCount, matched: result.matchedCount, acknowledged: result.acknowledged };
  }

  async getRulesByStateAndZone(state, zone) {
    return ShippingWeightSlab.find({
      stateKey: normalizeToken(state),
      zone: String(zone || "").trim().toUpperCase(),
      status: "active",
    }).sort({ priority: 1, weightFrom: 1 });
  }

  async calculatePreview({ weight, state = "Tamil Nadu", district = "", zone } = {}) {
    if (!weight || weight <= 0) throw new AppError("Weight must be greater than 0", 400, "VALIDATION_ERROR");

    const zoneResult = zone
      ? { zone: String(zone).trim().toUpperCase(), matchedOn: "manual" }
      : await shippingZoneConfigService.resolveZone({ state, district });

    const shippingPricingService = require("./shipping-pricing.service");
    const result = await shippingPricingService.calculateShipping({
      state,
      district,
      zone: zoneResult.zone,
      weight,
      matchedOn: zoneResult.matchedOn,
    });

    return {
      weight,
      state,
      district,
      resolvedZone: zoneResult.zone,
      matchedOn: zoneResult.matchedOn,
      calculationMethod: result.calculationMethod,
      matchedRule: result.matchedRule || null,
      configuredWeightRule: result.configuredWeightRule || null,
      shippingPrice: result.rule?.shippingCharge || 0,
      finalShippingAmount: result.cost,
      costBreakdown: result.costBreakdown || null,
      applicableRules: result.ruleApplied ? 1 : 0,
      previews: result.ruleApplied
        ? [
            {
              zone: result.zone,
              district: result.district || "",
              weight,
              cost: result.cost,
              calculationMethod: result.calculationMethod,
              matchedRule: result.matchedRule || null,
              breakdown: result.costBreakdown || null,
            },
          ]
        : [],
    };
  }

  async getStatistics() {
    const [totalRules, activeRules, byZone, byState, byDistrict, zoneConfig] = await Promise.all([
      ShippingWeightSlab.countDocuments(),
      ShippingWeightSlab.countDocuments({ status: "active" }),
      ShippingWeightSlab.aggregate([{ $group: { _id: "$zone", count: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } } } }]),
      ShippingWeightSlab.aggregate([{ $group: { _id: "$state", count: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } } } }]),
      ShippingWeightSlab.aggregate([{ $match: { district: { $ne: "" } } }, { $group: { _id: "$district", count: { $sum: 1 } } }]),
      shippingZoneConfigService.getZoneConfig(),
    ]);

    const matrixStates = shippingZoneConfigService.getConfiguredStatesFromMatrix(zoneConfig);
    const matrixDistricts = Array.from(
      new Set(
        matrixStates.flatMap((state) => shippingZoneConfigService.getConfiguredDistrictsForStateFromMatrix(zoneConfig, state))
      )
    );

    return {
      totalStates: matrixStates.length || new Set(byState.map((s) => s._id)).size,
      totalDistricts: matrixDistricts.length || new Set(byDistrict.map((d) => d._id)).size,
      totalZones: ShippingWeightSlab.ZONES.length,
      totalShippingRules: totalRules,
      totalWeightSlabs: totalRules,
      activeRules,
      inactiveRules: totalRules - activeRules,
      byZone,
      byState,
      coverage: {
        states: matrixStates.length || new Set(byState.map((s) => s._id)).size,
        districts: matrixDistricts.length || new Set(byDistrict.map((d) => d._id)).size,
        zones: new Set(byZone.map((z) => z._id)).size,
      },
    };
  }

  async cloneRule(sourceRuleId, overrides = {}, actorId) {
    const source = await this.getRule(sourceRuleId);
    return this.createRule({ ...source.toObject(), ...overrides, status: "inactive" }, actorId);
  }
}

module.exports = new ShippingConfigAdminService();
