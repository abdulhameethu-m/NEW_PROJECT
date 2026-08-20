import { api } from "./api";
import { adminHttp } from "./adminHttp";

export async function getReturnRules() {
  const { data } = await adminHttp.get("/api/return-rules");
  return data;
}

export async function createReturnRule(payload) {
  const { data } = await adminHttp.post("/api/return-rules", payload);
  return data;
}

export async function updateReturnRule(id, payload) {
  const { data } = await adminHttp.put(`/api/return-rules/${id}`, payload);
  return data;
}

export async function deleteReturnRule(id) {
  const { data } = await adminHttp.delete(`/api/return-rules/${id}`);
  return data;
}

export async function getPublicReturnRule(subCategoryId) {
  const { data } = await api.get(`/api/return-rules/public/${subCategoryId}`);
  return data;
}
