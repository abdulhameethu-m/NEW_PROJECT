const { ok } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../utils/asyncHandler");
const service = require("./service");
const configEngine = require("../../services/influencer-commerce-engine.service");

const dashboard = asyncHandler(async (req, res) => ok(res, await service.dashboard(req.query), "Influencer commerce dashboard loaded"));
const influencers = asyncHandler(async (req, res) => ok(res, await service.influencers(req.query), "Influencers loaded"));
const vendors = asyncHandler(async (req, res) => ok(res, await service.vendors(req.query), "Vendors loaded"));
const campaigns = asyncHandler(async (req, res) => ok(res, await service.campaigns(req.query), "Campaigns loaded"));
const updateCampaign = asyncHandler(async (req, res) => ok(res, await service.updateCampaign(req.user, req.params.campaignId, req.body), "Campaign updated"));
const matching = asyncHandler(async (req, res) => ok(res, await service.matching(req.query), "Influencer-vendor matches loaded"));
const recommendMatch = asyncHandler(async (req, res) => ok(res, await service.recommendMatch(req.user, req.body), req.body.recommended === false ? "Recommendation removed" : "Match recommended"));
const affiliateLinks = asyncHandler(async (req, res) => ok(res, await service.affiliateLinks(req.query), "Affiliate links loaded"));
const tracking = asyncHandler(async (req, res) => ok(res, await service.tracking(req.query), "Affiliate tracking loaded"));
const productPromotions = asyncHandler(async (req, res) => ok(res, await service.productPromotions(req.query), "Product promotions loaded"));
const settlements = asyncHandler(async (req, res) => ok(res, await service.settlements(req.query), "Settlements loaded"));
const payouts = asyncHandler(async (req, res) => ok(res, await service.payouts(req.query), "Payouts loaded"));
const settings = asyncHandler(async (req, res) => ok(res, await service.settings(), "Settings loaded"));
const updateSettings = asyncHandler(async (req, res) => ok(res, await service.updateSettings(req.user, req.body), "Settings updated"));
const auditLogs = asyncHandler(async (req, res) => ok(res, await service.auditLogs(req.query), "Audit logs loaded"));
const configOverview = asyncHandler(async (_req, res) => ok(res, await configEngine.overview(), "Influencer commerce configuration loaded"));
const listConfig = asyncHandler(async (req, res) => ok(res, await configEngine.listConfig(req.params.entityType, req.query), "Configuration records loaded"));
const createConfig = asyncHandler(async (req, res) => ok(res, await configEngine.createConfig(req.user, req.params.entityType, req.body, { ipAddress: req.ip, userAgent: req.get("user-agent") }), "Configuration created", 201));
const updateConfig = asyncHandler(async (req, res) => ok(res, await configEngine.updateConfig(req.user, req.params.entityType, req.params.id, req.body, { ipAddress: req.ip, userAgent: req.get("user-agent") }), "Configuration updated"));
const deleteConfig = asyncHandler(async (req, res) => ok(res, await configEngine.deleteConfig(req.user, req.params.entityType, req.params.id, req.body || {}, { ipAddress: req.ip, userAgent: req.get("user-agent") }), "Configuration archived"));
const recoverConfig = asyncHandler(async (req, res) => ok(res, await configEngine.recoverConfig(req.user, req.params.entityType, req.params.id, req.body.version, { ipAddress: req.ip, userAgent: req.get("user-agent") }), "Configuration recovered"));
const configVersions = asyncHandler(async (req, res) => ok(res, await configEngine.versions(req.params.entityType, req.params.id), "Configuration history loaded"));
const configAuditLogs = asyncHandler(async (req, res) => ok(res, await configEngine.auditLogs(req.query), "Configuration audit logs loaded"));

module.exports = {
  dashboard,
  influencers,
  vendors,
  campaigns,
  updateCampaign,
  matching,
  recommendMatch,
  affiliateLinks,
  tracking,
  productPromotions,
  settlements,
  payouts,
  settings,
  updateSettings,
  auditLogs,
  configOverview,
  listConfig,
  createConfig,
  updateConfig,
  deleteConfig,
  recoverConfig,
  configVersions,
  configAuditLogs,
};
