const { ok } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../utils/asyncHandler");
const analyticsService = require("./service");

const adminAnalytics = asyncHandler(async (req, res) => {
  ok(res, await analyticsService.getAdminAnalytics(req.query), "Unified admin analytics loaded");
});

const vendorAnalytics = asyncHandler(async (req, res) => {
  ok(res, await analyticsService.getVendorAnalytics(req.user.sub, req.query), "Unified vendor analytics loaded");
});

const influencerAnalytics = asyncHandler(async (req, res) => {
  ok(res, await analyticsService.getInfluencerAnalytics(req.user.sub, req.query), "Unified influencer analytics loaded");
});

const campaignAnalytics = asyncHandler(async (req, res) => {
  ok(res, await analyticsService.getCampaignAnalytics(req.params.campaignId || req.params.id, req.query), "Unified campaign analytics loaded");
});

const rebuild = asyncHandler(async (req, res) => {
  ok(res, await analyticsService.rebuildAll(req.query), "Unified analytics rebuilt");
});

const auditPipeline = asyncHandler(async (req, res) => {
  ok(res, await analyticsService.auditPipeline(req.query), "Analytics pipeline audit loaded");
});

module.exports = {
  adminAnalytics,
  vendorAnalytics,
  influencerAnalytics,
  campaignAnalytics,
  rebuild,
  auditPipeline,
};
