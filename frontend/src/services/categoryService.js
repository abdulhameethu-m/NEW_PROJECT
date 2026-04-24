import { api } from "./api";
import { adminHttp } from "./adminHttp";

export async function getCategories() {
  const { data } = await api.get("/api/categories");
  return data;
}

export async function getAdminCategories() {
  const { data } = await adminHttp.get("/api/admin/categories");
  return data;
}

export async function createCategory(payload) {
  const { data } = await adminHttp.post("/api/admin/categories", payload);
  return data;
}

export async function updateCategory(id, payload) {
  const { data } = await adminHttp.patch(`/api/admin/categories/${id}`, payload);
  return data;
}

export async function toggleCategory(id, isActive) {
  const { data } = await adminHttp.patch(`/api/admin/categories/${id}/toggle`, { isActive });
  return data;
}
