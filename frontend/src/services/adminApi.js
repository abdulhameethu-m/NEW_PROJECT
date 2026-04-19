import { api } from "./api";

export async function getDashboard() {
  const { data } = await api.get("/api/admin/dashboard");
  return data;
}

export async function getAnalytics() {
  const { data } = await api.get("/api/admin/analytics");
  return data;
}

export async function getDailyRevenue(days = 7) {
  const { data } = await api.get("/api/admin/daily-revenue", { params: { days } });
  return data;
}

export async function listUsers(params = {}) {
  const { data } = await api.get("/api/admin/users", { params });
  return data;
}

export async function toggleUserBlock(id) {
  const { data } = await api.patch(`/api/admin/users/${id}/block`);
  return data;
}

export async function deleteUser(id) {
  const { data } = await api.delete(`/api/admin/users/${id}`);
  return data;
}

export async function listSellers(params = {}) {
  const { data } = await api.get("/api/admin/sellers", { params });
  return data;
}

export async function getSellerDetails(id) {
  const { data } = await api.get(`/api/admin/sellers/${id}`);
  return data;
}

export async function approveSeller(id) {
  const { data } = await api.patch(`/api/admin/sellers/${id}/approve`);
  return data;
}

export async function rejectSeller(id, reason) {
  const { data } = await api.patch(`/api/admin/sellers/${id}/reject`, { reason });
  return data;
}

export async function removeSeller(id) {
  const { data } = await api.delete(`/api/admin/vendor/${id}`);
  return data;
}

export async function listProducts(params = {}) {
  const { data } = await api.get("/api/admin/products", { params });
  return data;
}

export async function getProductById(id) {
  const { data } = await api.get(`/api/admin/products/${id}`);
  return data;
}

export async function createProduct(productData) {
  const { data } = await api.post("/api/admin/products", productData);
  return data;
}

export async function updateProduct(id, productData) {
  const { data } = await api.patch(`/api/admin/products/${id}`, productData);
  return data;
}

export async function deleteProduct(id) {
  const { data } = await api.delete(`/api/admin/products/${id}`);
  return data;
}

export async function approveProduct(id) {
  const { data } = await api.patch(`/api/admin/products/${id}/approve`);
  return data;
}

export async function rejectProduct(id, rejectionReason) {
  const { data } = await api.patch(`/api/admin/products/${id}/reject`, { rejectionReason });
  return data;
}

export async function getProductStats() {
  const { data } = await api.get("/api/admin/products/stats");
  return data;
}

export async function listOrders(params = {}) {
  const { data } = await api.get("/api/admin/orders", { params });
  return data;
}

export async function updateOrderStatus(id, status) {
  const { data } = await api.patch(`/api/admin/orders/${id}/status`, { status });
  return data;
}

export async function getOrderById(id) {
  const { data } = await api.get(`/api/admin/orders/${id}`);
  return data;
}

export async function createOrder(payload) {
  const { data } = await api.post("/api/admin/orders", payload);
  return data;
}

export async function updateOrder(id, patch) {
  const { data } = await api.patch(`/api/admin/orders/${id}`, patch);
  return data;
}

export async function deleteOrder(id) {
  const { data } = await api.delete(`/api/admin/orders/${id}`);
  return data;
}
