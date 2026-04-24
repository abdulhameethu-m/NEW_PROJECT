import { api } from "./api";
import { adminHttp } from "./adminHttp";

export async function getFilters(params = {}) {
  const { data } = await api.get("/api/filters", { params });
  return data;
}

export async function listAdminFilters(params = {}) {
  const { data } = await adminHttp.get("/api/admin/filters", { params });
  return data;
}

export async function createAdminFilter(payload) {
  const { data } = await adminHttp.post("/api/admin/filters", payload);
  return data;
}

export async function updateAdminFilter(id, payload) {
  const { data } = await adminHttp.put(`/api/admin/filters/${id}`, payload);
  return data;
}

export async function deleteAdminFilter(id) {
  const { data } = await adminHttp.delete(`/api/admin/filters/${id}`);
  return data;
}
