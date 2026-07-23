import { api } from "./api";
import { adminHttp } from "./adminHttp";

export async function createRazorpayOrder(payload) {
  const { data } = await api.post("/api/payments/create-order", payload, { timeout: 30000 });
  return data?.data || data;
}

export async function createCodAdvanceOrder(payload) {
  const { data } = await api.post("/api/payments/cod/advance/create-order", payload, { timeout: 30000 });
  return data?.data || data;
}

export async function verifyRazorpayPayment(payload) {
  const { data } = await api.post("/api/payments/verify", payload, { timeout: 90000 });
  return data?.data || data;
}

export async function verifyCancellationFeePayment(payload) {
  const { data } = await api.post("/api/payments/cancellation-fee/verify", payload, { timeout: 90000 });
  return data?.data || data;
}

export async function recordCheckoutFailure(payload) {
  const { data } = await api.post("/api/payments/checkout-failure", payload, { timeout: 15000 });
  return data?.data || data;
}

export async function recordCheckoutOpened(payload) {
  const { data } = await api.post("/api/payments/checkout-opened", payload, { timeout: 15000 });
  return data?.data || data;
}

export async function inspectCheckoutOrder(razorpayOrderId) {
  const { data } = await api.get(`/api/payments/checkout-inspect/${encodeURIComponent(razorpayOrderId)}`, {
    timeout: 15000,
  });
  return data?.data || data;
}

export async function listPayments(params = {}) {
  const { data } = await adminHttp.get("/api/payments", { params });
  return data?.data || data;
}

export async function getPaymentDetails(id) {
  const { data } = await adminHttp.get(`/api/payments/${id}`);
  return data?.data || data;
}

export async function createRefund(payload) {
  const { data } = await adminHttp.post("/api/payments/refund", payload);
  return data?.data || data;
}

export async function getCodSettings() {
  const { data } = await adminHttp.get("/api/admin/cod/settings");
  return data?.data || data;
}

export async function updateCodSettings(payload) {
  const { data } = await adminHttp.put("/api/admin/cod/settings", payload);
  return data?.data || data;
}

export async function getCodAnalytics(params = {}) {
  const { data } = await adminHttp.get("/api/admin/cod/analytics", { params });
  return data?.data || data;
}

export async function listCodAdvanceRules(params = {}) {
  const { data } = await adminHttp.get("/api/admin/finance/cod-advance/rules", { params });
  return data?.data || data;
}

export async function createCodAdvanceRule(payload) {
  const { data } = await adminHttp.post("/api/admin/finance/cod-advance/rules", payload);
  return data?.data || data;
}

export async function updateCodAdvanceRule(id, payload) {
  const { data } = await adminHttp.patch(`/api/admin/finance/cod-advance/rules/${id}`, payload);
  return data?.data || data;
}

export async function deleteCodAdvanceRule(id) {
  const { data } = await adminHttp.delete(`/api/admin/finance/cod-advance/rules/${id}`);
  return data?.data || data;
}

export async function getRazorpaySettings() {
  const { data } = await adminHttp.get("/api/payments/settings/razorpay");
  return data?.data || data;
}

export async function updateRazorpaySettings(payload) {
  const { data } = await adminHttp.put("/api/payments/settings/razorpay", payload);
  return data?.data || data;
}

