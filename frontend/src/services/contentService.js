import { api } from "./api";
import { adminHttp } from "./adminHttp";

/**
 * PUBLIC APIs - No authentication
 */

export async function getActiveContent() {
  const { data } = await api.get("/api/content/public/all");
  return data;
}

export async function getActiveContentByType(type) {
  const { data } = await api.get(`/api/content/public?type=${type}`);
  return data;
}

export async function trackView(contentId) {
  const { data } = await api.post(`/api/content/${contentId}/view`);
  return data;
}

export async function trackClick(contentId) {
  const { data } = await api.post(`/api/content/${contentId}/click`);
  return data;
}

/**
 * ADMIN APIs
 */

export async function createAdminContent(payload) {
  const { data } = await adminHttp.post("/api/content", payload);
  return data;
}

export async function getAllAdminContent(filters = {}) {
  const params = new URLSearchParams();
  if (filters.type) params.append("type", filters.type);
  if (filters.page) params.append("page", filters.page);
  if (filters.limit) params.append("limit", filters.limit);
  if (filters.search) params.append("search", filters.search);
  if (filters.isActive !== undefined) params.append("isActive", filters.isActive);

  const { data } = await adminHttp.get(`/api/content?${params.toString()}`);
  return data;
}

export async function getAdminContentById(id) {
  const { data } = await adminHttp.get(`/api/content/${id}`);
  return data;
}

export async function updateAdminContent(id, payload) {
  const { data } = await adminHttp.patch(`/api/content/${id}`, payload);
  return data;
}

export async function deleteAdminContent(id) {
  const { data } = await adminHttp.delete(`/api/content/${id}`);
  return data;
}

export async function reorderAdminContent(items) {
  const { data } = await adminHttp.patch("/api/content/batch/reorder", { items });
  return data;
}

export async function getAdminContentStats() {
  const { data } = await adminHttp.get("/api/content/dashboard/stats");
  return data;
}

/**
 * VENDOR APIs
 */

export async function getVendorContent() {
  const { data } = await api.get("/api/content/vendor/my-content");
  return data;
}

export async function createVendorContent(payload) {
  const { data } = await api.post("/api/content/vendor", payload);
  return data;
}

export async function updateVendorContent(id, payload) {
  const { data } = await api.patch(`/api/content/vendor/${id}`, payload);
  return data;
}

export async function deleteVendorContent(id) {
  const { data } = await api.delete(`/api/content/vendor/${id}`);
  return data;
}
