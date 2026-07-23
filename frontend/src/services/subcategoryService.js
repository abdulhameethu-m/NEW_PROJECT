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
