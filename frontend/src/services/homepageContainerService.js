import { api } from "./api";
import { adminHttp } from "./adminHttp";

export async function getHomepageContainers(params = {}) {
  const { data } = await api.get("/api/homepage-containers", { params });
  return data;
}

export async function getHomepageContainerProducts(slug, params = {}) {
  const { data } = await api.get(`/api/homepage-containers/${slug}/products`, { params });
  return data;
}

export async function listAdminHomepageContainers(params = {}) {
  const { data } = await adminHttp.get("/api/admin/homepage-containers", { params });
  return data;
}

export async function createAdminHomepageContainer(payload) {
  const { data } = await adminHttp.post("/api/admin/homepage-containers", payload);
  return data;
}

export async function updateAdminHomepageContainer(id, payload) {
  const { data } = await adminHttp.put(`/api/admin/homepage-containers/${id}`, payload);
  return data;
}

export async function deleteAdminHomepageContainer(id) {
  const { data } = await adminHttp.delete(`/api/admin/homepage-containers/${id}`);
  return data;
}

export async function reorderAdminHomepageContainers(items) {
  const { data } = await adminHttp.post("/api/admin/homepage-containers/reorder", { items });
  return data;
}

export async function previewAdminHomepageContainer(payload) {
  const { data } = await adminHttp.post("/api/admin/homepage-containers/preview", payload);
  return data;
}
