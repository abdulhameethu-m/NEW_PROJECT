import { api } from "./api";

export async function searchCatalog(params = {}) {
  const { data } = await api.get("/api/catalog/search", { params });
  return data;
}

export async function listVendorCatalogRequests(params = {}) {
  const { data } = await api.get("/api/catalog/requests", { params });
  return data;
}

export async function createCatalogRequest(payload) {
  const { data } = await api.post("/api/catalog/request", payload);
  return data;
}

export async function listAdminCatalogRequests(params = {}) {
  const { data } = await api.get("/api/catalog/admin/requests", { params });
  return data;
}

export async function reviewCatalogRequest(requestId, payload = {}) {
  const { data } = await api.put(`/api/catalog/admin/request/${requestId}/${payload.action || "approve"}`, payload);
  return data;
}
