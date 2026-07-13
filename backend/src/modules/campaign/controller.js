const { ok } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../utils/asyncHandler");
const campaignService = require("./service");
const executionService = require("./executionService");
const productShippingService = require("../../services/campaign-product-shipping.service");

const create = asyncHandler(async (req, res) => ok(res, await campaignService.create(req.user.sub, req.body), "Campaign created"));
const accept = asyncHandler(async (req, res) => ok(res, await campaignService.accept(req.user.sub, req.body.campaignId), "Campaign accepted"));
const reject = asyncHandler(async (req, res) =>
  ok(res, await campaignService.reject(req.user.sub, req.body.campaignId, req.body.note || ""), "Campaign declined")
);
const vendor = asyncHandler(async (req, res) => ok(res, await campaignService.listForVendor(req.user.sub), "Vendor campaigns loaded"));
const influencer = asyncHandler(async (req, res) => ok(res, await campaignService.listForInfluencer(req.user.sub), "Influencer campaigns loaded"));
const admin = asyncHandler(async (req, res) => ok(res, await campaignService.listAll(), "Campaigns loaded"));
const marketplace = asyncHandler(async (req, res) => ok(res, await campaignService.listMarketplace(req.user.sub, req.query), "Campaign marketplace loaded"));
const apply = asyncHandler(async (req, res) => ok(res, await campaignService.apply(req.user.sub, req.params.campaignId, req.body), "Campaign application submitted"));
const save = asyncHandler(async (req, res) => ok(res, await campaignService.saveMarketplaceCampaign(req.user.sub, req.params.campaignId, req.body.saved !== false), "Campaign saved"));
const deliverable = asyncHandler(async (req, res) => ok(res, await campaignService.submitDeliverable(req.user.sub, req.params.campaignId, req.body), "Campaign deliverable submitted"));
const analytics = asyncHandler(async (req, res) => ok(res, await campaignService.marketplaceAnalytics(req.user.sub, req.query), "Campaign analytics loaded"));
const influencerExecution = asyncHandler(async (req, res) => ok(res, await executionService.influencerExecution(req.user.sub, req.params.campaignId), "Campaign execution loaded"));
const submitExecution = asyncHandler(async (req, res) => ok(res, await executionService.submit(req.user.sub, req.params.campaignId, req.params.deliverableId, req.body), "Deliverable submitted"));
const updateExecutionDetails = asyncHandler(async (req, res) => ok(res, await executionService.updateSubmissionDetails(req.user.sub, req.params.campaignId, req.params.deliverableId, req.body), "Post details saved"));
const vendorExecution = asyncHandler(async (req, res) => ok(res, await executionService.vendorExecution(req.user.sub, req.params.campaignId), "Campaign execution loaded"));
const reviewExecution = asyncHandler(async (req, res) => ok(res, await executionService.review(req.user.sub, req.params.campaignId, req.params.deliverableId, req.body), "Deliverable reviewed"));
const reviewQueue = asyncHandler(async (req, res) => ok(res, await executionService.reviewQueue(req.user.sub, req.query), "Deliverable review queue loaded"));
const checkCompletion = asyncHandler(async (req, res) => ok(res, await executionService.checkAndCompleteCampaign(req.user.sub, req.params.campaignId), "Campaign status checked"));
const influencerProduct = asyncHandler(async (req, res) => ok(res, await productShippingService.getInfluencerProduct(req.user.sub, req.params.campaignId), "Campaign product shipping loaded"));
const confirmDelivery = asyncHandler(async (req, res) => ok(res, await productShippingService.confirmDelivery(req.user.sub, req.params.campaignId, req.body), "Product delivery confirmed"));
const requestReturn = asyncHandler(async (req, res) => ok(res, await productShippingService.requestReturn(req.user.sub, req.params.campaignId, req.body), "Product return requested"));
const confirmReturn = asyncHandler(async (req, res) => ok(res, await productShippingService.confirmReturn(req.user.sub, req.params.campaignId, req.body), "Product return confirmed"));

module.exports = {
  create,
  accept,
  reject,
  vendor,
  influencer,
  admin,
  marketplace,
  apply,
  save,
  deliverable,
  analytics,
  influencerExecution,
  submitExecution,
  updateExecutionDetails,
  vendorExecution,
  reviewExecution,
  reviewQueue,
  checkCompletion,
  influencerProduct,
  confirmDelivery,
  requestReturn,
  confirmReturn,
};
