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
