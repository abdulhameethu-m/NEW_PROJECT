import { api } from "./api";
import { adminHttp } from "./adminHttp";

export async function createRazorpayOrder(payload) {
  const { data } = await api.post("/api/payments/create-order", payload);
  return data;
}

export async function verifyRazorpayPayment(payload) {
  const { data } = await api.post("/api/payments/verify", payload);
  return data;
}

export async function listPayments(params = {}) {
  const { data } = await adminHttp.get("/api/payments", { params });
  return data;
}

export async function getPaymentDetails(id) {
  const { data } = await adminHttp.get(`/api/payments/${id}`);
  return data;
}

export async function listRefunds(params = {}) {
  const { data } = await adminHttp.get("/api/payments/refunds", { params });
  return data;
}

export async function createRefund(payload) {
  const { data } = await adminHttp.post("/api/payments/refund", payload);
  return data;
}

export async function reviewRefund(id, payload) {
  const { data } = await adminHttp.patch(`/api/payments/refunds/${id}`, payload);
  return data;
}

