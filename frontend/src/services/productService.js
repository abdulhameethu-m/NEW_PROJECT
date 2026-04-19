import { api } from "./api";

/**
 * Get all public products (for storefront)
 */
export async function getPublicProducts(params = {}) {
  const response = await api.get("/api/products/public", { params });
  return response.data;
}

/**
 * Get single product by ID
 */
export async function getProductById(id) {
  const response = await api.get(`/api/products/${id}`);
  return response.data;
}

/**
 * Get products list (authenticated - role-based)
 */
export async function getProducts(params = {}) {
  const response = await api.get("/api/products", { params });
  return response.data;
}

/**
 * Create new product (seller or admin)
 */
export async function createProduct(productData) {
  const response = await api.post("/api/products", productData);
  return response.data;
}

/**
 * Update product
 */
export async function updateProduct(id, updateData) {
  const response = await api.patch(`/api/products/${id}`, updateData);
  return response.data;
}

/**
 * Delete product (soft delete)
 */
export async function deleteProduct(id) {
  const response = await api.delete(`/api/products/${id}`);
  return response.data;
}

/**
 * Get pending products for admin review
 */
export async function getPendingProducts(params = {}) {
  const response = await api.get("/api/products/admin/pending", { params });
  return response.data;
}

/**
 * Approve product (admin only)
 */
export async function approveProduct(id) {
  const response = await api.patch(`/api/products/admin/${id}/approve`);
  return response.data;
}

/**
 * Reject product (admin only)
 */
export async function rejectProduct(id, rejectionReason) {
  const response = await api.patch(`/api/products/admin/${id}/reject`, {
    rejectionReason,
  });
  return response.data;
}

/**
 * Get product statistics (admin only)
 */
export async function getProductStats() {
  const response = await api.get("/api/products/admin/stats");
  return response.data;
}
