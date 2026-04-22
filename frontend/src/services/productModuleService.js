import { api } from "./api";
import { adminHttp } from "./adminHttp";

export async function getProductModules() {
  const { data } = await api.get("/api/product-modules");
  return data;
}

export async function listAdminProductModules() {
  const { data } = await adminHttp.get("/api/admin/product-modules");
  return data;
}

export async function createAdminProductModule(payload) {
  const { data } = await adminHttp.post("/api/admin/product-modules", payload);
  return data;
}

export async function updateAdminProductModule(id, payload) {
  const { data } = await adminHttp.put(`/api/admin/product-modules/${id}`, payload);
  return data;
}

export async function deleteAdminProductModule(id) {
  const { data } = await adminHttp.delete(`/api/admin/product-modules/${id}`);
  return data;
}
