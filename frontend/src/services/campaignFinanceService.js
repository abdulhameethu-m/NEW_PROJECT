import { api } from "./api";

function cleanCampaignFinanceParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined)
  );
}

export async function getVendorCampaignFinance(params = {}) {
  const { data } = await api.get("/api/vendor/finance/campaign-finance", { params: cleanCampaignFinanceParams(params) });
  return data;
}

export async function getInfluencerCampaignEarnings(params = {}) {
  const { data } = await api.get("/api/influencer/finance/campaign-earnings", { params: cleanCampaignFinanceParams(params) });
  return data;
}

export async function getAdminCampaignFinance(params = {}) {
  const { data } = await api.get("/api/campaign-finance/admin", { params: cleanCampaignFinanceParams(params) });
  return data;
}
