const { ok } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../utils/asyncHandler");
const { uploadMany } = require("../../utils/upload");
const influencerService = require("./service");
const commissionService = require("../commission/service");
const reelService = require("../reel/service");
const influencerRateCardService = require("../../services/influencer-rate-card.service");

const checkEmail = asyncHandler(async (req, res) =>
  ok(res, await influencerService.checkEmail(req.query.email), "Email availability checked")
);
const checkUsername = asyncHandler(async (req, res) =>
  ok(res, await influencerService.checkUsername(req.query.username), "Username availability checked")
);
const saveDraft = asyncHandler(async (req, res) =>
  ok(
    res,
    await influencerService.saveStepOneDraft(req.body, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    }),
    "Influencer registration draft saved"
  )
);
const saveSocialDraft = asyncHandler(async (req, res) =>
  ok(res, await influencerService.saveSocialDraft(req.body), "Influencer social draft saved")
);
const fetchSocialMetrics = asyncHandler(async (req, res) =>
  ok(res, await influencerService.fetchSocialMetrics(req.query), "Influencer social metrics checked")
);
const verifySocial = asyncHandler(async (req, res) =>
  ok(res, await influencerService.verifySocial(req.body, req.files || []), "Influencer social verification saved", 201)
);
const socialStatus = asyncHandler(async (req, res) =>
  ok(res, await influencerService.getSocialStatus(req.query.applicationId), "Influencer social status loaded")
);
const checkProfileSlug = asyncHandler(async (req, res) =>
  ok(res, await influencerService.checkProfileSlug(req.query.slug, req.query.applicationId), "Influencer profile slug checked")
);
const getSettings = asyncHandler(async (req, res) => 
  ok(res, await influencerService.getSettings(req.user.sub), "Influencer settings loaded")
);
const updateSettings = asyncHandler(async (req, res) => 
  ok(res, await influencerService.updateSettings(req.user.sub, req.body, req.files || []), "Influencer settings updated")
);
const getProfileDraft = asyncHandler(async (req, res) =>
  ok(res, await influencerService.getProfileDraft(req.query.applicationId), "Influencer profile draft loaded")
);
const saveProfileDraft = asyncHandler(async (req, res) =>
  ok(res, await influencerService.saveProfileDraft(req.body, req.files || [], { submit: false }), "Influencer profile draft saved")
);
const saveProfileStep = asyncHandler(async (req, res) =>
  ok(res, await influencerService.saveProfileDraft(req.body, req.files || [], { submit: true }), "Influencer profile information saved", 201)
);
const countries = asyncHandler(async (_req, res) => ok(res, influencerService.getCountryMaster(), "Country master loaded"));
const commissionSettings = asyncHandler(async (_req, res) => ok(res, influencerService.getCommissionSettings(), "Commission settings loaded"));
const getBusiness = asyncHandler(async (req, res) => ok(res, await influencerService.getBusiness(req.query.applicationId), "Influencer business loaded"));
const saveBusinessDraft = asyncHandler(async (req, res) => ok(res, await influencerService.saveBusiness(req.body, req.files || [], { submit: false }), "Influencer business draft saved"));
const saveBusiness = asyncHandler(async (req, res) => ok(res, await influencerService.saveBusiness(req.body, req.files || [], { submit: true }), "Influencer business saved", 201));
const getPayment = asyncHandler(async (req, res) => ok(res, await influencerService.getPayment(req.query.applicationId), "Influencer payment loaded"));
const savePaymentDraft = asyncHandler(async (req, res) => ok(res, await influencerService.savePayment(req.body, { submit: false }), "Influencer payment draft saved"));
const savePayment = asyncHandler(async (req, res) => ok(res, await influencerService.savePayment(req.body, { submit: true }), "Influencer payment saved", 201));
const saveContentReview = asyncHandler(async (req, res) => ok(res, await influencerService.saveContentReview(req.body, req.files || [], { submit: false }), "Influencer content review draft saved"));
const submitApplication = asyncHandler(async (req, res) => ok(res, await influencerService.saveContentReview(req.body, req.files || [], { submit: true }), "Influencer application submitted", 201));
const applicationStatus = asyncHandler(async (req, res) => ok(res, await influencerService.getApplicationStatus(req.query.applicationId || req.params.applicationId), "Influencer application status loaded"));
const adminApplications = asyncHandler(async (req, res) => ok(res, await influencerService.listApplications(req.query), "Influencer applications loaded"));
const adminApplication = asyncHandler(async (req, res) => ok(res, await influencerService.getApplicationReview(req.params.applicationId), "Influencer application loaded"));
const reviewApplication = asyncHandler(async (req, res) => ok(res, await influencerService.reviewApplication(req.params.applicationId, req.body, req.user?.sub), "Influencer application reviewed"));
const approveApplication = asyncHandler(async (req, res) => ok(res, await influencerService.reviewApplication(req.body.applicationId, { decision: "approve", comments: req.body.comments || "Approved" }, req.user?.sub), "Influencer approved and activated", 201));
const storefront = asyncHandler(async (req, res) => ok(res, await influencerService.getStorefront({
  slug: req.query.slug || req.params.username,
  username: req.params.username,
  userId: req.user?.sub,
  tab: req.params.tab || req.query.tab || "storefront",
  filter: req.query.filter || req.query.sort || "",
  search: req.query.search || "",
  page: req.query.page,
  limit: req.query.limit,
}), "Influencer storefront loaded"));
const followPublic = asyncHandler(async (req, res) => ok(res, await influencerService.followPublicStorefront(req.params.username, req.user?.sub, req.body.source), "Influencer followed"));
const unfollowPublic = asyncHandler(async (req, res) => ok(res, await influencerService.unfollowPublicStorefront(req.params.username, req.user?.sub), "Influencer unfollowed"));
const subscribePublicNewsletter = asyncHandler(async (req, res) => ok(res, await influencerService.subscribePublicNewsletter(req.params.username, req.body), "Newsletter subscription saved", 201));
const trackPublicEvent = asyncHandler(async (req, res) => ok(res, await influencerService.trackPublicEvent(req.params.username, req.user?.sub, req.body), "Influencer event tracked", 201));
const generateAffiliateLink = asyncHandler(async (req, res) => ok(res, await influencerService.generateAffiliateLink(req.user.sub, req.body), "Affiliate link generated", 201));
const uploadCollectionMedia = asyncHandler(async (req, res) => {
  const uploaded = {};
  for (const field of ["coverImage", "bannerImage"]) {
    const file = req.files?.[field]?.[0];
    if (!file) continue;
    const [asset] = await uploadMany([file], { folder: "influencer-collections" });
    uploaded[field] = asset?.url || "";
  }
  return ok(res, uploaded, "Collection media uploaded", 201);
});
const listAffiliateProducts = asyncHandler(async (req, res) => ok(res, await influencerService.listAffiliateProducts(req.user.sub, req.query), "Affiliate products loaded"));
const generateAffiliateProductLinks = asyncHandler(async (req, res) => ok(res, await influencerService.generateAffiliateProductLinks(req.user.sub, req.body), "Affiliate product links generated", 201));
const listCollections = asyncHandler(async (req, res) => ok(res, await influencerService.listCollections(req.user.sub, req.query), "Influencer collections loaded"));
const getCollection = asyncHandler(async (req, res) => ok(res, await influencerService.getCollection(req.user.sub, req.params.id), "Influencer collection loaded"));
const createCollection = asyncHandler(async (req, res) => ok(res, await influencerService.saveCollection(req.user.sub, req.body), "Influencer collection created", 201));
const updateCollection = asyncHandler(async (req, res) => ok(res, await influencerService.saveCollection(req.user.sub, req.body, req.params.id), "Influencer collection updated"));
const updateCollectionStatus = asyncHandler(async (req, res) => ok(res, await influencerService.updateCollectionStatus(req.user.sub, req.params.id, req.body), "Influencer collection status updated"));
const deleteCollection = asyncHandler(async (req, res) => ok(res, await influencerService.deleteCollection(req.user.sub, req.params.id), "Influencer collection deleted"));
const assignCollectionProducts = asyncHandler(async (req, res) => ok(res, await influencerService.assignCollectionProducts(req.user.sub, req.params.id, req.body), "Influencer collection products updated"));
const collectionAnalytics = asyncHandler(async (req, res) => ok(res, await influencerService.getCollectionAnalytics(req.user.sub, req.query), "Influencer collection analytics loaded"));
const collectionProducts = asyncHandler(async (req, res) => ok(res, await influencerService.listCollectionProducts(req.user.sub, req.query), "Collection product catalog loaded"));
const registerStepOne = asyncHandler(async (req, res) =>
  ok(
    res,
    await influencerService.registerStepOne(req.body, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    }),
    "Influencer registration step 1 saved",
    201
  )
);
const register = asyncHandler(async (req, res) => ok(res, await influencerService.register(req.user.sub, req.body), "Influencer profile saved"));
const list = asyncHandler(async (req, res) => ok(res, await influencerService.list(req.query, req.user?.sub), "Influencers loaded"));
const moderate = asyncHandler(async (req, res) => ok(res, await influencerService.moderate(req.params.id, req.body), "Influencer status updated"));
const dashboard = asyncHandler(async (req, res) =>
  ok(res, await commissionService.getInfluencerDashboard(req.user.sub, req.query), "Influencer dashboard loaded")
);
const earningsDashboard = asyncHandler(async (req, res) =>
  ok(res, await commissionService.getInfluencerEarningsDashboard(req.user.sub, req.query), "Influencer earnings dashboard loaded")
);
const contentStatistics = asyncHandler(async (req, res) =>
  ok(
    res,
    await reelService.getContentStatistics(req.user, req.params.contentId, {
      ...req.query,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }),
    "Content statistics loaded"
  )
);
const requestWithdrawal = asyncHandler(async (req, res) =>
  ok(
    res,
    await commissionService.requestInfluencerWithdrawal(req.user.sub, req.body, req.user, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    }),
    "Withdrawal request submitted",
    201
  )
);
const commerceProfile = asyncHandler(async (req, res) =>
  ok(res, await influencerRateCardService.getMyCommerceProfile(req.user.sub), "Influencer commerce profile loaded")
);
const saveServices = asyncHandler(async (req, res) =>
  ok(res, await influencerRateCardService.saveMyServices(req.user.sub, req.body), "Influencer services saved")
);
const saveDeliveryAddress = asyncHandler(async (req, res) =>
  ok(res, await influencerRateCardService.saveMyDeliveryAddress(req.user.sub, req.body), "Influencer delivery address saved")
);

module.exports = {
  checkEmail,
  checkUsername,
  saveDraft,
  saveSocialDraft,
  fetchSocialMetrics,
  verifySocial,
  socialStatus,
  getSettings,
  updateSettings,
  checkProfileSlug,
  getProfileDraft,
  saveProfileDraft,
  saveProfileStep,
  countries,
  commissionSettings,
  getBusiness,
  saveBusinessDraft,
  saveBusiness,
  getPayment,
  savePaymentDraft,
  savePayment,
  saveContentReview,
  submitApplication,
  applicationStatus,
  adminApplications,
  adminApplication,
  reviewApplication,
  approveApplication,
  storefront,
  followPublic,
  unfollowPublic,
  subscribePublicNewsletter,
  trackPublicEvent,
  generateAffiliateLink,
  uploadCollectionMedia,
  listAffiliateProducts,
  generateAffiliateProductLinks,
  listCollections,
  getCollection,
  createCollection,
  updateCollection,
  updateCollectionStatus,
  deleteCollection,
  assignCollectionProducts,
  collectionAnalytics,
  collectionProducts,
  registerStepOne,
  register,
  list,
  moderate,
  dashboard,
  earningsDashboard,
  contentStatistics,
  requestWithdrawal,
  commerceProfile,
  saveServices,
  saveDeliveryAddress,
};
