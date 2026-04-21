import { api } from "./api";

export async function getCategories() {
  const { data } = await api.get("/api/categories");
  return data;
}

export async function getAdminCategories() {
  const { data } = await api.get("/api/admin/categories");
  return data;
}

export async function createCategory(payload) {
  const { data } = await api.post("/api/admin/categories", payload);
  return data;
}

export async function updateCategory(id, payload) {
  const { data } = await api.patch(`/api/admin/categories/${id}`, payload);
  return data;
}

export async function toggleCategory(id, isActive) {
  const { data } = await api.patch(`/api/admin/categories/${id}/toggle`, { isActive });
  return data;
}
