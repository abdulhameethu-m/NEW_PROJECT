import { api } from "./api";
import { ensureCsrfToken } from "./csrf";

function apiBaseUrl() {
  return import.meta.env.VITE_API_URL || "http://localhost:5000";
}

function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  );
}

async function postTrackingJson(path, payload = {}) {
  if (typeof window === "undefined") {
    const { data } = await api.post(path, payload);
    return data;
  }

  const request = (async () => {
    const csrfToken = await ensureCsrfToken();
    const response = await fetch(`${apiBaseUrl()}${path}`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(csrfToken ? { "X-CSRF-TOKEN": csrfToken } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.message || "Tracking request failed");
      error.response = { status: response.status, data };
      throw error;
    }
    return data;
  })().catch(() => ({ success: false, data: {} }));

  return Promise.race([
    request,
    new Promise((resolve) => window.setTimeout(() => resolve({ success: false, data: {} }), 2500)),
  ]);
}

export async function getInfluencerDashboard(params = {}) {
  const { data } = await api.get("/api/influencer/dashboard", { params: compactParams(params) });
  return data;
}

export async function getInfluencerEarningsWithdrawals(params = {}) {
  const { data } = await api.get("/api/influencer/earnings-withdrawals", { params: compactParams(params) });
  return data;
}

export async function requestInfluencerWithdrawal(payload = {}) {
  const { data } = await api.post("/api/influencer/earnings-withdrawals/withdrawals", payload);
  return data;
}

export async function getInfluencerStorefront(params = {}) {
  const { data } = await api.get("/api/influencer/storefront", { params });
  return data;
}

export async function getPublicInfluencerStorefront(username, tab = "storefront", params = {}) {
  const cleanTab = tab && tab !== "storefront" ? `/${tab}` : "";
  const { data } = await api.get(`/api/influencer/public/${encodeURIComponent(username)}${cleanTab}`, { params });
  return data;
}

export async function followPublicInfluencer(username) {
  const { data } = await api.post(`/api/influencer/public/${encodeURIComponent(username)}/follow`, { source: "storefront" });
  return data;
}

export async function unfollowPublicInfluencer(username) {
  const { data } = await api.delete(`/api/influencer/public/${encodeURIComponent(username)}/follow`);
  return data;
}

export async function subscribePublicInfluencerNewsletter(username, email) {
  const { data } = await api.post(`/api/influencer/public/${encodeURIComponent(username)}/newsletter`, { email, source: "storefront" });
  return data;
}

export async function trackPublicInfluencerEvent(username, payload = {}) {
  const { data } = await api.post(`/api/influencer/public/${encodeURIComponent(username)}/events`, payload);
  return data;
}

export async function generateInfluencerAffiliateLink(payload) {
  const { data } = await api.post("/api/influencer/generate-affiliate-link", payload);
  return data;
}

export async function listAffiliateProducts(params = {}) {
  const { data } = await api.get("/api/influencer/affiliate-products", { params: compactParams(params) });
  return data;
}

export async function generateAffiliateProductLinks(payload) {
  const { data } = await api.post("/api/influencer/affiliate-products/links", payload);
  return data;
}

export async function listInfluencerCollections(params = {}) {
  const { data } = await api.get("/api/influencer/collections", { params: compactParams(params) });
  return data;
}

export async function getInfluencerCollection(id) {
  const { data } = await api.get(`/api/influencer/collections/${id}`);
  return data;
}

export async function saveInfluencerCollection(payload, id = "") {
  const { data } = id
    ? await api.put(`/api/influencer/collections/${id}`, payload)
    : await api.post("/api/influencer/collections", payload);
  return data;
}

export async function uploadInfluencerCollectionMedia(formData) {
  const { data } = await api.post("/api/influencer/collections/media", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function updateInfluencerCollectionStatus(id, payload) {
  const { data } = await api.patch(`/api/influencer/collections/${id}/status`, payload);
  return data;
}

export async function deleteInfluencerCollection(id) {
  const { data } = await api.delete(`/api/influencer/collections/${id}`);
  return data;
}

export async function assignInfluencerCollectionProducts(id, payload) {
  const { data } = await api.post(`/api/influencer/collections/${id}/products`, payload);
  return data;
}

export async function listInfluencerCollectionProducts(params = {}) {
  const { data } = await api.get("/api/influencer/collections/products", { params: compactParams(params) });
  return data;
}

export async function getInfluencerCollectionAnalytics(params = {}) {
  const { data } = await api.get("/api/influencer/collections/analytics", { params: compactParams(params) });
  return data;
}

export async function registerInfluencer(payload) {
  const { data } = await api.post("/api/influencer/register", payload);
  return data;
}

export async function getInfluencerCommerceProfile() {
  const { data } = await api.get("/api/influencer/commerce-profile");
  return data;
}

export async function saveInfluencerServices(payload = {}) {
  const { data } = await api.put("/api/influencer/services", payload);
  return data;
}

export async function saveInfluencerDeliveryAddress(payload = {}) {
  const { data } = await api.put("/api/influencer/delivery-address", payload);
  return data;
}

export async function listInfluencers(params = {}) {
  const { data } = await api.get("/api/influencer/list", { params });
  return data;
}

export async function listAdminInfluencers() {
  const { data } = await api.get("/api/influencer/admin/list");
  return data;
}

export async function moderateInfluencer(id, payload) {
  const { data } = await api.patch(`/api/influencer/admin/${id}/status`, payload);
  return data;
}

export async function listInfluencerApplications(params = {}) {
  const { data } = await api.get("/api/influencer/admin/applications", { params });
  return data;
}

export async function getInfluencerApplicationReview(applicationId) {
  const { data } = await api.get(`/api/influencer/admin/application/${applicationId}`);
  return data;
}

export async function reviewInfluencerApplication(applicationId, payload) {
  const { data } = await api.patch(`/api/influencer/admin/application/${applicationId}/review`, payload);
  return data;
}

export async function createCampaign(payload) {
  const { data } = await api.post("/api/campaign/create", payload);
  return data;
}

export async function acceptCampaign(campaignId) {
  const { data } = await api.post("/api/campaign/accept", { campaignId });
  return data;
}

export async function rejectCampaign(campaignId, note = "") {
  const { data } = await api.post("/api/campaign/reject", { campaignId, note });
  return data;
}

export async function getVendorCampaigns() {
  const { data } = await api.get("/api/campaign/vendor");
  return data;
}

export async function getVendorInfluencerCommerceDashboard(params = {}) {
  const { data } = await api.get("/api/vendor/influencer-commerce/dashboard", { params });
  return data;
}

const SUBSCRIPTION_PLANS_CACHE_TTL_MS = 60_000;
let subscriptionPlansCache = {
  data: null,
  expiresAt: 0,
  promise: null,
};

function clearVendorInfluencerSubscriptionPlansCache() {
  subscriptionPlansCache = {
    data: null,
    expiresAt: 0,
    promise: null,
  };
}

export async function getVendorInfluencerSubscriptionPlans({ force = false } = {}) {
  if (!force && subscriptionPlansCache.data && Date.now() < subscriptionPlansCache.expiresAt) {
    return subscriptionPlansCache.data;
  }

  if (!force && subscriptionPlansCache.promise) {
    return subscriptionPlansCache.promise;
  }

  subscriptionPlansCache.promise = api
    .get("/api/vendor/influencer-commerce/subscription/plans")
    .then(({ data }) => {
      subscriptionPlansCache.data = data;
      subscriptionPlansCache.expiresAt = Date.now() + SUBSCRIPTION_PLANS_CACHE_TTL_MS;
      return data;
    })
    .catch((err) => {
      if (err?.response?.status === 429 && subscriptionPlansCache.data) {
        subscriptionPlansCache.expiresAt = Date.now() + SUBSCRIPTION_PLANS_CACHE_TTL_MS;
        return subscriptionPlansCache.data;
      }
      throw err;
    })
    .finally(() => {
      subscriptionPlansCache.promise = null;
    });

  return subscriptionPlansCache.promise;
}

export async function getVendorInfluencerEscrowRefunds(params = {}) {
  const { data } = await api.get("/api/vendor/influencer-commerce/escrow-refunds", { params: compactParams(params) });
  return data;
}

export async function getVendorInfluencerEscrowRefundDeliverables(campaignId) {
  const { data } = await api.get(`/api/vendor/influencer-commerce/escrow-refunds/${campaignId}/deliverables`);
  return data;
}

export async function activateVendorInfluencerSubscription(payload = {}) {
  const { data } = await api.post("/api/vendor/influencer-commerce/subscription", payload);
  clearVendorInfluencerSubscriptionPlansCache();
  return data;
}

export async function createVendorInfluencerSubscriptionOrder(payload = {}) {
  const { data } = await api.post("/api/vendor/influencer-commerce/subscription/order", payload);
  return data;
}

export async function verifyVendorInfluencerSubscriptionPayment(payload = {}) {
  const { data } = await api.post("/api/vendor/influencer-commerce/subscription/verify", payload);
  clearVendorInfluencerSubscriptionPlansCache();
  return data;
}

export async function previewVendorInfluencerSubscriptionChange(params = {}) {
  const { data } = await api.get("/api/vendor/influencer-commerce/subscription/proration-preview", { params });
  return data;
}

export async function createVendorInfluencerSubscriptionChangeOrder(payload = {}) {
  const { data } = await api.post("/api/vendor/influencer-commerce/subscription/change-plan", payload);
  return data;
}

export async function confirmVendorInfluencerSubscriptionChange(payload = {}) {
  const { data } = await api.post("/api/vendor/influencer-commerce/subscription/change-plan/confirm", payload);
  clearVendorInfluencerSubscriptionPlansCache();
  return data;
}

export async function cancelVendorInfluencerSubscription() {
  const { data } = await api.post("/api/vendor/influencer-commerce/subscription/cancel");
  clearVendorInfluencerSubscriptionPlansCache();
  return data;
}

export async function discoverVendorInfluencers(params = {}) {
  const { data } = await api.get("/api/vendor/influencer-commerce/discover", { params });
  return data;
}

export async function getVendorInfluencerCommerceConfiguration() {
  const { data } = await api.get("/api/vendor/influencer-commerce/configuration");
  return data;
}

export async function getVendorInfluencerProfile(influencerId) {
  const { data } = await api.get(`/api/vendor/influencer-commerce/creators/${influencerId}`);
  return data;
}

export async function getVendorInfluencerRelationships(params = {}) {
  const { data } = await api.get("/api/vendor/influencer-commerce/relationships", { params });
  return data;
}

export async function saveVendorInfluencer(influencerId, saved = true) {
  const { data } = await api.patch(`/api/vendor/influencer-commerce/relationships/${influencerId}/save`, { saved });
  return data;
}

export async function visitVendorInfluencer(influencerId) {
  const { data } = await api.post(`/api/vendor/influencer-commerce/relationships/${influencerId}/visit`);
  return data;
}

export async function updateVendorInfluencerRelationship(influencerId, payload = {}) {
  const { data } = await api.patch(`/api/vendor/influencer-commerce/relationships/${influencerId}`, payload);
  return data;
}

export async function createVendorInfluencerCampaign(payload = {}) {
  const { data } = await api.post("/api/vendor/influencer-commerce/campaigns", payload);
  return data;
}

export async function previewVendorInfluencerCampaign(payload = {}) {
  const { data } = await api.post("/api/vendor/influencer-commerce/campaigns/preview", payload);
  return data;
}

export async function getVendorInfluencerCampaigns(params = {}) {
  const { data } = await api.get("/api/vendor/influencer-commerce/campaigns", { params });
  return data;
}

export async function reviewVendorCampaignApplication(campaignId, influencerId, payload = {}) {
  const { data } = await api.patch(`/api/vendor/influencer-commerce/campaigns/${campaignId}/applications/${influencerId}`, payload);
  return data;
}

export async function updateVendorInfluencerCampaignStatus(campaignId, payload = {}) {
  const { data } = await api.patch(`/api/vendor/influencer-commerce/campaigns/${campaignId}/status`, payload);
  return data;
}

export async function deleteVendorInfluencerCampaign(campaignId) {
  const { data } = await api.delete(`/api/vendor/influencer-commerce/campaigns/${campaignId}`);
  return data;
}

export async function getVendorCampaignShipping(campaignId) {
  const { data } = await api.get(`/api/vendor/influencer-commerce/campaigns/${campaignId}/shipping`);
  return data;
}

export async function saveVendorCampaignShipping(campaignId, payload = {}) {
  const { data } = await api.put(`/api/vendor/influencer-commerce/campaigns/${campaignId}/shipping`, payload);
  return data;
}

export async function dispatchVendorCampaignProduct(campaignId, payload = {}) {
  const { data } = await api.post(`/api/vendor/influencer-commerce/campaigns/${campaignId}/dispatch`, payload);
  return data;
}

export async function updateVendorCampaignReturn(campaignId, payload = {}) {
  const { data } = await api.post(`/api/vendor/influencer-commerce/campaigns/${campaignId}/return`, payload);
  return data;
}

export async function getVendorCampaignTracking(campaignId) {
  const { data } = await api.get(`/api/vendor/influencer-commerce/campaigns/${campaignId}/tracking`);
  return data;
}

export async function getVendorPromotionProducts(params = {}) {
  const { data } = await api.get("/api/vendor/influencer-commerce/products", { params });
  return data;
}

export async function getVendorContentApprovals(params = {}) {
  const { data } = await api.get("/api/vendor/influencer-commerce/content-approvals", { params });
  return data;
}

export async function getVendorMediaLibrary(params = {}) {
  const { data } = await api.get("/api/vendor/influencer-commerce/media", { params: compactParams(params) });
  return data;
}

export async function getVendorMediaDashboard(params = {}) {
  const { data } = await api.get("/api/vendor/influencer-commerce/media/dashboard", { params: compactParams(params) });
  return data;
}

export async function getVendorMediaDetails(mediaId) {
  const { data } = await api.get(`/api/vendor/influencer-commerce/media/${mediaId}`);
  return data;
}

export async function reviewVendorInfluencerContent(reelId, payload = {}) {
  const { data } = await api.patch(`/api/vendor/influencer-commerce/content-approvals/${reelId}`, payload);
  return data;
}

export async function getVendorInfluencerPerformance(params = {}) {
  const { data } = await api.get("/api/vendor/influencer-commerce/performance", { params });
  return data;
}

export async function getInfluencerCampaigns() {
  const { data } = await api.get("/api/campaign/influencer");
  return data;
}

export async function getAdminCampaigns() {
  const { data } = await api.get("/api/campaign/admin/list");
  return data;
}

export async function listCampaignMarketplace(params = {}) {
  const { data } = await api.get("/api/campaign/marketplace", { params });
  return data;
}

export async function applyCampaignMarketplace(campaignId, payload = {}) {
  const { data } = await api.post(`/api/campaign/marketplace/${campaignId}/apply`, payload);
  return data;
}

export async function saveCampaignMarketplace(campaignId, saved = true) {
  const { data } = await api.patch(`/api/campaign/marketplace/${campaignId}/save`, { saved });
  return data;
}

export async function submitCampaignDeliverable(campaignId, payload = {}) {
  const { data } = await api.post(`/api/campaign/marketplace/${campaignId}/deliverables`, payload);
  return data;
}

export async function getCampaignExecution(campaignId) {
  const { data } = await api.get(`/api/campaign/influencer/${campaignId}/execution`);
  return data;
}

export async function submitCampaignExecutionDeliverable(campaignId, deliverableId, payload = {}) {
  const { data } = await api.post(`/api/campaign/influencer/${campaignId}/deliverables/${deliverableId}/submissions`, payload);
  return data;
}

export async function updateCampaignExecutionSubmissionDetails(campaignId, deliverableId, payload = {}) {
  const { data } = await api.patch(`/api/campaign/influencer/${campaignId}/deliverables/${deliverableId}/submission-details`, payload);
  return data;
}

export async function getInfluencerCampaignProduct(campaignId) {
  const { data } = await api.get(`/api/campaign/influencer/${campaignId}/product`);
  return data;
}

export async function confirmInfluencerProductDelivery(campaignId, payload = {}) {
  const { data } = await api.post(`/api/campaign/influencer/${campaignId}/confirm-delivery`, payload);
  return data;
}

export async function requestInfluencerProductReturn(campaignId, payload = {}) {
  const { data } = await api.post(`/api/campaign/influencer/${campaignId}/request-return`, payload);
  return data;
}

export async function confirmInfluencerProductReturn(campaignId, payload = {}) {
  const { data } = await api.post(`/api/campaign/influencer/${campaignId}/confirm-return`, payload);
  return data;
}

export async function getVendorCampaignExecution(campaignId) {
  const { data } = await api.get(`/api/campaign/vendor/${campaignId}/execution`);
  return data;
}

export async function getVendorDeliverableReviewQueue(params = {}) {
  const { data } = await api.get("/api/campaign/vendor/execution/review-queue", { params: compactParams(params) });
  return data;
}

export async function reviewCampaignExecutionDeliverable(campaignId, deliverableId, payload = {}) {
  const { data } = await api.patch(`/api/campaign/vendor/${campaignId}/deliverables/${deliverableId}/review`, payload);
  return data;
}

export async function getCampaignMarketplaceAnalytics(params = {}) {
  const { data } = await api.get("/api/campaign/marketplace/analytics", { params });
  return data;
}

export async function uploadReel(payload) {
  const { data } = await api.post("/api/reel/upload", payload);
  return data;
}

export async function uploadReelMultipart(formData) {
  const { data } = await api.post("/api/reel/upload", formData);
  return data;
}

export async function uploadInfluencerContentMedia(formData) {
  const { data } = await api.post("/api/reel/media", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function publishReel(payload) {
  const { data } = await api.post("/api/reel/publish", payload);
  return data;
}

export async function getReelFeed(params = {}) {
  const { data } = await api.get("/api/reel/feed", { params });
  return data;
}

export async function getReel(id) {
  const { data } = await api.get(`/api/reel/${id}`);
  return data;
}

export async function getAdjacentReels(id) {
  const { data } = await api.get(`/api/reel/${id}/adjacent`);
  return data;
}

export async function getReelEngagement(id) {
  const { data } = await api.get(`/api/reel/${id}/engagement`);
  return data;
}

export async function toggleReelLike(id) {
  const { data } = await api.post(`/api/reel/${id}/like`);
  return data;
}

export async function toggleReelSave(id, payload = {}) {
  const { data } = await api.post(`/api/reel/${id}/save`, payload);
  return data;
}

export async function listReelComments(id, params = {}) {
  const { data } = await api.get(`/api/reel/${id}/comments`, { params });
  return data;
}

export async function createReelComment(id, payload = {}) {
  const { data } = await api.post(`/api/reel/${id}/comments`, payload);
  return data;
}

export async function createReelCommentReply(id, commentId, payload = {}) {
  const { data } = await api.post(`/api/reel/${id}/comments/${commentId}/replies`, payload);
  return data;
}

export async function toggleReelCommentLike(id, commentId) {
  const { data } = await api.post(`/api/reel/${id}/comments/${commentId}/like`);
  return data;
}

export async function reportReelComment(id, commentId, payload = {}) {
  const { data } = await api.post(`/api/reel/${id}/comments/${commentId}/report`, payload);
  return data;
}

export async function shareReel(id, payload = {}) {
  const { data } = await api.post(`/api/reel/${id}/share`, payload);
  return data;
}

export async function recordReelView(id, payload = {}) {
  const { data } = await api.post(`/api/reel/${id}/view`, payload);
  return data;
}

export async function recordReelStoreVisit(id, payload = {}) {
  const { data } = await api.post(`/api/reel/${id}/store-visit`, payload);
  return data;
}

export async function recordReelProductClick(id, payload = {}) {
  return await postTrackingJson(`/api/reel/${id}/product-click`, payload);
}

export async function followReelCreator(id, payload = {}) {
  const { data } = await api.post(`/api/reel/${id}/follow`, payload);
  return data;
}

export async function listInfluencerContent(params = {}) {
  const { data } = await api.get("/api/reel/content", { params });
  return data;
}

export async function updateInfluencerContent(id, payload) {
  const { data } = await api.patch(`/api/reel/content/${id}`, payload);
  return data;
}

export async function deleteInfluencerContent(id) {
  const { data } = await api.delete(`/api/reel/content/${id}`);
  return data;
}

export async function getInfluencerMediaLibrary(params = {}) {
  const { data } = await api.get("/api/reel/content/media-library", { params });
  return data;
}

export async function getInfluencerContentStatistics(contentId, params = {}) {
  const { data } = await api.get(`/api/influencer/content/${encodeURIComponent(contentId)}/statistics`, {
    params: compactParams(params),
  });
  return data;
}

export async function clickTracking(payload) {
  return await postTrackingJson("/api/tracking/click", payload);
}

export async function checkAndCompleteCampaign(campaignId) {
  const { data } = await api.post(`/api/campaign/influencer/${campaignId}/check-completion`);
  return data;
}

export async function trackAffiliateEvent(payload) {
  const { data } = await api.post("/api/tracking/event", payload);
  return data;
}

export async function getCommissionOverview() {
  const { data } = await api.get("/api/commission/admin/overview");
  return data;
}
