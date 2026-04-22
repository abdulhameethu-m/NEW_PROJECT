import { api } from "./api";
import { adminHttp } from "./adminHttp";

export async function getAttributes(params = {}) {
  const { data } = await api.get("/api/attributes", { params });
  return data;
}

export async function listAdminAttributes(params = {}) {
  const { data } = await adminHttp.get("/api/admin/attributes", { params });
  return data;
}

export async function createAdminAttribute(payload) {
  const { data } = await adminHttp.post("/api/admin/attributes", payload);
  return data;
}

export async function updateAdminAttribute(id, payload) {
  const { data } = await adminHttp.put(`/api/admin/attributes/${id}`, payload);
  return data;
}

export async function deleteAdminAttribute(id) {
  const { data } = await adminHttp.delete(`/api/admin/attributes/${id}`);
  return data;
}
