import { api } from "./api";
import { adminHttp } from "./adminHttp";

export async function getSubcategoriesByCategory(categoryId) {
  const { data } = await api.get("/api/subcategories", { params: { categoryId } });
  return data;
}

export async function listAdminSubcategories() {
  const { data } = await adminHttp.get("/api/admin/subcategories");
  return data;
}

export async function createAdminSubcategory(payload) {
  const { data } = await adminHttp.post("/api/admin/subcategories", payload);
  return data;
}

export async function updateAdminSubcategory(id, payload) {
  const { data } = await adminHttp.put(`/api/admin/subcategories/${id}`, payload);
  return data;
}

export async function deleteAdminSubcategory(id) {
  const { data } = await adminHttp.delete(`/api/admin/subcategories/${id}`);
  return data;
}

export async function updateAdminSubcategoryStatus(id, status) {
  const { data } = await adminHttp.patch(`/api/admin/subcategories/${id}/status`, { status });
  return data;
}
