import { api } from "./api";

const base = "/api/admin/influencer-commerce";

export async function getAdminInfluencerCommerceDashboard(params = {}) {
  const { data } = await api.get(`${base}/dashboard`, { params });
  return data;
}

export async function listAdminInfluencerCommerceInfluencers(params = {}) {
  const { data } = await api.get(`${base}/influencers`, { params });
  return data;
}

export async function listAdminInfluencerCommerceVendors(params = {}) {
  const { data } = await api.get(`${base}/vendors`, { params });
  return data;
}

export async function listAdminInfluencerCommerceCampaigns(params = {}) {
  const { data } = await api.get(`${base}/campaigns`, { params });
  return data;
}

export async function updateAdminInfluencerCommerceCampaign(campaignId, payload = {}) {
  const { data } = await api.patch(`${base}/campaigns/${campaignId}`, payload);
  return data;
}

export async function getAdminInfluencerVendorMatching(params = {}) {
  const { data } = await api.get(`${base}/matching`, { params });
  return data;
}

export async function recommendAdminInfluencerVendorMatch(payload = {}) {
  const { data } = await api.post(`${base}/matching/recommend`, payload);
  return data;
}

export async function listAdminAffiliateLinks(params = {}) {
  const { data } = await api.get(`${base}/affiliate-links`, { params });
  return data;
}

export async function listAdminAffiliateTracking(params = {}) {
  const { data } = await api.get(`${base}/affiliate-tracking`, { params });
  return data;
}

export async function listAdminProductPromotions(params = {}) {
  const { data } = await api.get(`${base}/product-promotions`, { params });
  return data;
}

export async function listAdminInfluencerSettlements(params = {}) {
  const { data } = await api.get(`${base}/settlements`, { params });
  return data;
}

export async function listAdminInfluencerPayouts(params = {}) {
  const { data } = await api.get(`${base}/payouts`, { params });
  return data;
}

export async function getAdminInfluencerSettings() {
  const { data } = await api.get(`${base}/settings`);
  return data;
}

export async function updateAdminInfluencerSettings(payload = {}) {
  const { data } = await api.patch(`${base}/settings`, payload);
  return data;
}

export async function getInfluencerCommerceConfiguration() {
  const { data } = await api.get(`${base}/configuration`);
  return data;
}

export async function listInfluencerCommerceConfig(entityType, params = {}) {
  const { data } = await api.get(`${base}/configuration/${entityType}`, { params });
  return data;
}

export async function createInfluencerCommerceConfig(entityType, payload = {}) {
  const { data } = await api.post(`${base}/configuration/${entityType}`, payload);
  return data;
}

export async function updateInfluencerCommerceConfig(entityType, id, payload = {}) {
  const { data } = await api.patch(`${base}/configuration/${entityType}/${id}`, payload);
  return data;
}

export async function deleteInfluencerCommerceConfig(entityType, id) {
  const { data } = await api.delete(`${base}/configuration/${entityType}/${id}`);
  return data;
}

export async function recoverInfluencerCommerceConfig(entityType, id, version) {
  const { data } = await api.post(`${base}/configuration/${entityType}/${id}/recover`, { version });
  return data;
}

export async function listInfluencerCommerceConfigHistory(entityType, id) {
  const { data } = await api.get(`${base}/configuration/${entityType}/${id}/history`);
  return data;
}

export async function listInfluencerCommerceConfigAudit(params = {}) {
  const { data } = await api.get(`${base}/configuration/audit-logs`, { params });
  return data;
}
