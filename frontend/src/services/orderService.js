import { api } from "./api";

export async function createOrders(payload = {}) {
  const { data } = await api.post("/api/orders/create", payload);
  return data;
}

export async function listMyOrders(params = {}) {
  const { data } = await api.get("/api/orders/user", { params });
  return data;
}

export async function getOrderById(id) {
  const { data } = await api.get(`/api/orders/${id}`);
  return data;
}

export async function cancelOrder(id) {
  const { data } = await api.patch(`/api/orders/${id}/cancel`);
  return data;
}

export async function returnOrder(id) {
  const { data } = await api.patch(`/api/orders/${id}/return`);
  return data;
}

