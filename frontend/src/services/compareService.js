import { api } from "./api";

function extractComparePayload(data) {
  return data?.data || data;
}

async function getCompareList() {
  const { data } = await api.get("/api/compare");
  return extractComparePayload(data);
}

async function addToCompare(productId) {
  const { data } = await api.post(`/api/compare/${productId}`);
  return extractComparePayload(data);
}

async function removeFromCompare(productId) {
  const { data } = await api.delete(`/api/compare/${productId}`);
  return extractComparePayload(data);
}

async function checkCompareStatus(productId) {
  const { data } = await api.get(`/api/compare/${productId}/status`);
  return extractComparePayload(data);
}

async function mergeGuestCompare(guestCompareItems = []) {
  const { data } = await api.post("/api/compare/merge", { guestCompareItems });
  return extractComparePayload(data);
}

export const compareService = {
  getCompareList,
  addToCompare,
  removeFromCompare,
  checkCompareStatus,
  mergeGuestCompare,
};
