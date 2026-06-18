const { ok } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../utils/asyncHandler");
const commissionService = require("./service");

const overview = asyncHandler(async (req, res) => ok(res, await commissionService.getOverview(), "Commission overview loaded"));
const campaignDashboard = asyncHandler(async (req, res) =>
  ok(res, await commissionService.getCampaignCommissionDashboard(req.params.campaignId, req.user), "Commission campaign dashboard loaded")
);
const influencerEarnings = asyncHandler(async (req, res) =>
  ok(res, await commissionService.getInfluencerCommissionEarnings(req.user.sub, req.query), "Commission earnings loaded")
);

module.exports = {
  overview,
  campaignDashboard,
  influencerEarnings,
};
