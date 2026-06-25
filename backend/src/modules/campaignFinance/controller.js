const { ok } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../utils/asyncHandler");
const campaignFinanceService = require("./service");

const vendor = asyncHandler(async (req, res) => {
  const data = await campaignFinanceService.getVendorDashboard(req.user.sub, req.query);
  campaignFinanceService.logView(req.user, "vendor_campaign_finance", data.scope.vendorId);
  return ok(res, data, "Campaign finance loaded");
});

const influencer = asyncHandler(async (req, res) => {
  const data = await campaignFinanceService.getInfluencerDashboard(req.user.sub, req.query);
  campaignFinanceService.logView(req.user, "influencer_campaign_earnings", data.scope.influencerId);
  return ok(res, data, "Campaign earnings loaded");
});

const admin = asyncHandler(async (req, res) => {
  const data = await campaignFinanceService.getAdminDashboard(req.query);
  campaignFinanceService.logView(req.user, "admin_campaign_finance");
  return ok(res, data, "Campaign finance loaded");
});

const campaign = asyncHandler(async (req, res) => {
  const data = await campaignFinanceService.getCampaignDashboard(req.params.campaignId, req.user);
  campaignFinanceService.logView(req.user, "campaign_finance", req.params.campaignId);
  return ok(res, data, "Campaign finance loaded");
});

const sync = asyncHandler(async (req, res) => {
  const data = req.params.campaignId
    ? await campaignFinanceService.syncCampaign(req.params.campaignId)
    : await campaignFinanceService.syncAll();
  return ok(res, data, "Campaign finance synchronized");
});

module.exports = { vendor, influencer, admin, campaign, sync };
