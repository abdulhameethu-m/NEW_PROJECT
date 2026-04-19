import { api } from "./api";

export async function prepareCheckout(payload = {}) {
  const { data } = await api.post("/api/checkout/prepare", payload);
  return data;
}

export async function createOrder(payload) {
  const { data } = await api.post("/api/checkout/create", payload);
  return data;
}

