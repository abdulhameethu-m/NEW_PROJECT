import { api } from "./api";

export async function getVendorDashboard() {
  const { data } = await api.get("/api/vendor/dashboard");
  return data;
}

export async function getVendorProducts(params) {
  const { data } = await api.get("/api/vendor/products", { params });
  return data;
}

export async function createVendorProduct(payload) {
  const { data } = await api.post("/api/vendor/products", payload);
  return data;
}

export async function updateVendorProduct(id, payload) {
  const { data } = await api.patch(`/api/vendor/products/${id}`, payload);
  return data;
}

export async function deleteVendorProduct(id) {
  const { data } = await api.delete(`/api/vendor/products/${id}`);
  return data;
}

export async function getVendorOrders(params) {
  const { data } = await api.get("/api/vendor/orders", { params });
  return data;
}

export async function updateVendorOrderStatus(id, payload) {
  const { data } = await api.patch(`/api/vendor/orders/${id}/status`, payload);
  return data;
}

export async function getVendorInventory(params) {
  const { data } = await api.get("/api/vendor/inventory", { params });
  return data;
}

export async function updateVendorInventory(id, payload) {
  const { data } = await api.patch(`/api/vendor/inventory/${id}`, payload);
  return data;
}

export async function getVendorAnalytics() {
  const { data } = await api.get("/api/vendor/analytics");
  return data;
}

export async function getVendorPayouts() {
  const { data } = await api.get("/api/vendor/payouts");
  return data;
}

export async function getVendorDelivery(params) {
  const { data } = await api.get("/api/vendor/delivery", { params });
  return data;
}

export async function updateVendorDelivery(id, payload) {
  const { data } = await api.patch(`/api/vendor/delivery/${id}`, payload);
  return data;
}

export async function getVendorSettings() {
  const { data } = await api.get("/api/vendor/settings");
  return data;
}

export async function updateVendorSettings(payload) {
  const { data } = await api.patch("/api/vendor/settings", payload);
  return data;
}

export async function getVendorNotifications(params) {
  const { data } = await api.get("/api/vendor/notifications", { params });
  return data;
}

export async function markVendorNotificationRead(id) {
  const { data } = await api.patch(`/api/vendor/notifications/${id}/read`);
  return data;
}

export async function getVendorReviews(params) {
  const { data } = await api.get("/api/vendor/reviews", { params });
  return data;
}

export async function respondToVendorReview(id, payload) {
  const { data } = await api.post(`/api/vendor/reviews/${id}/respond`, payload);
  return data;
}

export async function getVendorReturns(params) {
  const { data } = await api.get("/api/vendor/returns", { params });
  return data;
}

export async function updateVendorReturn(id, payload) {
  const { data } = await api.patch(`/api/vendor/returns/${id}`, payload);
  return data;
}

export async function getVendorOffers(params) {
  const { data } = await api.get("/api/vendor/offers", { params });
  return data;
}

export async function createVendorOffer(payload) {
  const { data } = await api.post("/api/vendor/offers", payload);
  return data;
}

export async function updateVendorOffer(id, payload) {
  const { data } = await api.patch(`/api/vendor/offers/${id}`, payload);
  return data;
}

export async function getVendorSupportTickets(params) {
  const { data } = await api.get("/api/vendor/support", { params });
  return data;
}

export async function createVendorSupportTicket(payload) {
  const { data } = await api.post("/api/vendor/support", payload);
  return data;
}

export async function replyVendorSupportTicket(id, payload) {
  const { data } = await api.post(`/api/vendor/support/${id}/reply`, payload);
  return data;
}
