const CampaignFeeConfiguration = require("../models/CampaignFeeConfiguration");
const auditService = require("./audit.service");
const { ApiError } = require("../utils/ApiError");

const FUNDING_FEE_CODES = ["platform_fee", "gateway_fee", "gst"];
const REFUND_FEE_CODES = ["refund_processing_fee", "partial_refund_fee"];
const PAYMENT_MODELS = ["all", "fixed", "commission", "hybrid", "free_product"];

function money(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
}

function normalizePaymentModel(value = "all") {
  const next = String(value || "all").toLowerCase();
  return PAYMENT_MODELS.includes(next) ? next : "all";
}

function feeAmount(config, baseAmount) {
  if (!config) return 0;
  const percentage = money(Number(baseAmount || 0) * (Number(config.percentageValue || 0) / 100));
  const fixed = money(config.fixedValue);
  if (config.feeType === "percentage") return percentage;
  if (config.feeType === "fixed") return fixed;
  return money(percentage + fixed);
}

function describe(config) {
  if (!config) return "Not configured";
  const percent = Number(config.percentageValue || 0);
  const fixed = money(config.fixedValue);
  if (config.feeType === "percentage") return `${percent}%`;
  if (config.feeType === "fixed") return `Fixed INR ${fixed}`;
  return `${percent}% + INR ${fixed}`;
}

function snapshot(config, amount, baseAmount) {
  return {
    configurationId: config._id,
    feeName: config.feeName,
    feeCode: config.feeCode,
    paymentModel: normalizePaymentModel(config.paymentModel),
    feeType: config.feeType,
    percentageValue: config.percentageValue,
    fixedValue: config.fixedValue,
    calculationBase: config.calculationBase,
    effectiveFrom: config.effectiveFrom,
    effectiveTo: config.effectiveTo,
    baseAmount: money(baseAmount),
    amount: money(amount),
    description: describe(config),
    source: "Configured by Admin",
  };
}

function configurationsFor(configs, feeCode) {
  const rows = configs.get(feeCode);
  if (!rows) return [];
  return Array.isArray(rows) ? rows : [rows];
}

function sumFees(configs, baseFor) {
  const feeLines = configs.map((config) => {
    const baseAmount = money(baseFor(config));
    const amount = feeAmount(config, baseAmount);
    return snapshot(config, amount, baseAmount);
  });
  return {
    amount: money(feeLines.reduce((sum, line) => sum + Number(line.amount || 0), 0)),
    feeLines,
  };
}

class CampaignFeeService {
  async activeConfigurations(codes, at = new Date(), paymentModel = "all") {
    const model = normalizePaymentModel(paymentModel);
    const modelScope = model === "all"
      ? {}
      : {
          $or: [
            { paymentModel: model },
            { paymentModel: "all" },
            { paymentModel: "" },
            { paymentModel: { $exists: false } },
          ],
        };
    const rows = await CampaignFeeConfiguration.find({
      feeCode: { $in: codes },
      isActive: true,
      effectiveFrom: { $lte: at },
      $and: [
        { $or: [{ effectiveTo: null }, { effectiveTo: { $exists: false } }, { effectiveTo: { $gte: at } }] },
        modelScope,
      ],
    }).sort({ feeCode: 1, effectiveFrom: -1, createdAt: -1 }).lean();
    const byCode = new Map();
    rows.forEach((row) => {
      if (!byCode.has(row.feeCode)) byCode.set(row.feeCode, []);
      byCode.get(row.feeCode).push(row);
    });
    return byCode;
  }

  async calculateFundingSummary(budgetAmount, currency = "INR", at = new Date(), paymentModel = "fixed") {
    const budget = money(budgetAmount);
    if (budget <= 0) throw new ApiError(400, "Fixed payment campaign budget must be greater than zero");
    const configs = await this.activeConfigurations(FUNDING_FEE_CODES, at, paymentModel);
    const platformFees = sumFees(configurationsFor(configs, "platform_fee"), () => budget);
    const gatewayFees = sumFees(configurationsFor(configs, "gateway_fee"), () => budget);
    const platformFeeAmount = platformFees.amount;
    const gatewayFeeAmount = gatewayFees.amount;
    const serviceFees = money(platformFeeAmount + gatewayFeeAmount);
    const taxFees = sumFees(
      configurationsFor(configs, "gst"),
      (config) => config.calculationBase === "campaign_budget" ? budget : serviceFees
    );
    const taxAmount = taxFees.amount;
    const totalAmount = money(budget + serviceFees + taxAmount);
    const feeLines = [
      ...platformFees.feeLines,
      ...gatewayFees.feeLines,
      ...taxFees.feeLines,
    ];

    return {
      budgetAmount: budget,
      escrowAmount: budget,
      platformFeeAmount,
      gatewayFeeAmount,
      taxAmount,
      totalAmount,
      currency,
      feeLines,
      feeConfigurationSnapshot: feeLines,
      feeSource: "Configured by Admin",
      paymentModel: normalizePaymentModel(paymentModel),
    };
  }

  async calculateRefundFees(refundableAmount, { partial = false, at = new Date() } = {}) {
    const refundable = money(refundableAmount);
    const configs = await this.activeConfigurations(REFUND_FEE_CODES, at);
    const processingFees = sumFees(
      configurationsFor(configs, "refund_processing_fee"),
      () => refundable
    );
    const partialFees = partial
      ? sumFees(configurationsFor(configs, "partial_refund_fee"), () => refundable)
      : { amount: 0, feeLines: [] };
    const processingFeeAmount = processingFees.amount;
    const partialRefundFeeAmount = partialFees.amount;
    const feeLines = [...processingFees.feeLines, ...partialFees.feeLines];
    return {
      grossRefundAmount: refundable,
      processingFeeAmount,
      partialRefundFeeAmount,
      totalRefundAmount: money(Math.max(0, refundable - processingFeeAmount - partialRefundFeeAmount)),
      feeConfigurationSnapshot: feeLines,
    };
  }

  async listConfigurations() {
    return CampaignFeeConfiguration.find({}).sort({ feeCode: 1, effectiveFrom: -1 }).lean();
  }

  async createConfiguration(payload, actorId) {
    const config = await CampaignFeeConfiguration.create({
      ...payload,
      createdBy: actorId,
      updatedBy: actorId,
    });
    await auditService.log({
      actor: { _id: actorId, role: "admin" },
      action: "campaign.fee_configuration.created",
      entityType: "CampaignFeeConfiguration",
      entityId: config._id,
      metadata: config.toObject(),
    }).catch(() => {});
    return config;
  }

  async updateConfiguration(id, payload, actorId) {
    const config = await CampaignFeeConfiguration.findByIdAndUpdate(
      id,
      { $set: { ...payload, updatedBy: actorId } },
      { returnDocument: "after", runValidators: true }
    );
    if (!config) throw new ApiError(404, "Campaign fee configuration not found");
    await auditService.log({
      actor: { _id: actorId, role: "admin" },
      action: "campaign.fee_configuration.updated",
      entityType: "CampaignFeeConfiguration",
      entityId: config._id,
      metadata: config.toObject(),
    }).catch(() => {});
    return config;
  }

  async deleteConfiguration(id, actorId) {
    const config = await CampaignFeeConfiguration.findById(id);
    if (!config) throw new ApiError(404, "Campaign fee configuration not found");
    const snapshot = config.toObject();
    await config.deleteOne();
    await auditService.log({
      actor: { _id: actorId, role: "admin" },
      action: "campaign.fee_configuration.deleted",
      entityType: "CampaignFeeConfiguration",
      entityId: config._id,
      metadata: snapshot,
    }).catch(() => {});
    return { configurationId: config._id, deleted: true };
  }
}

module.exports = new CampaignFeeService();
module.exports.__private__ = { money, feeAmount, describe, configurationsFor, sumFees };
