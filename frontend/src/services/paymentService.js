import { api } from "./api";

export async function createRazorpayOrder(payload) {
  const { data } = await api.post("/api/payments/create-order", payload);
  return data;
}

export async function verifyRazorpayPayment(payload) {
  const { data } = await api.post("/api/payments/verify", payload);
  return data;
}

