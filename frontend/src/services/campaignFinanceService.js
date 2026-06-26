import { api } from "./api";

export async function getVendorCampaignFinance(params = {}) {
  const { data } = await api.get("/api/vendor/finance/campaign-finance", { params });
  return data;
}

export async function getInfluencerCampaignEarnings(params = {}) {
  const { data } = await api.get("/api/influencer/finance/campaign-earnings", { params });
  return data;
}

export async function getAdminCampaignFinance(params = {}) {
  const { data } = await api.get("/api/admin/influencer-commerce/campaign-finance", { params });
  return data;
}
