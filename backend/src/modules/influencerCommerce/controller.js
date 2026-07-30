const { ok } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../utils/asyncHandler");
const service = require("./service");
const productShippingService = require("../../services/campaign-product-shipping.service");

const dashboard = asyncHandler(async (req, res) => ok(res, await service.dashboard(req.user.sub, req.query), "Influencer commerce dashboard loaded"));
const subscriptionPlans = asyncHandler(async (req, res) => ok(res, await service.subscriptionPlans(req.user.sub), "Subscription plans loaded"));
const subscribe = asyncHandler(async (req, res) => ok(res, await service.subscribe(req.user.sub, req.body), "Subscription activated"));
const createSubscriptionOrder = asyncHandler(async (req, res) => ok(res, await service.createSubscriptionOrder(req.user.sub, req.body), "Subscription order created"));
const verifySubscriptionPayment = asyncHandler(async (req, res) => ok(res, await service.verifySubscriptionPayment(req.user.sub, req.body), "Subscription payment verified"));
const prorationPreview = asyncHandler(async (req, res) => ok(res, await service.prorationPreview(req.user.sub, req.query), "Subscription proration preview loaded"));
const createPlanChangeOrder = asyncHandler(async (req, res) => ok(res, await service.createPlanChangeOrder(req.user.sub, req.body), "Subscription change order created"));
const confirmPlanChange = asyncHandler(async (req, res) => ok(res, await service.confirmPlanChange(req.user.sub, req.body), "Subscription change confirmed"));
const cancelSubscription = asyncHandler(async (req, res) => ok(res, await service.cancelSubscription(req.user.sub), "Subscription cancelled"));
const configuration = asyncHandler(async (_req, res) => ok(res, await service.configuration(), "Influencer commerce configuration loaded"));
const discover = asyncHandler(async (req, res) => ok(res, await service.discover(req.user.sub, req.query), "Influencers loaded"));
const creatorProfile = asyncHandler(async (req, res) => ok(res, await service.creatorProfile(req.user.sub, req.params.influencerId), "Influencer profile loaded"));
const relationships = asyncHandler(async (req, res) => ok(res, await service.relationships(req.user.sub, req.query), "Influencer relationships loaded"));
const saveInfluencer = asyncHandler(async (req, res) => ok(res, await service.saveInfluencer(req.user.sub, req.params.influencerId, req.body.saved !== false), "Influencer saved"));
const visitInfluencer = asyncHandler(async (req, res) => ok(res, await service.visitInfluencer(req.user.sub, req.params.influencerId), "Influencer visit recorded"));
const updateRelationship = asyncHandler(async (req, res) => ok(res, await service.updateRelationship(req.user.sub, req.params.influencerId, req.body), "Influencer relationship updated"));
const createCampaign = asyncHandler(async (req, res) => ok(res, await service.createCampaign(req.user.sub, req.body), "Campaign created"));
const campaignPreview = asyncHandler(async (req, res) => ok(res, await service.campaignPreview(req.user.sub, req.body), "Campaign pricing preview generated"));
const campaigns = asyncHandler(async (req, res) => ok(res, await service.campaigns(req.user.sub, req.query), "Campaigns loaded"));
const reviewApplication = asyncHandler(async (req, res) => ok(res, await service.reviewApplication(req.user.sub, req.params.campaignId, req.params.influencerId, req.body), "Campaign application reviewed"));
const updateCampaignStatus = asyncHandler(async (req, res) => ok(res, await service.updateCampaignStatus(req.user.sub, req.params.campaignId, req.body), "Campaign status updated"));
const deleteCampaign = asyncHandler(async (req, res) => ok(res, await service.deleteCampaign(req.user.sub, req.params.campaignId), "Campaign deleted"));
const products = asyncHandler(async (req, res) => ok(res, await service.products(req.user.sub, req.query), "Promotion products loaded"));
const contentApprovals = asyncHandler(async (req, res) => ok(res, await service.contentApprovals(req.user.sub, req.query), "Content approvals loaded"));
const reviewContent = asyncHandler(async (req, res) => ok(res, await service.reviewContent(req.user.sub, req.params.reelId, req.body), "Content reviewed"));
const performance = asyncHandler(async (req, res) => ok(res, await service.performance(req.user.sub, req.query), "Influencer performance loaded"));
const mediaLibrary = asyncHandler(async (req, res) => ok(res, await service.mediaLibrary(req.user.sub, req.query), "Vendor media library loaded"));
const mediaDashboard = asyncHandler(async (req, res) => ok(res, await service.mediaDashboard(req.user.sub, req.query), "Vendor media analytics loaded"));
const mediaDetails = asyncHandler(async (req, res) => ok(res, await service.mediaDetails(req.user.sub, req.params.mediaId), "Vendor media details loaded"));
const escrowRefunds = asyncHandler(async (req, res) => ok(res, await service.escrowRefunds(req.user.sub, req.query), "Escrow refund finance loaded"));
const escrowRefundDeliverables = asyncHandler(async (req, res) => ok(res, await service.escrowRefundDeliverables(req.user.sub, req.params.campaignId), "Escrow refund deliverables loaded"));
const getCampaignShipping = asyncHandler(async (req, res) => ok(res, await productShippingService.getVendorShipping(req.user.sub, req.params.campaignId), "Campaign product shipping loaded"));
const saveCampaignShipping = asyncHandler(async (req, res) => ok(res, await productShippingService.upsertForCampaign({ userId: req.user.sub, campaignId: req.params.campaignId, payload: req.body }), "Campaign product shipping saved"));
const dispatchCampaignProduct = asyncHandler(async (req, res) => ok(res, await productShippingService.dispatch(req.user.sub, req.params.campaignId, req.body), "Campaign product dispatched"));
const updateCampaignReturn = asyncHandler(async (req, res) => ok(res, await productShippingService.updateReturn(req.user.sub, req.params.campaignId, req.body), "Campaign return updated"));
const getCampaignTracking = asyncHandler(async (req, res) => ok(res, await productShippingService.getTracking(req.user.sub, req.params.campaignId), "Campaign tracking loaded"));
const deliveredProducts = asyncHandler(async (req, res) => ok(res, await productShippingService.listVendorLogistics(req.user.sub, req.query, "delivery"), "Delivered products loaded"));
const returnedProducts = asyncHandler(async (req, res) => ok(res, await productShippingService.listVendorLogistics(req.user.sub, req.query, "return"), "Returned products loaded"));
const updateDeliveredProductStatus = asyncHandler(async (req, res) => ok(res, await productShippingService.updateVendorDeliveryStatus(req.user.sub, req.params.shipmentId, req.body), "Delivery status updated"));
const updateReturnedProductStatus = asyncHandler(async (req, res) => ok(res, await productShippingService.updateVendorReturnStatus(req.user.sub, req.params.shipmentId, req.body), "Return status updated"));

module.exports = {
  dashboard,
  subscriptionPlans,
  subscribe,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  prorationPreview,
  createPlanChangeOrder,
  confirmPlanChange,
  cancelSubscription,
  configuration,
  discover,
  creatorProfile,
  relationships,
  saveInfluencer,
  visitInfluencer,
  updateRelationship,
  createCampaign,
  campaignPreview,
  campaigns,
  reviewApplication,
  updateCampaignStatus,
  deleteCampaign,
  products,
  contentApprovals,
  reviewContent,
  performance,
  mediaLibrary,
  mediaDashboard,
  mediaDetails,
  escrowRefunds,
  escrowRefundDeliverables,
  getCampaignShipping,
  saveCampaignShipping,
  dispatchCampaignProduct,
  updateCampaignReturn,
  getCampaignTracking,
  deliveredProducts,
  returnedProducts,
  updateDeliveredProductStatus,
  updateReturnedProductStatus,
};
